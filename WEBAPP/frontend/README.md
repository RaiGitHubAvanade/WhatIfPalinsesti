# RAI What-If Webapp

React + Vite frontend with a Python Flask backend.


## Prerequisites

- Node.js (LTS recommended)
- Python 3.14 with pip


### Frontend - First-time setup

```bash
npm install
```


### Backend - First-time setup

Open a terminal in the project root folder and execute the following commands in order:
```bash
cd api
New-Item -Name .env -ItemType File
python -m venv .venv
.venv\Scripts\activate
pip install --no-cache -r requirements.txt
```


## Running the app

Start the backend (from the project root):
```bash
npm run api
```

Start the frontend (from the project root, in a separate terminal):
```bash
npm run dev
```
