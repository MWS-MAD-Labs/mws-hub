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

The application catalog lives in Hub's database and is managed through the
admin routes.
