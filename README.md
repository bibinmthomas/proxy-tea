# proxy-tea

A lightweight real-time voting app for deciding where to eat or drink. Create a session, add options, and vote — sessions expire after 30 minutes.

## Stack

- **Next.js 16** (App Router, client components)
- **Firebase Realtime Database** — sessions, items, and votes
- **Tailwind CSS v4**
- **TypeScript**

## How it works

- The home page lists active (non-expired) sessions and lets you create a new one
- Each session has a 30-minute TTL — expired sessions are hidden from the list
- Inside a session, anyone can add options and vote; votes are toggled (click again to unvote)
- Voter identity is anonymous and stored in `localStorage` (`proxy_tea_voter_id`)
- All data is stored under three Firebase paths: `sessions/`, `items/<sessionId>/`, `votes/<sessionId>/`

## Project structure

```
app/
  page.tsx              # Home — create/list sessions
  session/[id]/page.tsx # Session view — add items, vote
lib/
  firebase.ts           # Firebase app + db init
  voter.ts              # Anonymous voter ID (localStorage)
```

## Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create a `.env.local` file with your Firebase project config:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

3. Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Firebase database rules

Votes and items are keyed by session ID. Make sure your Firebase Realtime Database rules allow read/write for the relevant paths (adjust as needed for production).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
