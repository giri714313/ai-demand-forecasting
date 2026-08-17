"""
ORM models -- one table per entity in the handoff doc's data model:
stores, products, sales, inventory, forecasts, risk_scores, recommendations.
"""
from sqlalchemy import Column, String, Float, Integer, Date, Boolean, ForeignKey, Index
from app.database import Base


class Store(Base):
    __tablename__ = "stores"
    store_id = Column(String, primary_key=True)
    store_name = Column(String)
    city = Column(String)
    state = Column(String)
    store_type = Column(String)
    active = Column(Boolean, default=True)


class Product(Base):
    __tablename__ = "products"
    sku_id = Column(String, primary_key=True)
    product_name = Column(String)
    category = Column(String)
    brand = Column(String)
    pack_size = Column(String)
    unit = Column(String)
    cost_price = Column(Float)
    selling_price = Column(Float)
    active = Column(Boolean, default=True)


class Sale(Base):
    __tablename__ = "sales"
    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, index=True)
    store_id = Column(String, ForeignKey("stores.store_id"), index=True)
    sku_id = Column(String, ForeignKey("products.sku_id"), index=True)
    units_sold = Column(Float)
    selling_price = Column(Float)
    discount_pct = Column(Float)
    promotion_flag = Column(Integer)
    sales_value = Column(Float)

    __table_args__ = (Index("ix_sales_store_sku_date", "store_id", "sku_id", "date"),)


class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, index=True)
    store_id = Column(String, ForeignKey("stores.store_id"), index=True)
    sku_id = Column(String, ForeignKey("products.sku_id"), index=True)
    opening_stock = Column(Float)
    stock_received = Column(Float)
    closing_stock = Column(Float)
    stockout_flag = Column(Integer)

    __table_args__ = (Index("ix_inventory_store_sku_date", "store_id", "sku_id", "date"),)


class Forecast(Base):
    __tablename__ = "forecasts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, index=True)
    store_id = Column(String, ForeignKey("stores.store_id"), index=True)
    sku_id = Column(String, ForeignKey("products.sku_id"), index=True)
    forecast_units = Column(Float)
    model = Column(String)
    model_version = Column(String)

    __table_args__ = (Index("ix_forecasts_store_sku_date", "store_id", "sku_id", "date"),)


class RiskScore(Base):
    __tablename__ = "risk_scores"
    id = Column(Integer, primary_key=True, autoincrement=True)
    store_id = Column(String, ForeignKey("stores.store_id"), index=True)
    sku_id = Column(String, ForeignKey("products.sku_id"), index=True)
    current_stock = Column(Float)
    avg_daily_forecast = Column(Float)
    days_of_stock_remaining = Column(Float)
    stockout_risk_level = Column(String, index=True)
    overstock_flag = Column(Boolean)
    excess_units = Column(Float)

    __table_args__ = (Index("ix_risk_store_sku", "store_id", "sku_id"),)


class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(Integer, primary_key=True, autoincrement=True)
    rec_type = Column(String, index=True)  # 'replenishment' | 'transfer'
    store_id = Column(String, index=True)          # target store (replenishment) or destination (transfer)
    sku_id = Column(String, index=True)
    from_store_id = Column(String, nullable=True)   # only for transfers
    quantity = Column(Float)


class BacktestResult(Base):
    __tablename__ = "backtest_results"
    id = Column(Integer, primary_key=True, autoincrement=True)
    model = Column(String)
    mae = Column(Float)
    rmse = Column(Float)
    wape = Column(Float)
    bias = Column(Float)
