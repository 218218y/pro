#!/usr/bin/env sh
set -eu
python3 "$(dirname "$0")/bootstrap_offline_typescript.py" "$@"
