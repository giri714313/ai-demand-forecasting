from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models  # noqa: F401 -- ensures models are registered before create_all
from app.routers import ingest, pipeline, query, auth

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Demand Forecasting API",
    description="Store x SKU demand forecasting, stockout/overstock risk, "
                 "replenishment and transfer recommendations for multi-store retail.",
    version="1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this before any real deployment
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(ingest.router)
app.include_router(pipeline.router)
app.include_router(query.router)


@app.get("/")
def root():
    return {
        "service": "AI Demand Forecasting API",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
