"""
Seeds demo overstock risk_scores + transfer recommendations, but this
version picks transfer store-pairs FROM the store_distances cache (only
pairs within 10-50km), so the seeded data actually demonstrates the
distance-aware transfer logic -- not just random store pairs like the
original seed_demo_data.py.

Run locally with DATABASE_URL pointed at RDS:

    export DATABASE_URL="postgresql://...rds.amazonaws.com:5432/ai_demand_forecasting?sslmode=require"
    python seed_demo_data_v2.py
"""
import random
from app.database import SessionLocal
from app import models

MIN_KM, MAX_KM = 10, 50

db = SessionLocal()

stores = [s.store_id for s in db.query(models.Store).limit(10).all()]
products = [p.sku_id for p in db.query(models.Product).limit(20).all()]

nearby_pairs = [
    (d.store_a_id, d.store_b_id, d.distance_km)
    for d in db.query(models.StoreDistance)
    .filter(models.StoreDistance.distance_km >= MIN_KM, models.StoreDistance.distance_km <= MAX_KM)
    .all()
    if d.store_a_id in stores and d.store_b_id in stores
]

if not nearby_pairs:
    raise SystemExit(
        f"No store pairs found within {MIN_KM}-{MAX_KM}km. "
        "Run compute_store_distances.py first, or widen the range."
    )

print(f"Found {len(nearby_pairs)} store pairs within {MIN_KM}-{MAX_KM}km to seed transfers from.")

# ---- Overstock risk_scores (unrelated to distance -- just demo excess stock) ----
overstock_rows = []
for i in range(15):
    store_id = random.choice(stores)
    sku_id = random.choice(products)
    avg_forecast = round(random.uniform(2, 8), 2)
    current_stock = round(avg_forecast * random.uniform(60, 120), 1)
    days_remaining = round(current_stock / avg_forecast, 1)
    excess = round(current_stock - avg_forecast * 45, 1)

    overstock_rows.append(models.RiskScore(
        store_id=store_id, sku_id=sku_id, current_stock=current_stock,
        avg_daily_forecast=avg_forecast, days_of_stock_remaining=days_remaining,
        stockout_risk_level="LOW", overstock_flag=True, excess_units=max(excess, 1.0),
    ))

db.bulk_save_objects(overstock_rows)
db.commit()
print(f"Inserted {len(overstock_rows)} overstock risk_score rows.")

# ---- Store transfers, only between pairs within the distance range ----
transfer_rows = []
for i in range(12):
    dest_store, source_store, distance_km = random.choice(nearby_pairs)
    if random.random() < 0.5:  # randomize direction
        dest_store, source_store = source_store, dest_store
    sku_id = random.choice(products)
    qty = random.randint(10, 80)

    transfer_rows.append(models.Recommendation(
        rec_type="transfer", store_id=dest_store, sku_id=sku_id,
        from_store_id=source_store, quantity=qty,
    ))
    print(f"  {source_store} -> {dest_store}  ({distance_km:.1f} km)  {qty} units")

db.bulk_save_objects(transfer_rows)
db.commit()
print(f"Inserted {len(transfer_rows)} transfer recommendation rows, all within {MIN_KM}-{MAX_KM}km.")

db.close()
print("Done. Refresh the Overstock and Store Transfers pages.")
