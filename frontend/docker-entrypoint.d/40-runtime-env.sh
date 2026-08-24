#!/bin/sh
set -eu
# Vite bakes VITE_* at build time, which would tie one image to one
# environment. This writes them at container start instead, so the same
# image runs in staging and production with different config.

js_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e "s/'/\\\\'/g"
}

# Empty on purpose in the normal case: nginx proxies the API on this same
# origin, so the frontend calls /auth and /apps with no host prefix.
runtime_api_base_url="${VITE_HUB_API_BASE_URL:-${HUB_API_BASE_URL:-}}"
runtime_google_client_id="${VITE_GOOGLE_CLIENT_ID:-${GOOGLE_CLIENT_ID:-}}"
runtime_support_email="${VITE_SUPPORT_EMAIL:-${SUPPORT_EMAIL:-}}"

cat > /usr/share/nginx/html/env.js <<INNER
window.__MWS_ENV__ = {
  VITE_HUB_API_BASE_URL: '$(js_escape "$runtime_api_base_url")',
  VITE_GOOGLE_CLIENT_ID: '$(js_escape "$runtime_google_client_id")',
  VITE_SUPPORT_EMAIL: '$(js_escape "$runtime_support_email")',
};
INNER
