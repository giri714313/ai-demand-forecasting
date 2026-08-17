from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(tags=["query"])


@router.get("/stores", response_model=List[schemas.StoreOut])
def list_stores(db: Session = Depends(get_db)):
    return db.query(models.Store).order_by(models.Store.store_name).all()


@router.get("/products", response_model=List[schemas.ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(models.Product).order_by(models.Product.product_name).all()


def _name_lookups(db: Session):
    stores = {s.store_id: s.store_name for s in db.query(models.Store).all()}
    products = {p.sku_id: p.product_name for p in db.query(models.Product).all()}
    return stores, products


def _enrich_risk(rows, stores, products) -> List[schemas.RiskOut]:
    out = []
    for r in rows:
        out.append(schemas.RiskOut(
            store_id=r.store_id, sku_id=r.sku_id,
            store_name=stores.get(r.store_id), product_name=products.get(r.sku_id),
            current_stock=r.current_stock, avg_daily_forecast=r.avg_daily_forecast,
            days_of_stock_remaining=r.days_of_stock_remaining,
            stockout_risk_level=r.stockout_risk_level, overstock_flag=r.overstock_flag,
            excess_units=r.excess_units,
        ))
    return out


def _enrich_recs(rows, stores, products) -> List[schemas.RecommendationOut]:
    out = []
    for r in rows:
        out.append(schemas.RecommendationOut(
            rec_type=r.rec_type, store_id=r.store_id, sku_id=r.sku_id,
            store_name=stores.get(r.store_id), product_name=products.get(r.sku_id),
            from_store_id=r.from_store_id,
            from_store_name=stores.get(r.from_store_id) if r.from_store_id else None,
            quantity=r.quantity,
        ))
    return out


@router.get("/forecasts", response_model=List[schemas.ForecastOut])
def get_forecasts(store_id: Optional[str] = None, sku_id: Optional[str] = None,
                   days: int = Query(30, le=90), db: Session = Depends(get_db)):
    q = db.query(models.Forecast)
    if store_id:
        q = q.filter(models.Forecast.store_id == store_id)
    if sku_id:
        q = q.filter(models.Forecast.sku_id == sku_id)
    q = q.order_by(models.Forecast.date).limit(days * 200)
    return q.all()


@router.get("/risk/stockout", response_model=List[schemas.RiskOut])
def get_stockout_risk(level: Optional[str] = Query(None, pattern="^(HIGH|MEDIUM|LOW)$"),
                       store_id: Optional[str] = None, limit: int = 100,
                       db: Session = Depends(get_db)):
    q = db.query(models.RiskScore)
    if level:
        q = q.filter(models.RiskScore.stockout_risk_level == level)
    if store_id:
        q = q.filter(models.RiskScore.store_id == store_id)
    q = q.order_by(models.RiskScore.days_of_stock_remaining.asc()).limit(limit)
    stores, products = _name_lookups(db)
    return _enrich_risk(q.all(), stores, products)


@router.get("/risk/overstock", response_model=List[schemas.RiskOut])
def get_overstock(store_id: Optional[str] = None, limit: int = 100, db: Session = Depends(get_db)):
    q = db.query(models.RiskScore).filter(models.RiskScore.overstock_flag == True)
    if store_id:
        q = q.filter(models.RiskScore.store_id == store_id)
    q = q.order_by(models.RiskScore.excess_units.desc()).limit(limit)
    stores, products = _name_lookups(db)
    return _enrich_risk(q.all(), stores, products)


@router.get("/recommendations/replenishment", response_model=List[schemas.RecommendationOut])
def get_replenishment(store_id: Optional[str] = None, limit: int = 100, db: Session = Depends(get_db)):
    q = db.query(models.Recommendation).filter(models.Recommendation.rec_type == 'replenishment')
    if store_id:
        q = q.filter(models.Recommendation.store_id == store_id)
    rows = q.order_by(models.Recommendation.quantity.desc()).limit(limit).all()
    stores, products = _name_lookups(db)
    return _enrich_recs(rows, stores, products)


@router.get("/recommendations/transfers", response_model=List[schemas.RecommendationOut])
def get_transfers(store_id: Optional[str] = None, limit: int = 100, db: Session = Depends(get_db)):
    q = db.query(models.Recommendation).filter(models.Recommendation.rec_type == 'transfer')
    if store_id:
        q = q.filter(models.Recommendation.store_id == store_id)
    rows = q.order_by(models.Recommendation.quantity.desc()).limit(limit).all()
    stores, products = _name_lookups(db)
    return _enrich_recs(rows, stores, products)


@router.get("/metrics/backtest", response_model=List[schemas.BacktestOut])
def get_backtest_results(db: Session = Depends(get_db)):
    return db.query(models.BacktestResult).order_by(models.BacktestResult.wape.asc()).all()


@router.get("/dashboard/summary", response_model=schemas.DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)):
    n_stores = db.query(models.Store).count()
    n_skus = db.query(models.Product).count()
    n_pairs = db.query(models.RiskScore).count()
    high = db.query(models.RiskScore).filter(models.RiskScore.stockout_risk_level == 'HIGH').count()
    medium = db.query(models.RiskScore).filter(models.RiskScore.stockout_risk_level == 'MEDIUM').count()
    overstock = db.query(models.RiskScore).filter(models.RiskScore.overstock_flag == True).count()
    replen = db.query(models.Recommendation).filter(models.Recommendation.rec_type == 'replenishment').count()
    transfers = db.query(models.Recommendation).filter(models.Recommendation.rec_type == 'transfer').count()

    best = db.query(models.BacktestResult).order_by(models.BacktestResult.wape.asc()).first()

    return schemas.DashboardSummary(
        total_stores=n_stores, total_skus=n_skus, total_store_sku_pairs=n_pairs,
        high_risk_count=high, medium_risk_count=medium, overstock_count=overstock,
        total_replenishment_recs=replen, total_transfer_recs=transfers,
        best_model=best.model if best else None,
        best_model_wape=best.wape if best else None,
    )
