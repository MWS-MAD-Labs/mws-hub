#!/bin/sh
set -eu
# Point the server block at whatever host this deployment answers on, so the
# default_server 444 block keeps catching everything else. Before staging has
# a real domain, leave HUB_PUBLIC_URL empty and accept Komodo's temporary host.
runtime_host="$(printf '%s' "${HUB_PUBLIC_URL:-}" | sed -E 's#^[a-zA-Z]+://##; s#[:/].*##')"

if [ -n "$runtime_host" ]; then
  sed -i "s/server_name hub\.millenniaws\.sch\.id localhost;/server_name $runtime_host localhost;/" /etc/nginx/conf.d/default.conf
else
  sed -i "s/server_name hub\.millenniaws\.sch\.id localhost;/server_name _;/" /etc/nginx/conf.d/default.conf
fi
