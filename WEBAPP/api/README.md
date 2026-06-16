# Flask API (Backend)

Python Flask backend for the react-with-flask project.

## Prerequisites

- [`uv`](https://docs.astral.sh/uv/) installed
- Python 3.14 (`uv python install 3.14`)

## Setup

```bash
cd api
uv python pin 3.14
uv venv
.venv\Scripts\activate
uv pip install --no-cache -r requirements.txt (or .\.venv\Scripts\python.exe -m pip install --no-cache -r requirements.txt)
```

Create a `.env` file in this folder if needed.

## How to run

from the `./api/` folder, usign flask:
```bash
.venv\Scripts\flask run
```

or from the `./frontend/` folder using the npm script:
```bash
npm run api
```

or from the `root` folder using the npm script:
```bash
cd .\frontend\; npm run build; cd ..; python serve.py
```