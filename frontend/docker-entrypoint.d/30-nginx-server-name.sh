#!/bin/sh
set -eu
# Point the server block at whatever host this deployment answers on, so the
# default_server 444 block keeps catching everything else. Before staging has
# a real domain, leave HUB_PUBLIC_URL empty and accept Komodo's temporary host.
runtime_host="$(printf '%s' "${HUB_PUBLIC_URL:-}" | sed -E 's#^[a-zA-Z]+://##; s#[:/].*##')"
default_hosts="hub.millenniaws.sch.id app.mws.web.id localhost"

if [ -n "$runtime_host" ]; then
  case " $default_hosts " in
    *" $runtime_host "*) server_names="$default_hosts" ;;
    *) server_names="$runtime_host $default_hosts" ;;
  esac
  sed -i "s/server_name hub\.millenniaws\.sch\.id app\.mws\.web\.id localhost;/server_name $server_names;/" /etc/nginx/conf.d/default.conf
else
  sed -i '1,/^}$/d' /etc/nginx/conf.d/default.conf
  sed -i "s/server_name hub\.millenniaws\.sch\.id app\.mws\.web\.id localhost;/server_name _;/" /etc/nginx/conf.d/default.conf
fi
