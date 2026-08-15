import pandas as pd
from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import io

from app.database import get_db

router = APIRouter(prefix="/ingest", tags=["ingest"])

TABLE_MAP = {
    "stores": ["store_id", "store_name", "city", "state", "store_type", "active"],
    "products": ["sku_id", "product_name", "category", "brand", "pack_size", "unit",
                 "cost_price", "selling_price", "active"],
    "sales": ["date", "store_id", "sku_id", "units_sold", "selling_price",
              "discount_pct", "promotion_flag", "sales_value"],
    "inventory": ["date", "store_id", "sku_id", "opening_stock", "stock_received",
                  "closing_stock", "stockout_flag"],
}


async def _ingest_csv(table: str, file: UploadFile, db: Session):
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))
    expected = TABLE_MAP[table]
    missing = set(expected) - set(df.columns)
    if missing:
        return {"error": f"Missing expected columns for {table}: {missing}"}
    df = df[expected]
    df.to_sql(table, db.bind, if_exists="append", index=False)
    return {"table": table, "rows_ingested": len(df)}


@router.post("/stores")
async def ingest_stores(file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await _ingest_csv("stores", file, db)


@router.post("/products")
async def ingest_products(file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await _ingest_csv("products", file, db)


@router.post("/sales")
async def ingest_sales(file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await _ingest_csv("sales", file, db)


@router.post("/inventory")
async def ingest_inventory(file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await _ingest_csv("inventory", file, db)


@router.delete("/reset")
def reset_all_data(db: Session = Depends(get_db)):
    """Wipe all ingested + derived data. Useful when testing with a new retailer's dataset."""
    for table in ["recommendations", "risk_scores", "forecasts", "backtest_results",
                  "inventory", "sales", "products", "stores"]:
        db.execute(text(f"DELETE FROM {table}"))
    db.commit()
    return {"status": "all tables cleared"}
