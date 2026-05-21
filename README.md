# Krydix Platform

Multilingual B2C marketplace MVP.

## Stack

- **Frontend**: React + MUI + Zustand + Apollo Client
- **Backend**: Node.js + Express + GraphQL + Prisma
- **Database**: PostgreSQL
- **Testing**: Jest + Cypress

## Monorepo structure

```
krydix-platform/
├── frontend/     # React SPA
├── backend/      # Node.js + Express + GraphQL
├── e2e/          # Cypress E2E tests
└── package.json  # npm workspaces root
```

## Development

```bash
cp .env.example .env
# fill in .env values
npm install
npm run dev
```

## Branching

- `main` — production-stable
- `develop` — integration branch (all PRs target here)
- `feature/<issue>-name` — feature branches
- `fix/<issue>-name` — bug fix branches
