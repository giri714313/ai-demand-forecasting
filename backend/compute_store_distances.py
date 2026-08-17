"""
Two-part script:

1. Assigns demo latitude/longitude to each store (scattered realistically
   around the Hyderabad metro area, since this is still synthetic demo data).
   Skip this part once you have real store addresses -- geocode those
   instead (see geocode_stores() below for the real-data version).

2. Computes road distance between every store pair using the Google Maps
   Distance Matrix API, and caches results in store_distances. Falls back
   to straight-line (haversine) distance if GOOGLE_MAPS_API_KEY isn't set,
   so this still runs for demo purposes without needing an API key yet.

Run locally with DATABASE_URL pointed at RDS:

    export DATABASE_URL="postgresql://...rds.amazonaws.com:5432/ai_demand_forecasting?sslmode=require"
    export GOOGLE_MAPS_API_KEY="your-key-here"   # optional -- falls back to haversine if unset
    python compute_store_distances.py
"""
import os
import math
import random
import requests
from itertools import combinations

from app.database import SessionLocal
from app import models

GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")
DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"

# Roughly the Hyderabad metro area bounding box, for demo coordinates.
HYDERABAD_LAT_RANGE = (17.30, 17.55)
HYDERABAD_LNG_RANGE = (78.30, 78.60)


def assign_demo_coordinates(db):
    """Scatter demo stores across the Hyderabad metro area."""
    stores = db.query(models.Store).all()
    for store in stores:
        if store.latitude is not None and store.longitude is not None:
            continue  # already has coordinates, skip
        store.latitude = round(random.uniform(*HYDERABAD_LAT_RANGE), 6)
        store.longitude = round(random.uniform(*HYDERABAD_LNG_RANGE), 6)
    db.commit()
    print(f"Assigned demo coordinates to {len(stores)} stores.")


def geocode_stores(db):
    """
    For REAL store data: geocode each store's address into lat/long using
    Google's Geocoding API. Requires each Store to have a full address
    field (not present in the current schema -- add one when you have
    real addresses, e.g. `address = Column(String)`).
    """
    if not GOOGLE_MAPS_API_KEY:
        raise SystemExit("GOOGLE_MAPS_API_KEY not set -- required for geocoding real addresses.")
    stores = db.query(models.Store).all()
    for store in stores:
        address = f"{store.store_name}, {store.city}, {store.state}, India"
        resp = requests.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": address, "key": GOOGLE_MAPS_API_KEY},
        ).json()
        if resp.get("status") == "OK":
            loc = resp["results"][0]["geometry"]["location"]
            store.latitude, store.longitude = loc["lat"], loc["lng"]
        else:
            print(f"Could not geocode {store.store_id} ({address}): {resp.get('status')}")
    db.commit()


def haversine_km(lat1, lng1, lat2, lng2):
    """Straight-line distance fallback, in km."""
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def compute_distances_via_google(store_pairs, stores_by_id):
    """
    Batches store pairs into Google Distance Matrix API calls (max 25x25
    origins/destinations per request) and returns {(a_id, b_id): (km, min)}.
    """
    results = {}
    pair_list = list(store_pairs)
    batch_size = 10  # keep well under the 25x25 element limit

    for i in range(0, len(pair_list), batch_size):
        batch = pair_list[i:i + batch_size]
        origins = "|".join(f"{stores_by_id[a].latitude},{stores_by_id[a].longitude}" for a, b in batch)
        destinations = "|".join(f"{stores_by_id[b].latitude},{stores_by_id[b].longitude}" for a, b in batch)

        resp = requests.get(DISTANCE_MATRIX_URL, params={
            "origins": origins, "destinations": destinations,
            "key": GOOGLE_MAPS_API_KEY, "mode": "driving",
        }).json()

        # Distance Matrix returns a full origins x destinations grid; we
        # only want the matching diagonal (origin[i] vs destination[i]).
        for idx, (a, b) in enumerate(batch):
            try:
                element = resp["rows"][idx]["elements"][idx]
                if element["status"] == "OK":
                    results[(a, b)] = (
                        element["distance"]["value"] / 1000,  # meters -> km
                        element["duration"]["value"] / 60,    # seconds -> minutes
                    )
            except (KeyError, IndexError):
                continue
    return results


def compute_and_cache_distances(db, max_radius_km=60):
    """
    Computes distance for every store pair (skipping pairs already cached),
    using Google Maps if a key is set, otherwise haversine straight-line
    as an approximation. Only pairs within max_radius_km (a generous outer
    bound before the real 10-50km filter is applied at query time) are kept,
    to avoid wasting API calls/storage on obviously-too-far pairs.
    """
    stores = db.query(models.Store).filter(models.Store.latitude.isnot(None)).all()
    stores_by_id = {s.store_id: s for s in stores}

    existing = {(d.store_a_id, d.store_b_id) for d in db.query(models.StoreDistance).all()}
    all_pairs = [(a.store_id, b.store_id) for a, b in combinations(stores, 2)
                 if (a.store_id, b.store_id) not in existing]

    # Pre-filter with cheap haversine before spending API calls on far-apart pairs
    candidate_pairs = [
        (a, b) for a, b in all_pairs
        if haversine_km(stores_by_id[a].latitude, stores_by_id[a].longitude,
                         stores_by_id[b].latitude, stores_by_id[b].longitude) <= max_radius_km
    ]

    print(f"{len(candidate_pairs)} store pairs within {max_radius_km}km to compute (of {len(all_pairs)} total pairs).")

    if GOOGLE_MAPS_API_KEY:
        distances = compute_distances_via_google(candidate_pairs, stores_by_id)
        source = "google_maps"
    else:
        print("GOOGLE_MAPS_API_KEY not set -- using straight-line (haversine) distance as a fallback.")
        distances = {
            (a, b): (haversine_km(stores_by_id[a].latitude, stores_by_id[a].longitude,
                                   stores_by_id[b].latitude, stores_by_id[b].longitude), None)
            for a, b in candidate_pairs
        }
        source = "haversine_fallback"

    rows = [
        models.StoreDistance(store_a_id=a, store_b_id=b, distance_km=round(km, 2),
                              duration_minutes=round(mins, 1) if mins else None)
        for (a, b), (km, mins) in distances.items()
    ]
    db.bulk_save_objects(rows)
    db.commit()
    print(f"Cached {len(rows)} store-pair distances (source: {source}).")


if __name__ == "__main__":
    db = SessionLocal()
    assign_demo_coordinates(db)
    compute_and_cache_distances(db)
    db.close()
    print("Done.")
