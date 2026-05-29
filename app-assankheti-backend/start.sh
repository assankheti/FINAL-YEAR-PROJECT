#!/usr/bin/env bash
set -euo pipefail

export PYTHONPATH="${PYTHONPATH:-src}"

exec python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
