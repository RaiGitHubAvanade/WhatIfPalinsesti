# RAI What-If Webapp
React + Vite frontend with a Python Flask backend.


## Prerequisites
- Node.js (LTS recommended)
- Python 3.14
- Databricks VsCode extension


### First-time setup
Open a terminal in the project root folder (WEBAPP folder) and execute the following commands in order:
```powershell
New-Item -Path api\.env -ItemType File
python -m venv api\.venv
api\.venv\Scripts\activate
api\.venv\Scripts\pip install --no-cache -r requirements.txt
npm install --prefix frontend
npm install exceljs --prefix frontend
```


## Running the app
Run Backend and Frontend indipendently (two open terminals needed)
```powershell
npm run api --prefix frontend
npm run dev --prefix frontend
```

Run both together (frontend precompiled, single terminal):
```powershell
npm run build --prefix frontend ; api\.venv\Scripts\python serve.py
```


## Deploy
To setup the databricks vscode extension for the first time, it's recommended to open the vscode workspace at the 'WEBAPP' folder level, instead of 'WHATIFPALINSESTI'. So '.databricks' folder will be created by the extension inside 'WEBAPP' folder.
Once databricks extension is configured, run the following script to deploy:
```powershell
.\deploy.ps1
```
If it says the 'databricks' command is not recognized, restart the terminal and run:
```powershell
cd .\WEBAPP\ ; api\.venv\Scripts\activate ; .\deploy.ps1
```