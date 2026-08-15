"""
Core forecasting engine. This is the same logic already validated in the
standalone scripts (01-04), refactored into callable functions the API
routers use. Kept independent of the web layer on purpose -- per the
handoff doc's rule: "Keep the model engine independent from the dashboard
so the same engine can later serve Vijetha, Ratnadeep and other retailers."
"""
import os
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sqlalchemy.orm import Session
from sqlalchemy import text

from app import models

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "model_artifacts")
os.makedirs(MODEL_DIR, exist_ok=True)
MODEL_PATH = os.path.join(MODEL_DIR, "lgb_demand_model.txt")

FEATURE_COLS = [
    'dow', 'month', 'day', 'is_weekend', 'week_of_year',
    'lag_1', 'lag_7', 'lag_14', 'lag_28',
    'roll_mean_7', 'roll_std_7', 'roll_mean_14', 'roll_std_14',
    'roll_mean_28', 'roll_std_28',
    'selling_price', 'discount_pct', 'promotion_flag',
    'store_id_cat', 'sku_id_cat', 'category',
]


def _load_sales_inventory(db: Session):
    sales = pd.read_sql(text("SELECT * FROM sales"), db.bind, parse_dates=['date'])
    inventory = pd.read_sql(text("SELECT * FROM inventory"), db.bind, parse_dates=['date'])
    products = pd.read_sql(text("SELECT * FROM products"), db.bind)
    stores = pd.read_sql(text("SELECT * FROM stores"), db.bind)
    return sales, inventory, products, stores


def _build_features(sales: pd.DataFrame, products: pd.DataFrame) -> pd.DataFrame:
    df = sales.merge(products[['sku_id', 'category']], on='sku_id', how='left')
    df = df.sort_values(['store_id', 'sku_id', 'date']).reset_index(drop=True)

    df['dow'] = df.date.dt.dayofweek
    df['month'] = df.date.dt.month
    df['day'] = df.date.dt.day
    df['is_weekend'] = (df.dow >= 5).astype(int)
    df['week_of_year'] = df.date.dt.isocalendar().week.astype(int)

    grp = df.groupby(['store_id', 'sku_id'])['units_sold']
    for lag in [1, 7, 14, 28]:
        df[f'lag_{lag}'] = grp.shift(lag)

    shifted = grp.shift(1)
    for window in [7, 14, 28]:
        df[f'roll_mean_{window}'] = shifted.groupby([df['store_id'], df['sku_id']]).transform(
            lambda s: s.rolling(window).mean())
        df[f'roll_std_{window}'] = shifted.groupby([df['store_id'], df['sku_id']]).transform(
            lambda s: s.rolling(window).std())

    df['category'] = df['category'].astype('category')
    df['store_id_cat'] = df['store_id'].astype('category')
    df['sku_id_cat'] = df['sku_id'].astype('category')
    return df


def _wape(y_true, y_pred):
    return float(np.sum(np.abs(y_true - y_pred)) / np.sum(np.abs(y_true)))


def _bias(y_true, y_pred):
    return float(np.sum(y_pred - y_true) / np.sum(y_true))


def train_and_backtest(db: Session, test_days: int = 30) -> dict:
    """
    Runs the full pipeline: feature engineering -> baselines -> LightGBM
    training -> time-based backtest. Saves the model artifact and writes
    backtest_results rows to the DB. Returns a summary dict.
    """
    sales, inventory, products, stores = _load_sales_inventory(db)
    if sales.empty:
        raise ValueError("No sales data loaded. Ingest data before training.")

    df = _build_features(sales, products)
    model_df = df.dropna(subset=['lag_28', 'roll_mean_28']).copy()

    cutoff_date = df.date.max() - pd.Timedelta(days=test_days)
    train = model_df[model_df.date <= cutoff_date]
    test = model_df[model_df.date > cutoff_date].copy()

    X_train, y_train = train[FEATURE_COLS], train['units_sold']
    X_test, y_test = test[FEATURE_COLS], test['units_sold']

    # Baselines
    test['baseline_seasonal_naive'] = test['lag_7']
    test['baseline_moving_avg'] = test['roll_mean_28']

    # Model
    train_set = lgb.Dataset(X_train, label=y_train,
                             categorical_feature=['store_id_cat', 'sku_id_cat', 'category'])
    params = {'objective': 'regression', 'metric': 'mae', 'learning_rate': 0.05,
              'num_leaves': 63, 'min_data_in_leaf': 50, 'verbose': -1, 'seed': 42}
    booster = lgb.train(params, train_set, num_boost_round=300)
    test['pred_lgb'] = np.clip(booster.predict(X_test), 0, None)
    booster.save_model(MODEL_PATH)

    results = []
    for name, col in [
        ("Baseline: Seasonal Naive", 'baseline_seasonal_naive'),
        ("Baseline: 28-day Moving Avg", 'baseline_moving_avg'),
        ("Model: LightGBM", 'pred_lgb'),
    ]:
        mae = float(mean_absolute_error(test['units_sold'], test[col]))
        rmse = float(np.sqrt(mean_squared_error(test['units_sold'], test[col])))
        w = _wape(test['units_sold'].values, test[col].values)
        b = _bias(test['units_sold'].values, test[col].values)
        results.append({'model': name, 'mae': mae, 'rmse': rmse, 'wape': w, 'bias': b})

    db.query(models.BacktestResult).delete()
    for r in results:
        db.add(models.BacktestResult(**r))
    db.commit()

    return {'test_period': {'start': str(test.date.min().date()), 'end': str(test.date.max().date())},
            'rows_trained': len(train), 'rows_tested': len(test), 'results': results}


