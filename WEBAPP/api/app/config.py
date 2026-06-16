import os
from dotenv import load_dotenv

load_dotenv()  # loads .env if present; no-op on Databricks where env vars are injected


class Config:
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    WEEK_TABLE_START = os.getenv("WEEK_TABLE_START", "12:30")
    WEEK_TABLE_END = os.getenv("WEEK_TABLE_END", "23:30")
    WEEK_TABLE_START_OFFSET_MINUTES = int(os.getenv("WEEK_TABLE_START_OFFSET", "15"))
    WEEK_TABLE_END_OFFSET_MINUTES = int(os.getenv("WEEK_TABLE_END_OFFSET", "15"))
