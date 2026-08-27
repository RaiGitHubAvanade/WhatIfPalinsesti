import os
from dotenv import load_dotenv

load_dotenv()  # loads .env if present; no-op on Databricks where env vars are injected


class Config:
    DB_CATALOG = os.getenv("DB_CATALOG", "ta_coll")
    DB_SCHEMA = os.getenv("DB_SCHEMA", "whatif")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    WEEK_TABLE_START = os.getenv("WEEK_TABLE_START", "12:30")
    WEEK_TABLE_END = os.getenv("WEEK_TABLE_END", "23:30")
    WEEK_TABLE_START_OFFSET_MINUTES = int(os.getenv("WEEK_TABLE_START_OFFSET", "15"))
    WEEK_TABLE_END_OFFSET_MINUTES = int(os.getenv("WEEK_TABLE_END_OFFSET", "15"))
    CHANNEL_ORDER = os.getenv("CHANNEL_ORDER", "Rai 1,Rai 2,Rai 3,Rete 4,Canale 5,Italia 1,La7,Tv8,Nove").split(",")
    CHANNEL_ORDER_SIMULATION_DETAIL = os.getenv("CHANNEL_ORDER_SIMULATION_DETAIL", "Rete 4,Canale 5,Italia 1,La7,Tv8,Nove").split(",")
    COMPETITORS_SLOT_DURATION_MINUTES = int(os.getenv("COMPETITORS_SLOT_DURATION_MINUTES", "60"))
    SOSTITUZIONE_ENDPOINT = os.getenv("SOSTITUZIONE_ENDPOINT", "simulazione-sostituzione")
    SOSTITUZIONE_TIMEOUT_SECONDS = int(os.getenv("SOSTITUZIONE_TIMEOUT_SECONDS", "120"))
    SPOSTAMENTO_ENDPOINT = os.getenv("SPOSTAMENTO_ENDPOINT", "simulazione-spostamento")
    SPOSTAMENTO_TIMEOUT_SECONDS = int(os.getenv("SPOSTAMENTO_TIMEOUT_SECONDS", "120"))
    CANDIDATES_DURATION_OFFSET_MINUTES = int(os.getenv("CANDIDATES_DURATION_OFFSET_MINUTES", "15"))
    MOCK_SIMULATION_SOSTITUZIONE_RESULT = os.getenv("MOCK_SIMULATION_SOSTITUZIONE_RESULT", "false").lower() == "true"
    MOCK_SIMULATION_SPOSTAMENTO_RESULT = os.getenv("MOCK_SIMULATION_SPOSTAMENTO_RESULT", "false").lower() == "true"
    MAX_SIMULATIONS_PER_SCENARIO = int(os.getenv("MAX_SIMULATIONS_PER_SCENARIO", "3"))
    ALLOW_UNVERIFIED_BEARER_IDENTITY = os.getenv("ALLOW_UNVERIFIED_BEARER_IDENTITY", "false").lower() == "true"
    ENABLE_LOCAL_DEV_IDENTITY_FALLBACK = os.getenv("ENABLE_LOCAL_DEV_IDENTITY_FALLBACK", "false").lower() == "true"
    LOCAL_DEV_USER_EMAIL = os.getenv("LOCAL_DEV_USER_EMAIL", "dev@test.it")
    SSE_KEEPALIVE_SECONDS = int(os.getenv("SSE_KEEPALIVE_SECONDS", "20"))