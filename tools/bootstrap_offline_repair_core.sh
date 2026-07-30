#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
exec python3 tools/bootstrap_offline_repair_core.py "$@"
