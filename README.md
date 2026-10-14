# MWS Hub

Standalone MWS application launcher, extracted from `mws-daily-checkin`'s
`/support-hub` page. See `mws-daily-checkin/LetsTalk.md` and `supporthub.md`
for the original design brief and requirements.

Frontend is TypeScript (Vite + React 18 + Tailwind v4), matching the
conventions from [ticketing-school](https://github.com/Rhzslya/ticketing-school)
(`pages/`, `features/fragments/`, `model/`, `lib/`, path alias `@/*`, strict
`tsc -b` on build).

## Status

- [x] Frontend extracted, running standalone (`frontend/`)
- [x] Backend (Google sign-in, session cookie, Central-DB identity lookup)
- [x] Central DB `/api/internal` integration - calls the existing
      `/employees/lookup` and `/students/lookup` endpoints directly (employee
      checked first, student on 404), no new endpoint needed on Central's side
- [x] Frontend wired to the real `/auth/me` - `/login` page with a Google
      sign-in button, `RequireAuth` guard redirects unauthenticated visits to
      `/support-hub`/`/profile` back to `/login`
- [x] Token-relay SSO handoff into satellite apps - `GET /apps/:appId/launch`
      mints a short-lived, audience-scoped RS256 relay token with Hub's private
      key and redirects into the app's own `/auth/sso` exchange endpoint.
      Satellite apps verify with Hub's public key only, so they cannot mint
      forged Hub tokens.

## Running With Docker

Both frontend and backend need a Google OAuth Client ID/Secret specific to
Hub - do not reuse Daily Check-in's (its client was deleted from Google Cloud
Console). Create one with an authorized JS origin of `http://localhost:5175`,
then set `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in `backend/.env`.

Run the whole stack through the single compose file:

```bash
docker compose up -d --build
```

The frontend exposes port 80 on Docker networks and publishes
`127.0.0.1:${FRONTEND_PORT:-8083}` for the gateway/reverse proxy. Backend and
Postgres also publish localhost-only debug/maintenance ports
(`BACKEND_PORT:-4003`, `POSTGRES_PORT:-15436`), while application traffic still
uses Docker's internal network: frontend Nginx reaches backend as
`backend:4001`, and backend reaches Postgres as `db:5432`.

Backend needs Central's server reachable from inside the backend container at
`CENTRAL_API_BASE_URL`, plus a `CENTRAL_API_TOKEN` issued by
`mws-data-center/server/scripts/bootstrap-hub-api-client.ts`.

Routes:
- `POST /auth/google` - body `{ code }` from the frontend's Google popup-code
  flow, resolves the signed-in Google account against Central's employee/student
  lookup, sets an httpOnly session cookie, returns the resolved user.
- `GET /auth/me` - current session's user, 401 if not signed in.
- `POST /auth/logout` - clears the session cookie.
- `GET /.well-known/jwks.json` - public RS256 verification keys for satellite
  apps. Keys are published with `kid` for rotation.
- `GET /apps/:appId/launch` - session-protected. Re-checks the user against
  Central DB, applies the app catalog policy, then either 302s to a plain app
  URL or mints an RS256 relay token for that app's SSO endpoint. Needs
  `HUB_SSO_PRIVATE_KEY`; each satellite app needs the matching public key for
  verification, not any shared signing secret.
- Apps with `sso_central_entitlement_app_id` also require an active Central
  application entitlement. Missing/inactive entitlements deny launch, and any
  Central error fails closed. The entitlement snapshot is included in the
  relay token for the receiving app.
- `state` is optional on `/apps/:appId/launch`. Valid URL-safe state survives
  Google login, is bound to the one-time code, is appended to the app callback,
  and must be supplied to `/sso/exchange` for state-bound codes.
- Signing in to Hub itself can require an active access to the `hub` application
  in Central's Application Access. `HUB_CENTRAL_ACCESS_MODE` is `off` (default,
  not checked), `warn` (checked and logged, nobody turned away) or `enforce`
  (turned away without access, signed out within 5 minutes when it is taken
  away). `HUB_CENTRAL_ACCESS_APP_ID` changes the application (default `hub`).
  `HUB_CENTRAL_ACCESS_BYPASS_EMAILS` lists accounts that always get in. Roll out
  as `warn`, read the `hub.login_would_deny` audit entries until nobody is left
  out, then switch to `enforce`. Only turn it on where Central has Application
  Access groups for `hub`, otherwise everyone is turned away.
- With the gate on, Admin Dashboard access comes from the `hub.admin` permission
  on the person's Hub role in Central. `HUB_ADMIN_FALLBACK` defaults to
  `mad-labs`, which keeps MAD Labs members as admins too. Set it to `off` once
  the Central role carries `hub.admin` for every admin.
- App cards for apps with a `centralEntitlementAppId` are left out for people
  Central gives no access to. In `enforce`, apps without it are left out too
  (and cannot be launched), so link an app to Central before anyone can open it.
  In `off` and `warn` they follow Hub's own rules.
- Signing in also needs the `hub.use` permission on the person's role. An active access whose role does not carry it is turned away (`hub_use_missing`), or only logged as `hub.login_would_deny` in `warn`. Add `hub.use` to every Hub role in Central before `enforce`.
- How fresh things are: access and role for the sign-in gate, admin and gated cards
  are at most `HUB_CENTRAL_ACCESS_CACHE_SECONDS` (30) old. The copy of the person in
  the session (name, unit, position, level) is asked of Central again once it is
  `HUB_IDENTITY_REFRESH_MINUTES` (10, `0` turns it off) old, on the next request, and
  the session keeps its version and end time. If Central cannot be reached the
  old copy stays, and someone Central no longer lists as active is signed out.
  Daily Check-in polls rosters every 2 minutes and class assignments every 15.
- Only active access is cached. `HUB_CENTRAL_ACCESS_CACHE_SECONDS` (default 30)
  is how long it can take for taking access away to show for someone signed in.
  Giving access shows at the next sign-in. Open tabs re-check once a minute.
- Hub sends the permissions its code understands to Central on every deploy, and
  the pipeline enforces it. In `.github/workflows/ci-cd.yml` the jobs
  `sync-permissions-staging` and `sync-permissions-production` run `bun run
  scripts/sync-permissions.ts sync --retries 5 --wait 20` with the secrets
  `CENTRAL_API_BASE_URL` and `CENTRAL_API_TOKEN` (or the `_STAGING` / `_PRODUCTION`
  variants); the Komodo deploy job needs them. If Central cannot be reached after the
  retries, does not have the endpoints yet ("deploy Central first"), refuses the list
  (it would drop a permission roles still carry), or the secrets are missing, the
  pipeline fails, the webhook is not called and the running version stays. Removals
  are never confirmed from CI: run `bun run permissions:sync -- --confirm-removals`
  by hand when a send drops most of the list. Deploy Central first, then Hub.
- While running, Hub compares its list with Central when it starts and sends it only
  if they differ; if Central is down or not deployed yet it asks again every minute
  until it is there (`HUB_PERMISSION_SYNC=off` turns this off). A no from Central is
  logged as `[permissions]` and not repeated. `bun run permissions:check` changes
  nothing and exits 1 when Central and the code disagree. The list lives in
  `backend/src/lib/hub-permissions.ts`. The token needs the
  `application_permissions:write` scope and the `hub` integration profile. A
  permission is dropped in two releases: move the roles off it in Central first,
  then remove it from the list.
- Taking away Hub access also ends the person's sessions in the apps opened
  through Hub (once). Taking away access to one app only hides it and refuses
  Launch; Hub and the other apps are untouched. An app's Central id must match
  the application id in Central exactly. The admin screen checks it against Central
  on save (Central needs the `/application-entitlements/applications` endpoint) and
  refuses an unknown id.
- In development the frontend dev server (5175) forwards `/auth`, `/apps`, `/sso`, `/admin/api`,
  `/admin/dashboard-data` and `/.well-known` to the backend (4001), so an app can use
  `HUB_BASE_URL=http://localhost:5175` for both the launch and the code exchange. After signing in,
  a launch (`/apps/...`) continues with a full page load, not inside the single page app.
