"""
End-to-end smoke test: ingest the real dataset, train, generate forecasts,
and hit every query endpoint. Uses FastAPI's TestClient so it works without
a long-running server process.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
DATA_DIR = "/home/claude/vijetha"

print("=== 1. Health check ===")
r = client.get("/health")
print(r.status_code, r.json())

print("\n=== 2. Ingest data ===")
for table, fname in [("stores", "stores.csv"), ("products", "products.csv"),
                      ("sales", "sales.csv"), ("inventory", "inventory.csv")]:
    with open(os.path.join(DATA_DIR, fname), "rb") as f:
        r = client.post(f"/ingest/{table}", files={"file": (fname, f, "text/csv")})
    print(f"{table}: {r.status_code} {r.json()}")

print("\n=== 3. Train pipeline (this runs the real backtest) ===")
r = client.post("/pipeline/train")
print(r.status_code)
import json
print(json.dumps(r.json(), indent=2))

print("\n=== 4. Generate forecasts + recommendations ===")
r = client.post("/pipeline/generate-forecasts")
print(r.status_code)
print(json.dumps(r.json(), indent=2))

print("\n=== 5. Query endpoints ===")
r = client.get("/dashboard/summary")
print("dashboard/summary:", r.status_code, r.json())

r = client.get("/metrics/backtest")
print("\nmetrics/backtest:", r.status_code)
for row in r.json():
    print(" ", row)

r = client.get("/risk/stockout", params={"level": "HIGH", "limit": 5})
print("\nrisk/stockout (HIGH, top 5):", r.status_code)
for row in r.json():
    print(" ", row)

r = client.get("/recommendations/replenishment", params={"limit": 3})
print("\nrecommendations/replenishment (top 3):", r.status_code)
for row in r.json():
    print(" ", row)

r = client.get("/forecasts", params={"store_id": "VJ001", "sku_id": "SKU00001", "days": 7})
print("\nforecasts for VJ001/SKU00001 (first 7 rows):", r.status_code)
for row in r.json()[:7]:
    print(" ", row)

print("\n=== ALL ENDPOINTS OK ===")
