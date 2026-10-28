# MWS Hub - Komodo Deployment

Staging and production follow `mws-central-database-user`: one `docker-compose.yml`
for both environments, GitHub Actions runs quality gates then calls the stack
webhook, and Komodo builds from source. Staging and production are two
separate Komodo stacks pointed at the same compose file - everything that
differs between them (ports, the gateway network name, the gateway alias,
`HUB_SSO_PRIVATE_KEY`, etc.) lives in each stack's own `.env`, not in a second
compose file.

| Environment | Branch | Build source | Compose | Gateway network | Komodo stack |
|---|---|---|---|---|---|
| Staging | `staging` | Komodo builds from source | `docker-compose.yml` | `mws-unified` | `mws-hub-staging` |
| Production | `master` | Komodo builds from source | `docker-compose.yml` | `mws-unified-prod` | `mws-hub` |

Hub's default branch is `master`, not `main` as in the satellites - the
production workflow triggers accordingly.

### GitHub Actions secrets

| Secret | Used by |
|---|---|
| `KOMODO_STAGING_WEBHOOK_URL` / `..._SECRET` | staging deploy |
| `KOMODO_PRODUCTION_WEBHOOK_URL` / `..._SECRET` | production deploy |
| `KOMODO_WEBHOOK_URL` / `KOMODO_WEBHOOK_SECRET` | legacy fallback for both |

## What is different about this one

Hub is the only stack where **the frontend is the single entry point**. Nginx
serves the app and proxies `/auth`, `/apps` and `/.well-known` to the backend
over the internal network. The backend never joins the gateway network.

That is deliberate, and it is not just tidiness:

- Hub's session cookie is `SameSite=Strict`. Opening an app is a top-level
  navigation from the page to `/apps/:id/launch`. Across two origins that
  cookie is not sent and **every launch would 401**. One origin removes the
  problem instead of working around it.
- Same origin also means no CORS between the app and its own API.

The practical consequence: `/auth`, `/apps` and `/.well-known` are reserved
prefixes. The SPA router must never claim them.

## Builds and containers

Both environments build from `./backend` and `./frontend` in the same
`docker-compose.yml` - there is no separate production compose file and no
hardcoded `container_name:` in either service. Container names are left to
Compose's own default (`<project>-<service>-1`), where `<project>` is
whichever Komodo stack name is set below, so staging and production never
collide even when they run on the same Docker host.

| Environment | Komodo stack (= Compose project name) | Backend container | Frontend container |
|---|---|---|---|
| Staging | `mws-hub-staging` | `mws-hub-staging-backend-1` | `mws-hub-staging-frontend-1` |
| Production | `mws-hub` | `mws-hub-backend-1` | `mws-hub-frontend-1` |

Confirmed against the real staging stack in Komodo: it's named `mws-hub-staging`
with Clone Path left on its default (`$root_directory/stacks/mws-hub-staging`),
which is also what Compose derives its project name from when none is set
explicitly - so the table above should match what `docker ps` actually shows,
not just the stack name in Komodo's UI. Worth a quick `docker ps` check after
the first production deploy to confirm the production project name really
does come out as `mws-hub` and not something else Komodo derives internally.

## Komodo stack

Create a **Stack** with manual compose contents (same `docker-compose.yml`
for both), then point the gateway at the frontend container - it is the only
one on the gateway network. What actually separates staging from production
is each stack's own `.env`: `GATEWAY_NETWORK` and `GATEWAY_ALIAS` (see
Compose variables below), plus every backend/frontend variable further down.

| | Staging | Production |
|---|---|---|
| Compose source | `docker-compose.yml` | `docker-compose.yml` |
| `GATEWAY_NETWORK` | `mws-unified` | `mws-unified-prod` |
| `GATEWAY_ALIAS` | `mws-hub-fe` (default, can be left unset) | `hub-fe-prod` |
| Gateway target | `127.0.0.1:8083` or `mws-hub-fe:80` on `mws-unified` | `hub-fe-prod:80` on `mws-unified-prod` |

For staging, route `app-stg.mws.web.id` to frontend only. If the Komodo gateway is
configured as a host-level reverse proxy, use `127.0.0.1:8083`. If it is
attached to Docker's `mws-unified` network, use `mws-hub-fe:80`. Do not route
the gateway to `backend:4001`; the backend intentionally stays off the gateway
network and is reached only by frontend Nginx over `internal`.

## Environment

