# ttyarcade

A browser arcade with 19 text-only games, strict black-and-white monospace terminal styling, solo/local/CPU modes, online rooms, optional accounts and PostgreSQL score history.

## Start here

- **[HANDOVER.md](HANDOVER.md)** — architecture, exact environment variables, Supabase/Neon SQL setup, Vercel/Render/Netlify deployment, detailed fixes and remaining risks.
- **[PUBLISHING.md](PUBLISHING.md)** — ZIP application, validation, commit/push and release steps.
- **[sql/schema.sql](sql/schema.sql)** — run once in a **fresh** PostgreSQL database.
- **[sql/existing-database.sql](sql/existing-database.sql)** — additive upgrade for the original seven-table database, after backup. Do not run both scripts.
- **[audit/FILE_REVIEW.md](audit/FILE_REVIEW.md)** — reviewed-file inventory and validation evidence.

## Local development

Node 22 LTS recommended; PostgreSQL 14+ required for server features.

```bash
npm ci
cp .env.example .env
# Fill DATABASE_URL and CRON_SECRET; initialize database using the SQL Editor
# and sql/schema.sql as described in HANDOVER.md.
npm run dev
```

Open http://localhost:3000. No external image, icon, font or canvas dependency is used. Saved light themes no longer change the terminal background. Input supports arrows/WASD, remapped keys, text buttons and gamepads.

## Commands

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run start
# With a running server and disposable initialized PostgreSQL DB:
npm test
npx playwright install --with-deps chromium
npm run test:browser
npm audit --omit=dev
```

## Release notes

Fixed verified Snake high-level freezes, Crazy Eights deck disclosure/unauthorized start/racing actions, generic-room host and turn controls, 2048 hydration errors, stuck network busy states, unsafe administrator bootstrap and theme switching. Included SQL score logs, environment examples, lockfile and repeatable regression tests.

**Important limitations:** generic gameplay and leaderboard scores remain client-authoritative; this is a friendly arcade, not an anti-cheat service. Five high development-only ESLint dependency-chain advisories remain documented. Production dependency audit was clean at the audit snapshot. Full multiplayer/soak testing and cloud deployment remain owner acceptance tasks. No live domain, GitHub push, or deployment is claimed.
