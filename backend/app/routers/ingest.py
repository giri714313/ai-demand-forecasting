import pandas as pd
from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import io
import time

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
    t0 = time.time()
    expected = TABLE_MAP[table]
    is_postgres = db.bind.dialect.name == "postgresql"
    raw_conn = db.bind.raw_connection()
    total_rows = 0
    try:
        cursor = raw_conn.cursor()
        columns = ",".join(expected)

        if not is_postgres:
            placeholders = ",".join(["?"] * len(expected))
            insert_sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"

        for chunk in pd.read_csv(file.file, chunksize=50_000):
            missing = set(expected) - set(chunk.columns)
            if missing:
                raw_conn.rollback()
                return {"error": f"Missing expected columns for {table}: {missing}"}
            chunk = chunk[expected]

            if is_postgres:
                buf = io.StringIO()
                chunk.to_csv(buf, index=False, header=False)
                buf.seek(0)
                cursor.copy_expert(
                    f"COPY {table} ({columns}) FROM STDIN WITH (FORMAT csv)", buf
                )
            else:
                rows = [tuple(x) for x in chunk.to_numpy()]
                cursor.executemany(insert_sql, rows)

            total_rows += len(chunk)

        raw_conn.commit()
    finally:
        raw_conn.close()

    return {"table": table, "rows_ingested": total_rows, "seconds": round(time.time() - t0, 1)}


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
