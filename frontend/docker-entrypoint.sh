#!/usr/bin/env sh
set -euo pipefail

DEFAULT_API="https://backend-305659654950.africa-south1.run.app"
API_BASE="${PUBLIC_API_BASE_URL:-${VITE_API_BASE_URL:-$DEFAULT_API}}"

cat <<EOF >/usr/share/nginx/html/env-config.js
window.__APP_CONFIG__ = Object.assign({}, window.__APP_CONFIG__, {
  API_BASE_URL: "${API_BASE}"
});
EOF

exec nginx -g "daemon off;"
