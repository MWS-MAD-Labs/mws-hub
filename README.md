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
- [x] Token-relay SSO handoff into Daily Check-in - `GET /apps/:appId/launch`
      mints a short-lived, single-use, audience-scoped relay token
      (`HUB_SSO_SECRET`, separate from every other secret in either app) and
      redirects into Daily Check-in's own `/auth/sso` exchange endpoint.
      MTSS still opens as a plain link - not wired up yet.

## Local development

Both frontend and backend need a Google OAuth Client ID/Secret specific to
Hub - do not reuse Daily Check-in's (its client was deleted from Google Cloud
Console). Create one with an authorized JS origin of `http://localhost:5175`,
then set `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in `backend/.env` and
`VITE_GOOGLE_CLIENT_ID` in `frontend/.env` to the same client. Leave
`GOOGLE_REDIRECT_URI="postmessage"` in the backend as-is - that's the fixed
value Google's token endpoint expects for the popup code flow, not the app's
actual URL (see mws-data-center's `server/.env` for the same setup).

Backend:

```bash
cd backend
bun install
cp .env.example .env   # fill in GOOGLE_CLIENT_ID/SECRET for a Hub-specific OAuth client
bun run dev
```

Serves at `http://localhost:4001`. Needs Central's server running and reachable
at `CENTRAL_API_BASE_URL` (local dev: `http://localhost:3010/api/internal`),
and a `CENTRAL_API_TOKEN` issued by `mws-data-center/server/scripts/bootstrap-hub-api-client.ts`.

Routes:
- `POST /auth/google` - body `{ code }` from the frontend's Google popup-code
  flow, resolves the signed-in Google account against Central's employee/student
  lookup, sets an httpOnly session cookie, returns the resolved user.
- `GET /auth/me` - current session's user, 401 if not signed in.
- `POST /auth/logout` - clears the session cookie.
- `GET /apps/:appId/launch` - session-protected. Mints a relay token for the
  current user and 302s into that app's SSO exchange endpoint (see
  `src/lib/sso-relay.ts`'s `SSO_APPS` registry). Needs `HUB_SSO_SECRET` and
  `DAILY_CHECKIN_API_URL` set.

Frontend:

```bash
cd frontend
bun install
cp .env.example .env   # fill in VITE_GOOGLE_CLIENT_ID
bun run dev
```

Serves at `http://localhost:5175/support-hub`. `/support-hub` and `/profile`
redirect to `/login` if there's no session; `authApi`/`AuthContext` live under
`frontend/src/features/auth/`.

The application catalog is still static (`frontend/src/data/hubApplications.js`).
