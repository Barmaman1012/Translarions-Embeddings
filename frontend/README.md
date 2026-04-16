# Frontend

Next.js frontend for the translation embedding research project. This app currently provides a minimal UI skeleton with placeholder pages for the main workflows: overview, projects, upload, and exploration.

## Stack

- Next.js with App Router
- TypeScript
- ESLint
- `src/`-based project structure

## Environment

Copy `.env.example` to `.env.local` and adjust values as needed:

```bash
cp .env.example .env.local
```

Current variables are placeholders only. The app does not connect to the backend yet.

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open `http://localhost:3000`

## Available Scripts

- `npm run dev` starts the local development server
- `npm run build` builds the production bundle
- `npm run start` runs the built app
- `npm run lint` runs ESLint

## Current Scope

This frontend is intentionally limited to infrastructure and UI scaffolding. It uses mock data and does not yet call backend or Supabase services.
