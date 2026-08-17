"""
Database connection setup.

Defaults to a local SQLite file so the backend runs with zero setup.
For production (or once you want Vijetha's real data on proper infra),
set DATABASE_URL to a Postgres/Supabase connection string, e.g.:

    export DATABASE_URL="postgresql://user:pass@host:5432/demand_forecasting"

No other code needs to change -- SQLAlchemy handles both.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./demand_forecasting.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
