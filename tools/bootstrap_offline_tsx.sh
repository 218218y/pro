#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
exec python tools/bootstrap_offline_tsx.py "$@"
