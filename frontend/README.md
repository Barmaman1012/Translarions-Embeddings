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

For the ingestion UI, set `NEXT_PUBLIC_API_BASE_URL` to the FastAPI server origin, for example:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

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

This frontend is still early-stage, but the `/upload` page now supports:

- real multipart upload requests to the backend upload endpoint
- local preview mode for pasted text when backend file upload is not the right test path

Segmentation and backend-backed paste-text ingestion are not wired yet.
