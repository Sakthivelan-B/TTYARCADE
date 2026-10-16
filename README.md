# TTYARCADE

**70 text-only games: 19 retained + 51 new.** Fixed black/white CRT terminal, Next.js + React + PostgreSQL. Guests play immediately; accounts are optional.

Start with **[HANDOVER.md](HANDOVER.md)** for architecture, environment/database setup, security, room lifecycle, admin, ads, tests and deployment. **[GAMES.md](GAMES.md)** lists every game/mode and all 51 new rule sets. **[PUBLISHING.md](PUBLISHING.md)** explains reviewing, updating GitHub and deploying. **[ADMIN_GUIDE.md](ADMIN_GUIDE.md)** covers host/admin controls.

## This release

- Eight new card games, including **13-card Rummy for 2–10 players**, with pure-run/group validation, optional jokers and scaled decks. No real-money betting.
- Fifteen new online card/strategy/cooperative games; private hands, fleets and clues are filtered by the server. New reducers check moves, turns, declarations and finishing scores.
- Thirty-five other new memory, word, number, logic and knowledge games. Thought-number starts at **1–20** and replaces each membership list. Children’s shuffled A–Z and ascending numbers share one untimed, non-punitive game.
- Search, category/mode/group-size filters and sorting. Instructions stay closed until opened, across old and new games. No home waiting-room block.
- Same-device live matches and named-player puzzle relays, handoff curtains and local match totals. Bounded sizes with ongoing levels/rematches; curated content can repeat.
- Original Memory two-card reveal, Code Breaker fixed-secret/duplicate handling, room passwords, host kick-with-rejoin, optional login/admin, reversible inactivity flags, footer-only ad switches and one active game tab are retained.
- New game departures end the round, **not the room**; the host can invite replacements and start another round. Offline tabs/refresh never surrender seats. New games do not pretend to have CPUs.

**No new SQL needed from the current room-controls/tabs/Code Breaker release.** Older databases must use the correct supplied upgrade path. Never run fresh bootstrap SQL over an existing database.

## Run locally

Node 22, PostgreSQL 14+:

```bash
npm ci
cp .env.example .env
# Set DATABASE_URL and a generated CRON_SECRET. Leave ads off.
# For a NEW, empty database only, with DATABASE_URL exported in this shell:
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/schema.sql
npm run dev
```

Open http://localhost:3000. Next reads `.env`; psql does not load it automatically. For existing databases and exact provider connection strings, follow HANDOVER §§2–3 instead. Never commit private environment files.

## Verify

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:pack
npm run build
npm run start
# In another terminal, with the isolated app running:
npx playwright install --with-deps chromium
npm test
npm run test:browser
npm run test:all-games-browser
npm run test:pack-browser
npm run test:pack-online-browser
npm run test:multiplayer-browser
npm run test:retention-browser
npm run test:tabs-browser
# Mutation suites require explicit disposable-DB settings (HANDOVER §8):
npm run test:pack-api
npm run test:multiplayer-api
npm run test:upgrade
npm run test:access
npm run test:access-browser
npm audit --omit=dev
```

Regenerate the full game guide with `npm run docs:games`. Current evidence: `audit/expansion/`.

## Delivery / limits

Final repository: **TTYARCADE-70-games.zip**, not any earlier release ZIP. Compared against upstream `83e5309f09e5aceeec802603579ba3c435e449d0`; no push or cloud deployment performed. ZIP excludes secrets, `.git`, dependencies, generated output, test database contents and historical duplicate audit folders.

Ordinary solo scores remain client-submitted, not anti-cheat attestations. Polling is not a zero-lag guarantee. Fixed-size boards and finite curated banks mean repeat patterns/content are possible. No IQ/health benefit, mathematical infinity, real gamepad/mobile hardware certification or exhaustive load/soak testing is claimed. Runtime dependency audit is clean at the recorded snapshot; five high development-only ESLint-chain advisories remain. Live external ads can contain color; default-off/placeholder preserves strict monochrome.
