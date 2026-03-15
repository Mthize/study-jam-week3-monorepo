#!/usr/bin/env sh
set -euo pipefail

DEFAULT_API="https://backend-305659654950.africa-south1.run.app"
API_BASE="${PUBLIC_API_BASE_URL:-${VITE_API_BASE_URL:-$DEFAULT_API}}"

# Safely serialize the API_BASE value to prevent JS injection/breakage
SAFE_API_BASE=$(jq -n --arg val "$API_BASE" '$val')

cat <<CONFIG_EOF >/usr/share/nginx/html/env-config.js
window.__APP_CONFIG__ = Object.assign({}, window.__APP_CONFIG__, {
  API_BASE_URL: ${SAFE_API_BASE}
});
CONFIG_EOF

exec nginx -g "daemon off;"