- Set `SSO_CODE_STORE=postgres` for a shared, multi-instance one-time-code
  store (recommended in production). `memory` remains the default for local
  development and tests.

The applications come from Central: name, icon, address, category, scope, who may open them, and how the card looks (status and keywords) are all changed there (Application Access). The Hub has no catalog editor. Older rows in `applications` that Central does not cover keep being served, and the dashboard lists them as "Older entries" so each can be added in Central as a link application and then removed with `bun run prune:catalog`.

The admin area is three pages. **Dashboard** (`GET /admin/api/overview`) shows the health of the Hub (Central answers, the Hub secret and sign-in key are there, every published application answers), launch activity from the audit trail (per application, with refused launches and why) and open reports. **Broken Tools** is the queue of problems people reported from a card. **Audit Logs** can be filtered by action, date and any word (an application id or a person's email).

## Secret between the Hub and an application

`HUB_INTERNAL_SECRET` in the Hub's `.env` is the master. Applications call the Hub (exchanging an SSO code) and the Hub calls them (ending a session) with a secret in the `X-Hub-Internal-Secret` header.

An application can have a secret of its own, made from the master and its id: `v{version}.` followed by the HMAC-SHA256 of `app:{id}:{version}` with the master as key. Central puts it in the application's `.env` as `HUB_INTERNAL_SECRET`, and the Hub makes it again to check it, so a secret that leaks only opens that application. After a rotation in Central the old version is refused.

The master itself is accepted from every application until `HUB_ALLOW_SHARED_SECRET=false` is set in the Hub's `.env`. Set that once every application has its own secret. Deploy the Hub before Central, since Central starts giving new applications secrets of their own.

## Shared session for apps on the parent domain

Besides its own `hub_session`, the Hub signs a person in to every app on the same parent domain with two cookies.

| Cookie | What it is | Where it goes |
|---|---|---|
| `hub_at` | Access token. RS256, 5 minutes, says who the person is (`sub`, email, source, tags, `sid`). Apps verify it against `/.well-known/jwks.json`. | Parent domain (`HUB_COOKIE_DOMAIN`), `HttpOnly`, `Secure`, `SameSite=Lax` |
| `hub_rt` | Refresh token. Opaque, 8 hours from sign-in, turns over on every use. Only the Hub can use it. | The Hub's own host, path `/auth`, `HttpOnly`, `Secure`, `SameSite=Strict` |

An app's page calls `POST /auth/refresh` (with cookies and an `X-Requested-With` header) shortly before the access token ends. The Hub asks Central whether the person is still active, issues a new access token and a new refresh token, and keeps the old one for 10 seconds so two tabs refreshing together do not fight. An old refresh token shown again after that revokes the whole session. A page that arrives with no access token (it ended while nobody was looking) sends the browser to `GET /auth/restore?return=<app url>`. With a valid refresh token the Hub sets new cookies and sends the person back (adding `restored=1`); otherwise it shows its front page. A person who is signed in to the Hub but has no refresh token yet (they signed in before this existed) gets the shared session started from the Hub's own cookie, so nobody has to sign in again after a deploy. `return` must be on the parent domain. Logging out of the Hub (`POST /auth/logout`) revokes it and deletes both cookies, which signs the person out of every app.

| Setting | Default | |
|---|---|---|
| `HUB_SHARED_SESSION_APPS` | empty | Application ids (comma separated, or `*`) whose card opens the app with no code, because the app reads the shared session itself. Every other app keeps the code and relay token flow. |
| `HUB_COOKIE_DOMAIN` | empty | Parent domain, for example `mws.web.id`. Leave empty on localhost. |
| `HUB_ACCESS_TTL_SECONDS` | 300 | |
| `HUB_REFRESH_TTL_SECONDS` | 28800 | |
| `HUB_ACCESS_AUDIENCE` | `mws-apps` | `aud` of the access token |
| `HUB_ACCESS_COOKIE_NAME` / `HUB_REFRESH_COOKIE_NAME` | `hub_at` / `hub_rt` | |
| `HUB_REFRESH_COOKIE_PATH` | `/auth` | Must match where the Hub's `/auth` routes are served |

Run the migration `20261020090000_add_refresh_tokens` before deploying (`bunx prisma migrate deploy`).
