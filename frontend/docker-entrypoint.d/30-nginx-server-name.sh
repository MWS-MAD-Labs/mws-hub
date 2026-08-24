#!/bin/sh
set -eu
# Point the server block at whatever host this deployment answers on, so the
# default_server 444 block keeps catching everything else.
runtime_host="$(printf '%s' "${HUB_PUBLIC_URL:-}" | sed -E 's#^[a-zA-Z]+://##; s#[:/].*##')"

if [ -n "$runtime_host" ]; then
  sed -i "s/server_name hub\.millenniaws\.sch\.id localhost;/server_name $runtime_host localhost;/" /etc/nginx/conf.d/default.conf
fi
