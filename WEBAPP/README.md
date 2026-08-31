# RAI What-If Webapp
React + Vite frontend with a Python Flask backend.


## Prerequisites
- Node.js (LTS recommended)
- Python 3.14
- Databricks VsCode extension
- Databricks CLI


### First-time setup
Open a terminal in the project root folder (WEBAPP folder) and execute the following commands in order:
```powershell
Copy-Item api\.env.example api\.env
python -m venv api\.venv
api\.venv\Scripts\activate
api\.venv\Scripts\pip install --no-cache -r requirements.txt
npm install --prefix frontend
npm install exceljs --prefix frontend
```


### Local Databricks runtime authentication
Runtime authentication is Service Principal only. Set these variables in `api/.env`:

- `DATABRICKS_HOST`
- `DATABRICKS_CLIENT_ID`
- `DATABRICKS_CLIENT_SECRET`
- `DATABRICKS_WAREHOUSE_ID`


## Running the app
Open a terminal in the project root folder (WEBAPP folder) and execute the following commands:
Run Backend and Frontend indipendently (two open terminals needed)
```powershell
npm run api --prefix frontend
npm run dev --prefix frontend
```

Run both together (frontend precompiled, single terminal):
```powershell
npm run build --prefix frontend ; api\.venv\Scripts\python serve.py
```

If deployment authentication fails, run:
```powershell
databricks auth describe --host INSERT_HOST_HERE
```
and verify the selected profile is valid.


## Deploy
Open a terminal in the project root folder (WEBAPP folder) and execute the following commands:
Use OAuth profiles for deployment commands.

1. Login with Databricks OAuth for each workspace you deploy to:
```powershell
databricks auth login --host https://<dev-workspace-host>
```
Then write "dev-profile"

```powershell
databricks auth login --host https://<prod-workspace-host>
```
Then write "prod-profile"

2. Verify available profiles:
```powershell
databricks auth profiles
```

3. From now on, you can just execute the following commands whenever you want to deploy to a specific environment:
Deploy to dev:
```powershell
.\deploy.ps1 -Target dev -Profile dev-profile
```
Deploy to prod:
```powershell
.\deploy.ps1 -Target prod -Profile prod-profile
```

The deploy script performs:
- Frontend static build (Vite) to frontend/dist.
- Databricks bundle deployment.
- Databricks app start.
- Databricks app deploy.
- Temporary app.yaml rendering for target-specific values (`DB_CATALOG`, `DB_SCHEMA`, `CORS_ORIGINS`) and automatic restore of the template file.

The deploy script enforces environment-safe variable automation by rendering target values before deploy:
- dev target -> DB_CATALOG=ta_coll, DB_SCHEMA=whatif
- prod target -> DB_CATALOG=ta_prod, DB_SCHEMA=whatif

At runtime, the backend opens the SQL connection and sets the session namespace once with `USE CATALOG` and `USE SCHEMA`. Queries then use unqualified table names.