Komodo supplies these to the stack as one root `.env` file (Env File Path:
`.env`, Run Directory left blank so it lands next to the compose file). The
Compose services read that same root `.env` via `env_file:` - that's why
`GOOGLE_CLIENT_ID` only needs to be set once even though both backend and
frontend use it. Local runs may still use `backend/.env`. The frontend needs
almost nothing beyond that, because its own config is written into `env.js`
when the container starts rather than baked into the bundle.

### Compose variables

Staging and production run on the same Docker host, so every host-bound port
below must actually differ between the two stacks' `.env` files or the
second one to start will fail with "port is already allocated".

```
# staging .env example
FRONTEND_PORT=8083        # host-local frontend port for the Komodo gateway
BACKEND_PORT=4003         # host-local backend debug/health port
POSTGRES_PORT=15436       # host-local Postgres maintenance port
GATEWAY_NETWORK=mws-unified
GATEWAY_ALIAS=mws-hub-fe  # optional to set explicitly, this is also the default
```

```
# production .env example - different ports, different gateway network/alias
FRONTEND_PORT=8093
BACKEND_PORT=4013
POSTGRES_PORT=15446
GATEWAY_NETWORK=mws-unified-prod
GATEWAY_ALIAS=hub-fe-prod
```

### Backend variables

Use the URL set for the stack. Staging and production must not share their Hub or Central addresses.

```
NODE_ENV=production
PORT=4001

FRONTEND_ORIGIN=https://app-stg.mws.web.id

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=postmessage
ALLOWED_DOMAIN=millennia21.id

CENTRAL_API_BASE_URL=https://db-stg.mws.web.id/api/internal
CENTRAL_API_TOKEN=

JWT_SECRET=
SESSION_COOKIE_NAME=hub_session

# PKCS#8 PEM, newlines escaped as \n. Production key must not be the one
# used in development.
HUB_SSO_PRIVATE_KEY=
HUB_SSO_KEY_ID=mws-hub-sso-2026-01

DAILY_CHECKIN_API_URL=https://app.millenniaws.sch.id
MTSS_API_URL=https://app.millenniaws.sch.id/mtss
```

### Frontend (compose environment)

```
HUB_API_BASE_URL=          # empty: same origin
GOOGLE_CLIENT_ID=          # same client as the backend
SUPPORT_EMAIL=admin@millennia21.id
HUB_PUBLIC_URL=https://app-stg.mws.web.id
```

`HUB_PUBLIC_URL` sets nginx's `server_name`. For staging, keep it aligned with
the gateway host so Nginx accepts requests forwarded by Komodo.

Production uses the same variable names with production URLs:

```env
FRONTEND_ORIGIN=https://app.mws.web.id
CENTRAL_API_BASE_URL=https://db.mws.web.id/api/internal
HUB_PUBLIC_URL=https://app.mws.web.id
```

## Before the first deploy

1. **Generate a production key pair.** The private half goes in
   `HUB_SSO_PRIVATE_KEY`, the public half is published automatically at
   `/.well-known/jwks.json`.

   ```bash
   openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 \
     -out hub-sso-private.pem
   openssl rsa -pubout -in hub-sso-private.pem -out hub-sso-public.pem
   ```

2. **Give the satellites the public key.** Both `mws-daily-checkin` and
   `mws-mtss-system` verify relay tokens with `HUB_SSO_PUBLIC_KEY`. Until they
   read JWKS over HTTP, this stays a manual copy - and it must be the public
   half. The private key belongs on Hub only.

3. **Issue Hub's Central credential**, if it does not exist yet:

   ```bash
   bun run scripts/bootstrap-hub-api-client.ts   # in mws-central-database-user/server
   ```

   Copy the printed token into `CENTRAL_API_TOKEN`. It is shown once.

4. **Register the Google OAuth origin.** Add
   both `https://app.mws.web.id` and `https://hub.millenniaws.sch.id` as
   authorised JavaScript origins on
   Hub's own OAuth client. Leave `GOOGLE_REDIRECT_URI` as the literal
   `postmessage` - that is what Google's token endpoint expects for the popup
   code flow, not a URL.

## Verifying a deploy

```bash
curl -s https://app.mws.web.id/.well-known/jwks.json | head -c 120
```

Should return a JWKS with one RSA key whose `kid` matches `HUB_SSO_KEY_ID`.
If it returns the SPA's HTML instead, nginx is not proxying and the reserved
prefixes need checking.

## Key rotation

Set a new `HUB_SSO_KEY_ID` and `HUB_SSO_PRIVATE_KEY`, redeploy Hub, then
update `HUB_SSO_PUBLIC_KEY` in both satellites. Relay tokens live 30 seconds,
so the overlap window is short. Once the satellites fetch JWKS by `kid`
instead of reading a pinned key from env, this stops needing a coordinated
deploy at all.
