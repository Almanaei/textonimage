This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Admin QA Commands

Copy `.env.example` to `.env.local` and configure:

- `DATABASE_URL` for analytics DB-backed checks
- `STATS_SECRET` (32+ chars) for `/api/stats` authentication
- For CI/local non-TLS Postgres, set `PGSSLMODE=disable`.

Run admin backend checks:

```bash
npm run db:migrate
npm run qa:track
npm run qa:stats
npm run qa:analytics
npm run qa:admin
```

`qa:analytics` runs both `/api/track` and `/api/stats` integration scripts.
`qa:admin` runs smoke checks for `/api/admin/*` authorization and export flows.

## Agent Automation (Prompt Pack + Gates)

Use local agent/skill profiles from `../agents/ai_agents_skills` with automated dispatch + verification:

```bash
# Pick owner agent from task text and optional changed files
npm run agent:plan -- --task "harden stats auth and migration reliability" --changed "app/api/stats/route.ts,app/scripts/migrate.ts"

# Build an execution pack (prompt + referenced agent/skills)
npm run agent:implement -- --task "stabilize admin analytics contracts"

# Run static quality gate (lint, test, build with fallback STATS_SECRET)
npm run agent:verify

# Run release gate; include analytics check when DB/app env is ready
npm run agent:release-gate -- --analytics
```

Artifacts are written to `app/output/agent-runs/`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
