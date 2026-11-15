#!/usr/bin/env bash
# Unified deploy entry point. Currently deploys the frontend atomically.
set -euo pipefail
exec "$(dirname "${BASH_SOURCE[0]}")/deploy-frontend.sh" "$@"
