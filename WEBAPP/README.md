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


### Local Databricks authentication (recommended)
Use profile-based Databricks auth so you do not need to update DATABRICKS_CLIENT_SECRET in api/.env every time it rotates.

1. Login once with OAuth:
```powershell
databricks auth login --host INSERT_HOST_HERE
```
2. Set DATABRICKS_CONFIG_PROFILE in api/.env (example: dev-profile).
3. Keep DATABRICKS_CLIENT_ID and DATABRICKS_CLIENT_SECRET empty in api/.env unless you explicitly want SP-secret auth.
4. You can also leave DATABRICKS_WAREHOUSE_ID empty in local: the backend falls back to the sql_warehouse id defined in WEBAPP/databricks.yml.


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

If authentication fails while using profile auth, run:
```powershell
databricks auth describe --host INSERT_HOST_HERE
```
and verify that the selected profile is valid and authorized on the SQL warehouse.


## Deploy
Open a terminal in the project root folder (WEBAPP folder) and execute the following commands:
Use OAuth/profile-based authentication for both dev and prod.

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
- Databricks app source-code deploy.


### Common production errors and fixes
1. Error: "prod: no such target"
- Cause: prod target missing in databricks.yml.
- Fix: ensure targets.prod exists in databricks.yml.

2. Error: "not authorized to use or monitor this SQL Endpoint"
- Cause: wrong warehouse id for prod or missing warehouse permissions.
- Fix:
	- Use the correct prod warehouse id in the prod target override.
	- Grant app identity CAN_USE and CAN_MONITOR on the prod SQL warehouse.

3. Error: "Cannot deploy app ... as it is not in RUNNING state"
- Cause: app compute is stopped.
- Fix: deploy.ps1 now starts the app automatically before app deploy.

4. Runtime API 502 with "INSUFFICIENT_PERMISSIONS ... USE CATALOG"
- Cause: app runtime identity has no Unity Catalog privileges.
- Fix: grant permissions to the Databricks app service principal (not only to the deploying user):
	- USE CATALOG on catalog ta_coll
	- USE SCHEMA on schema ta_coll.whatif
	- SELECT and MODIFY on required objects in ta_coll.whatif