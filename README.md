# mysky-frontend

Next.js frontend for mysky, an internal scheduling and order-tracking system built for a stretch ceiling installation business. It's the day-to-day tool office staff use to quote jobs, book crews onto the calendar, and for crews to see what's on their schedule.

## Features

- **Bilingual UI** (English / Georgian) with a shared translations layer
- **Login** by email or phone, JWT-based session handled via server-side route handlers
- **Order form** with live cost & time estimation as line items are added: multiple materials, lighting fixtures, add-ons, optional granite pricing, manual or auto order numbers, and an optional custom-price override for negotiated quotes
- **Calendar** with day/week/month views, drag-to-create orders, and per-day crew availability with a full free-crew list on hover
- **Orders list** with search (client, phone, address, order #) and filtering by team/status/date range, plus CSV/XLSX export
- **Admin configuration pages** for materials, fixtures, add-ons, workers, teams, and the company/team work schedule
- **Role-aware UI**: workers get a scoped dashboard and calendar showing only their own team's jobs, admins get full management access
- Deployed on Fly.io, configured to stay warm (no cold starts) for the client

## Stack

- Next.js 16 (App Router) + Turbopack
- React 19, TypeScript 5
- Tailwind CSS 4
- ESLint 9

## Running locally

```sh
cp .env.example .env.local   # if you haven't already
npm install
npm run dev
```

App listens on `http://localhost:4000`. It expects the backend on the URL set by `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8089`).

## Environment variables

| Variable                    | Default                 | Notes                            |
|-----------------------------|-------------------------|----------------------------------|
| `NEXT_PUBLIC_API_BASE_URL`  | `http://localhost:8089` | Backend root URL                 |

## Scripts

| Script         | Purpose                       |
|----------------|-------------------------------|
| `npm run dev`  | Start dev server (Turbopack)  |
| `npm run build`| Production build              |
| `npm start`    | Run production build          |
| `npm run lint` | Lint with ESLint              |
