# mysky-frontend

Next.js frontend for mysky — internal order tracking for a stretch ceiling installation business.

## Stack

- Next.js 16 (App Router) + Turbopack
- React 19, TypeScript 5
- Tailwind CSS 4
- ESLint 9

## Folder structure

```
src/
├── app/         // App Router pages and route handlers
├── components/  // reusable UI components
├── lib/         // api client, utility functions
├── hooks/       // custom React hooks
└── types/       // TypeScript interfaces mirroring backend DTOs
```

## Running locally

```sh
cp .env.example .env.local   # if you haven't already
npm install
npm run dev
```

App listens on `http://localhost:3000`. It expects the backend on the URL set by `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8081`).

## Environment variables

| Variable                    | Default                 | Notes                            |
|-----------------------------|-------------------------|----------------------------------|
| `NEXT_PUBLIC_API_BASE_URL`  | `http://localhost:8081` | Backend root URL                 |

## Scripts

| Script         | Purpose                       |
|----------------|-------------------------------|
| `npm run dev`  | Start dev server (Turbopack)  |
| `npm run build`| Production build              |
| `npm start`    | Run production build          |
| `npm run lint` | Lint with ESLint              |