def generate_forecasts_and_recommendations(db: Session, horizon: int = 90,
                                            lead_time_days: int = 5,
                                            safety_buffer_days: int = 14,
                                            overstock_threshold_days: int = 45) -> dict:
    """
    Loads the trained model, generates a vectorized recursive forecast for
    every store-SKU series, then derives stockout risk, overstock flags,
    replenishment quantities and transfer suggestions. Persists forecasts,
    risk_scores and recommendations tables.
    """
    if not os.path.exists(MODEL_PATH):
        raise ValueError("No trained model found. Call /pipeline/train first.")

    booster = lgb.Booster(model_file=MODEL_PATH)
    sales, inventory, products, stores = _load_sales_inventory(db)
    df = sales.merge(products[['sku_id', 'category']], on='sku_id', how='left')
    df = df.sort_values(['store_id', 'sku_id', 'date']).reset_index(drop=True)
    last_date = df.date.max()

    latest_inv = inventory[inventory.date == last_date][['store_id', 'sku_id', 'closing_stock']].rename(
        columns={'closing_stock': 'current_stock'})

    price_lookup = df.groupby(['store_id', 'sku_id']).agg(
        selling_price=('selling_price', 'last'),
        discount_pct=('discount_pct', 'mean'),
        promotion_flag=('promotion_flag', 'mean')).reset_index()
    cat_lookup = products[['sku_id', 'category']].drop_duplicates()

    series_keys = df[['store_id', 'sku_id']].drop_duplicates().reset_index(drop=True)
    series_keys = series_keys.merge(price_lookup, on=['store_id', 'sku_id'], how='left')
    series_keys = series_keys.merge(cat_lookup, on='sku_id', how='left')
    n_series = len(series_keys)

    last28_dates = pd.date_range(last_date - pd.Timedelta(days=27), last_date)
    pivot = df[df.date.isin(last28_dates)].pivot_table(
        index=['store_id', 'sku_id'], columns='date', values='units_sold', fill_value=0)
    pivot = pivot.reindex(columns=last28_dates, fill_value=0)
    pivot = series_keys.set_index(['store_id', 'sku_id']).join(pivot, how='left').fillna(0)
    history_matrix = pivot[last28_dates].values[:, ::-1]

    future_dates = pd.date_range(last_date + pd.Timedelta(days=1), periods=horizon)
    all_forecasts = np.zeros((n_series, horizon))

    for h, fdate in enumerate(future_dates):
        lag_1, lag_7, lag_14, lag_28 = (history_matrix[:, 0], history_matrix[:, 6],
                                         history_matrix[:, 13], history_matrix[:, 27])
        roll_mean_7 = history_matrix[:, 0:7].mean(axis=1)
        roll_std_7 = history_matrix[:, 0:7].std(axis=1)
        roll_mean_14 = history_matrix[:, 0:14].mean(axis=1)
        roll_std_14 = history_matrix[:, 0:14].std(axis=1)
        roll_mean_28 = history_matrix[:, 0:28].mean(axis=1)
        roll_std_28 = history_matrix[:, 0:28].std(axis=1)

        feat = pd.DataFrame({
            'dow': fdate.dayofweek, 'month': fdate.month, 'day': fdate.day,
            'is_weekend': int(fdate.dayofweek >= 5), 'week_of_year': fdate.isocalendar()[1],
            'lag_1': lag_1, 'lag_7': lag_7, 'lag_14': lag_14, 'lag_28': lag_28,
            'roll_mean_7': roll_mean_7, 'roll_std_7': roll_std_7,
            'roll_mean_14': roll_mean_14, 'roll_std_14': roll_std_14,
            'roll_mean_28': roll_mean_28, 'roll_std_28': roll_std_28,
            'selling_price': series_keys['selling_price'].values,
            'discount_pct': series_keys['discount_pct'].values,
            'promotion_flag': series_keys['promotion_flag'].values,
            'store_id_cat': series_keys['store_id'].values,
            'sku_id_cat': series_keys['sku_id'].values,
            'category': series_keys['category'].values,
        })
        for c in ['store_id_cat', 'sku_id_cat', 'category']:
            feat[c] = feat[c].astype('category')

        preds = np.clip(booster.predict(feat), 0, None)
        all_forecasts[:, h] = preds
        history_matrix = np.column_stack([preds, history_matrix[:, :-1]])

    # ---- Persist forecasts ----
    db.query(models.Forecast).delete()
    forecast_rows = []
    for h, fdate in enumerate(future_dates):
        for i, row in series_keys.iterrows():
            forecast_rows.append(models.Forecast(
                date=fdate.date(), store_id=row['store_id'], sku_id=row['sku_id'],
                forecast_units=round(float(all_forecasts[i, h]), 1),
                model='LightGBM', model_version='v1'))
    db.bulk_save_objects(forecast_rows)

    # ---- Risk + recommendations ----
    summary = series_keys[['store_id', 'sku_id']].copy()
    summary['avg_daily_forecast'] = all_forecasts.mean(axis=1).round(2)
    summary = summary.merge(latest_inv, on=['store_id', 'sku_id'], how='left')
    summary['current_stock'] = summary['current_stock'].fillna(0)

    summary['days_of_stock_remaining'] = np.where(
        summary.avg_daily_forecast > 0, summary.current_stock / summary.avg_daily_forecast, 999)
    summary['stockout_risk_level'] = pd.cut(
        summary.days_of_stock_remaining,
        bins=[-1, lead_time_days, lead_time_days * 2, 1e9], labels=['HIGH', 'MEDIUM', 'LOW'])
    summary['overstock_flag'] = summary.days_of_stock_remaining > overstock_threshold_days
    summary['excess_units'] = np.where(
        summary.overstock_flag,
        (summary.current_stock - summary.avg_daily_forecast * overstock_threshold_days).clip(lower=0), 0)

    target_cover = lead_time_days + safety_buffer_days
    summary['replenishment_qty'] = np.where(
        summary.stockout_risk_level.isin(['HIGH', 'MEDIUM']),
        (summary.avg_daily_forecast * target_cover - summary.current_stock).clip(lower=0).round(0), 0)

    db.query(models.RiskScore).delete()
    db.bulk_save_objects([
        models.RiskScore(
            store_id=r.store_id, sku_id=r.sku_id, current_stock=float(r.current_stock),
            avg_daily_forecast=float(r.avg_daily_forecast),
            days_of_stock_remaining=float(r.days_of_stock_remaining),
            stockout_risk_level=str(r.stockout_risk_level), overstock_flag=bool(r.overstock_flag),
            excess_units=float(r.excess_units))
        for r in summary.itertuples()
    ])

    db.query(models.Recommendation).delete()
    replenishment_recs = [
        models.Recommendation(rec_type='replenishment', store_id=r.store_id, sku_id=r.sku_id,
                               quantity=float(r.replenishment_qty))
        for r in summary[summary.replenishment_qty > 0].itertuples()
    ]
    db.bulk_save_objects(replenishment_recs)

    # transfers: match HIGH-risk shortages to overstocked surplus of the same SKU
    transfer_recs = []
    for sku_id, group in summary.groupby('sku_id'):
        shortages = group[group.stockout_risk_level == 'HIGH'].sort_values('days_of_stock_remaining')
        surplus = group[group.overstock_flag].sort_values('excess_units', ascending=False).copy()
        if shortages.empty or surplus.empty:
            continue
        for _, short_row in shortages.iterrows():
            for idx, sur_row in surplus.iterrows():
                if sur_row.store_id == short_row.store_id or sur_row.excess_units <= 0:
                    continue
                qty = min(sur_row.excess_units, short_row.replenishment_qty)
                if qty >= 1:
                    transfer_recs.append(models.Recommendation(
                        rec_type='transfer', store_id=short_row.store_id, sku_id=sku_id,
                        from_store_id=sur_row.store_id, quantity=round(float(qty))))
                    surplus.loc[idx, 'excess_units'] -= qty
                    break
    db.bulk_save_objects(transfer_recs)
    db.commit()

    return {
        'series_forecasted': n_series, 'horizon_days': horizon,
        'high_risk': int((summary.stockout_risk_level == 'HIGH').sum()),
        'medium_risk': int((summary.stockout_risk_level == 'MEDIUM').sum()),
        'overstocked': int(summary.overstock_flag.sum()),
        'replenishment_recs': len(replenishment_recs),
        'transfer_recs': len(transfer_recs),
    }
