# TTYARCADE

19 text/ASCII browser games in a fixed black/white CRT terminal. Next.js + React + PostgreSQL. Guests play immediately; accounts are optional.

**Start with [HANDOVER.md](HANDOVER.md)** for architecture, exact environment values, SQL setup/upgrades, provider connection strings, AdSense/CMP, room lifecycle, seven-day inactivity flags, testing and Vercel/Render deployment. **[PUBLISHING.md](PUBLISHING.md)** covers the clean ZIP, review/commit/push and rollback.

## This upgrade

- Fixes online Memory's invisible second card with server-validated flips and a shared 1800ms reveal phase.
- Server-validates all five generic online games; serialized commands, stale-version rejection, canonical results/scores, race challenge/deadline checks. Crazy Eights retains private hands/server rules.
- Rooms persist through refresh, offline tabs and inactivity. Delete only on last human's explicit leave or host close; offline human seats are reserved, not auto-converted to CPUs.
- Seven-day inactivity is a **reversible account flag**, not deletion or significant storage reclamation.
- Optional env-configured footer-only advertising: default off, monochrome no-network placeholder, consent-gated live AdSense bridge with DB kill switches. No game-page ads or visual theme changes.
- Repairs race input/timers, Minesweeper's initial grid, Lights Out reset and other gameplay edges. Retains previous Snake/2048/CPU/security fixes.

## Local setup

Node 22 LTS recommended, PostgreSQL 14+ for server features.

```bash
npm ci
cp .env.example .env
# Fill DATABASE_URL and generated CRON_SECRET; ads default off.
# Run the correct SQL script BEFORE starting (HANDOVER §3).
npm run dev
```

Open http://localhost:3000. New DB: `sql/schema.sql`. **Previous audited DB: `sql/upgrade-retention-ads.sql`**. Other starting schemas have separate paths; don't run bootstrap against an existing DB. Never commit `.env`.

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run start
# Running isolated server/database + installed Playwright Chromium:
npm test
npm run test:browser
npm run test:all-games-browser
npm run test:retention-browser
npm run test:multiplayer-browser
# Requires explicit disposable DB opt-in, detailed in HANDOVER:
npm run test:upgrade
npm run test:multiplayer-api
npm audit --omit=dev
```

## Verified scope / limits

Build/lint/types, 8 unit tests, 4 baseline API tests, 4 retention tests, 6 expanded multiplayer tests, 26-route suite, playable paths across all 19 games and complete two-browser generic rounds passed. Full Crazy Eights API game verifies card conservation. Evidence: `audit/upgrade/`; scope/limits: HANDOVER §8.

Runtime audit: zero vulnerabilities at snapshot; five high development-only ESLint-chain advisories remain. Public solo scores remain client-submitted; visible Memory patterns/Math answers and client CPU strategy mean **not anti-cheat**. Polling is not a zero-lag guarantee. No real cloud deployment, CMP certification, AdSense approval, mobile/gamepad hardware certification or long-term soak is claimed. Live external ad creatives can have color; off/placeholder keeps strict monochrome.

New archive: **TTYARCADE-upgraded.zip**. The previous TTYARCADE-final.zip is an older release.
