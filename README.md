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
- [ ] Backend (Hub's own Google Workspace login, session, central-DB role lookup)
- [ ] Central DB `/api/internal` integration (needs a `user-lookup` endpoint - not built yet)
- [ ] Token-relay SSO handoff into satellite apps (Daily Check-in, MTSS, ...)

## Local development

```bash
cd frontend
bun install
bun run dev
```

Serves at `http://localhost:5175/support-hub`.

The application catalog is still static (`frontend/src/data/hubApplications.js`).
The signed-in user is a mock placeholder (`frontend/src/pages/hub/SupportHubPage.jsx`)
until the real login flow exists.
