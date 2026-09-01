#!/bin/sh
set -eu
# Renders the site config, pointing server_name at whatever host this
# deployment answers on so the default_server 444 block keeps catching
# everything else. Leave HUB_PUBLIC_URL empty to answer on any Host, which is
# what a Komodo temporary URL or a gateway that forwards its own name needs.
#
# Docker re-runs /docker-entrypoint.d on EVERY container start, not just the
# first. So this always renders from a read-only template rather than editing
# the file it produced last time: the deletion below is correct against the
# template and destructive against its own output, where the first column-0 }
# closes the entire server block instead of the 444 block.
template=/etc/nginx/hub-site.conf.template
conf=/etc/nginx/conf.d/default.conf

cp "$template" "$conf"

runtime_host="$(printf '%s' "${HUB_PUBLIC_URL:-}" | sed -E 's#^[a-zA-Z]+://##; s#[:/].*##')"
default_hosts="hub.millenniaws.sch.id app.mws.web.id localhost"

if [ -n "$runtime_host" ]; then
  case " $default_hosts " in
    *" $runtime_host "*) server_names="$default_hosts" ;;
    *) server_names="$runtime_host $default_hosts" ;;
  esac
  sed -i "s/server_name hub\.millenniaws\.sch\.id app\.mws\.web\.id localhost;/server_name $server_names;/" "$conf"
else
  sed -i '1,/^}$/d' "$conf"
  sed -i "s/server_name hub\.millenniaws\.sch\.id app\.mws\.web\.id localhost;/server_name _;/" "$conf"
fi

# A config with no server block starts nginx successfully and listens on
# nothing, so fail loudly here instead of handing the gateway a 502.
grep -q 'listen 80' "$conf"
