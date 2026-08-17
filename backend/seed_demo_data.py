"""
Seeds a handful of overstock risk_scores rows and store-transfer
recommendation rows, for demo purposes.

Run this locally with DATABASE_URL pointed at the AWS RDS instance,
from inside the backend/ folder with the venv activated:

    export DATABASE_URL="postgresql://...rds.amazonaws.com:5432/ai_demand_forecasting?sslmode=require"
    python seed_demo_data.py
"""
import random
from app.database import SessionLocal
from app import models

db = SessionLocal()

stores = [s.store_id for s in db.query(models.Store).limit(10).all()]
products = [p.sku_id for p in db.query(models.Product).limit(20).all()]

if len(stores) < 2 or len(products) < 2:
    raise SystemExit("Not enough stores/products in the DB to seed demo data.")

print(f"Using {len(stores)} stores and {len(products)} products for seeding.")

# ---- Overstock risk_scores ----
overstock_rows = []
for i in range(15):
    store_id = random.choice(stores)
    sku_id = random.choice(products)
    avg_forecast = round(random.uniform(2, 8), 2)
    current_stock = round(avg_forecast * random.uniform(60, 120), 1)  # way more than needed
    days_remaining = round(current_stock / avg_forecast, 1)
    excess = round(current_stock - avg_forecast * 45, 1)

    overstock_rows.append(models.RiskScore(
        store_id=store_id,
        sku_id=sku_id,
        current_stock=current_stock,
        avg_daily_forecast=avg_forecast,
        days_of_stock_remaining=days_remaining,
        stockout_risk_level="LOW",
        overstock_flag=True,
        excess_units=max(excess, 1.0),
    ))

db.bulk_save_objects(overstock_rows)
db.commit()
print(f"Inserted {len(overstock_rows)} overstock risk_score rows.")

# ---- Store transfer recommendations ----
transfer_rows = []
for i in range(12):
    dest_store, source_store = random.sample(stores, 2)
    sku_id = random.choice(products)
    qty = random.randint(10, 80)

    transfer_rows.append(models.Recommendation(
        rec_type="transfer",
        store_id=dest_store,
        sku_id=sku_id,
        from_store_id=source_store,
        quantity=qty,
    ))

db.bulk_save_objects(transfer_rows)
db.commit()
print(f"Inserted {len(transfer_rows)} transfer recommendation rows.")

db.close()
print("Done. Refresh the Overstock and Store Transfers pages.")
