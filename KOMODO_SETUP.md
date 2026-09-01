# MWS Hub - Komodo Deployment

Staging and production follow `mws-central-database-user`: GitHub Actions runs
quality gates, then calls the stack webhook, and Komodo builds from source.

| Environment | Branch | Build source | Compose | Gateway network | Komodo stack |
|---|---|---|---|---|---|
| Staging | `staging` | Komodo builds from source | `docker-compose.yml` | `mws-unified` | `mws-hub` |
| Production | `master` | Komodo builds from source | `deploy/production.compose.yml` | `mws-unified-prod` | `mws-hub-production` |

Hub's default branch is `master`, not `main` as in the satellites - the
production workflow triggers accordingly.

`docker-compose.local.yml` is for local smoke tests.

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

| Environment | Build/Image | Containers |
|---|---|---|
| Staging | Komodo `build:` from `./backend` and `./frontend` | `mws-hub-be`, `mws-hub-fe` |
| Production | Komodo `build:` from `../backend` and `../frontend` | `hub-be-prod`, `hub-fe-prod` |

## Komodo stack

Create a **Stack** with manual compose contents, then point the gateway at the
frontend container - it is the only one on the gateway network.

| | Staging | Production |
|---|---|---|
| Compose source | `docker-compose.yml` | `deploy/production.compose.yml` |
| Gateway target | `mws-hub-fe` on `mws-unified` | `hub-fe-prod` on `mws-unified-prod` |

## Environment

Komodo supplies these to the stack as one root `.env` file (Env File Path:
`.env`, Run Directory left blank so it lands next to the compose file). The
Compose services read that same root `.env` via `env_file:` - that's why
`GOOGLE_CLIENT_ID` only needs to be set once even though both backend and
frontend use it. Local runs may still use `backend/.env`. The frontend needs
almost nothing beyond that, because its own config is written into `env.js`
when the container starts rather than baked into the bundle.

### Backend variables

```
NODE_ENV=production
PORT=4001

FRONTEND_ORIGIN=<temporary Komodo app URL>   # later: https://hub-stg.mws.web.id

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=postmessage
ALLOWED_DOMAIN=millennia21.id

CENTRAL_API_BASE_URL=https://db.mws.web.id/api/internal
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
HUB_PUBLIC_URL=                              # later: https://hub-stg.mws.web.id
```

`HUB_PUBLIC_URL` sets nginx's `server_name`. Leave it empty while using
Komodo's temporary host; set it once staging DNS exists.

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
   both `https://hub-stg.mws.web.id` and `https://hub.millenniaws.sch.id` as
   authorised JavaScript origins on
   Hub's own OAuth client. Leave `GOOGLE_REDIRECT_URI` as the literal
   `postmessage` - that is what Google's token endpoint expects for the popup
   code flow, not a URL.

## Verifying a deploy

```bash
curl -s https://hub-stg.mws.web.id/.well-known/jwks.json | head -c 120
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
