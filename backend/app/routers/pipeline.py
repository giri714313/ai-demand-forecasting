from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import ml_engine

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


@router.post("/train")
def train(test_days: int = 30, db: Session = Depends(get_db)):
    """
    Runs feature engineering, computes baseline forecasts (seasonal naive,
    28-day moving average), trains the LightGBM model, and backtests all
    three on a held-out time-based window. Saves the model artifact.
    """
    try:
        return ml_engine.train_and_backtest(db, test_days=test_days)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/generate-forecasts")
def generate_forecasts(horizon: int = 90, lead_time_days: int = 5,
                        safety_buffer_days: int = 14, overstock_threshold_days: int = 45,
                        db: Session = Depends(get_db)):
    """
    Generates recursive multi-step forecasts for every store-SKU series using
    the trained model, then derives stockout risk, overstock flags,
    replenishment quantities, and store transfer recommendations.
    """
    try:
        return ml_engine.generate_forecasts_and_recommendations(
            db, horizon=horizon, lead_time_days=lead_time_days,
            safety_buffer_days=safety_buffer_days,
            overstock_threshold_days=overstock_threshold_days)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
