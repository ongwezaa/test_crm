# Local CRM (monday-inspired)

A local-first CRM inspired by monday.com with a Kanban board and table view. Runs entirely on your machine with SQLite, Express, and React.

## Tech stack

- **API:** Node.js + Express + TypeScript
- **DB:** SQLite (file-based) with automatic migrations (powered by sql.js, no native build tools)
- **Web:** React + Vite + TypeScript
- **Monorepo:** workspaces for `/apps/api`, `/apps/web`, `/packages/shared`

## Quick start

```bash
npm install
npm run db:seed
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:4000

Seeded admin user:

```
email: admin@localcrm.test
password: admin123
```

## Scripts

- `npm run dev` – starts API + web concurrently
- `npm run db:seed` – seeds demo dataset into SQLite

## Data model

Tables are auto-initialized on API boot. See `/apps/api/src/db.ts` for schema and migrations.

## API endpoints

- Auth: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Accounts: `GET/POST/PUT/DELETE /api/accounts`
- Contacts: `GET/POST/PUT/DELETE /api/contacts`
- Stages: `GET/POST/PUT/DELETE /api/stages`
- Deals: `GET/POST/PUT/DELETE /api/deals`
- Deals stage change: `PATCH /api/deals/:id/stage`
- Activities: `GET/POST/PUT/DELETE /api/activities`
- Notes: `GET/POST/DELETE /api/notes`

## Notes

- SQLite database is stored at `/apps/api/data/crm.sqlite`.
- The API uses `sql.js` to avoid native module builds on Windows.
- Drag and drop on the Deals Board updates stage immediately (optimistic UI).
- Deals Table supports inline editing for amount, stage, owner, and close date.
