from pydantic import BaseModel
from typing import Optional
from datetime import date


class StoreOut(BaseModel):
    store_id: str
    store_name: str
    city: Optional[str] = None

    class Config:
        from_attributes = True


class ProductOut(BaseModel):
    sku_id: str
    product_name: str
    category: Optional[str] = None

    class Config:
        from_attributes = True


class ForecastOut(BaseModel):
    date: date
    store_id: str
    sku_id: str
    forecast_units: float
    model: str

    class Config:
        from_attributes = True


class RiskOut(BaseModel):
    store_id: str
    sku_id: str
    store_name: Optional[str] = None
    product_name: Optional[str] = None
    current_stock: float
    avg_daily_forecast: float
    days_of_stock_remaining: float
    stockout_risk_level: str
    overstock_flag: bool
    excess_units: float

    class Config:
        from_attributes = True


class RecommendationOut(BaseModel):
    rec_type: str
    store_id: str
    sku_id: str
    store_name: Optional[str] = None
    product_name: Optional[str] = None
    from_store_id: Optional[str] = None
    from_store_name: Optional[str] = None
    quantity: float
    distance_km: Optional[float] = None

    class Config:
        from_attributes = True


class BacktestOut(BaseModel):
    model: str
    mae: float
    rmse: float
    wape: float
    bias: float

    class Config:
        from_attributes = True


class DashboardSummary(BaseModel):
    total_stores: int
    total_skus: int
    total_store_sku_pairs: int
    high_risk_count: int
    medium_risk_count: int
    overstock_count: int
    total_replenishment_recs: int
    total_transfer_recs: int
    best_model: Optional[str] = None
    best_model_wape: Optional[float] = None


class UserSignup(BaseModel):
    email: str
    password: str
    full_name: str
    # Anyone can sign up; only an existing admin (or the very first user,
    # handled in the route) can actually become an admin. Requested role
    # for non-first users other than "admin" is honored as-is (manager/viewer).
    role: str = "viewer"


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
