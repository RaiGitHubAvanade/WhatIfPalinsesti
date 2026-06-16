"""Production entry point for Databricks Apps.

Adds api/ to the Python path so the 'app' package is importable,
then creates and runs the Flask application.

Usage (via app.yaml):
    python serve.py
"""

import os
import sys

# Make 'api/' importable so `from app import create_app` resolves correctly.
_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_root, "api"))

from app import create_app  # noqa: E402

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)
