# TTYARCADE — audited developer handover

Audit date: 15 October 2026. Upstream: https://github.com/Sakthivelan-B/TTYARCADE

**Release status:** buildable, tested deployment candidate for a friendly/hobby arcade. This is not an anti-cheat or high-assurance competitive gaming service. No production account, cloud deployment, or GitHub push was performed. Read the remaining risks below before publishing.

## 1. Overview and architecture

TTYARCADE offers 19 browser games with a text-only terminal interface. Next.js App Router serves React pages and same-origin Node.js API routes. There is no separate backend, static HTML bundle, socket server, canvas renderer, external image library, or external font dependency.

- `src/app/games/<game>/page.tsx`: individual client games.
- `src/components/term.tsx`: terminal shell, text stats, banners and touch direction pad.
- `src/components/multi.tsx`: generic online lobby, seat credentials, presence and polling.
- `src/components/Card.tsx`: text cards (Unicode suit characters, not image assets).
- `src/lib/controls.ts`: remappable arrows/WASD, confirm/flag and gamepad edge detection.
- `src/lib/{2048,snake}.ts`: extracted game rules/generators with unit tests.
- `src/lib/{levels,words,bots,cards,player,storage,clock}.ts`: shared helpers.
- `src/lib/{auth,http,rate-limit}.ts`: asynchronous scrypt authentication, cookies, JSON validation, API failure responses and bounded process-local rate limiting.
- `src/db/{index,schema}.ts`: bounded PostgreSQL pool and Drizzle table definitions.
- `src/app/api/auth/*`: optional accounts; session cookie is `ttyarcade_session`.
- `src/app/api/scores`: score insertion and public score listing.
- `src/app/api/rooms/*`: generic rooms for tic-tac-toe, Connect Four, memory, math and typing.
- `src/app/api/cards/rooms/*`: dedicated server-side Crazy Eights state and private hands.
- `src/app/api/admin/users`: account moderation; administrator authorization required.
- `src/app/api/cron/cleanup`: authenticated housekeeping.
- `src/app/api/health`: database readiness; returns 200 only when PostgreSQL responds, 500 otherwise.
- `sql/`: canonical database initialization/upgrade SQL; `tests/`: regression checks; `audit/`: results and reviewed-file inventory.

The browser polls room state every 1.5 seconds. Generic games still submit client-computed shared state. Crazy Eights actions and room membership mutations use PostgreSQL room-row locks and transactions. Scores are not independently verified gameplay results.

## 2. Stack and requirements

- Next.js 16.4.1, React/React DOM 19.3.1, TypeScript 5.9.3.
- Tailwind CSS 4 (layout utilities), PostCSS 8.5.30, system monospace fonts.
- PostgreSQL 14+ (local audit used PostgreSQL 17); `pg` and Drizzle ORM.
- Node.js **22 LTS recommended** (`.nvmrc`); Next's technical minimum is Node 20.9. Audit execution used the supplied Node 20.20.2 runtime. Node 22 is the deployment target, not a separately tested runtime here.
- npm, Git; optional PostgreSQL CLI/Docker and Playwright Chromium for tests.

Use `npm ci`, not an unpinned dependency resolution. `package-lock.json` is included.

## 3. Exact environment variables

| Name | Required | Value and source |
|---|---|---|
| `DATABASE_URL` | Yes for accounts, rooms, scores, health | Full PostgreSQL connection URI, including database, role, password and TLS parameters. See provider instructions below. Server-only; never prefix with `NEXT_PUBLIC_`. |
| `CRON_SECRET` | Yes if cleanup is enabled | Generate locally with `openssl rand -hex 32`; put the same value in deployment environment and scheduler Authorization header. It is not supplied by the DB provider. |
| `PORT` | Local/Render server only | Default `3000`; Render supplies its own port. Vercel/Netlify manage ports; omit there. |
| `NODE_ENV` | Managed by commands/host | `development` for dev, `production` for build/start. Do not set development on a public deployment. Production sessions use Secure cookies and require HTTPS. |
| `TEST_BASE_URL` | Tests only | URL of the running test server; defaults to `http://127.0.0.1:3000`. Never run mutation tests against a real production database. |

`ADMIN_USERNAMES` is **removed and ignored**. It was unsafe to authorize administrators merely by a publicly claimable username. There is no first-user-is-admin fallback. No Supabase anon/service API key, Neon API key, AUTH_SECRET or NEXT_PUBLIC variable is required.

### Provider dashboard: where to copy DATABASE_URL

**Neon:** open your project → **Connect** → select the production branch, database and role → choose **Connection string / Node.js**. Enable **Pooled connection** for serverless hosting, then copy the complete `postgresql://...` URI including its `-pooler` host and TLS query parameters. Use a direct connection for maintenance if a provider operation requires it. Do not copy a `psql` shell command as the value.

**Supabase:** open the project → **Connect** dialog → **Connection string**. Choose **Transaction pooler** for serverless hosts or **Session pooler** for a persistent Node service; copy the PostgreSQL URI. Replace `[YOUR-PASSWORD]` with the database password chosen during project creation (reset it in Database settings if lost). Use the pooler's exact role, host and port, not guessed values. A direct URI may need IPv6 access; the pooler is useful on IPv4-only hosts. Preserve provider TLS options; do not disable certificate verification. The Project URL and anon API key are NOT DATABASE_URL.

Dashboard labels can change. The required value is the provider-generated PostgreSQL connection URI. URL-encode special characters in manually substituted passwords, and never paste credentials into source, screenshots, Git commits or support tickets.

### Local setup

```bash
nvm install
nvm use
npm ci
cp .env.example .env
# Edit .env with your actual DATABASE_URL and generated CRON_SECRET.
# Do not commit .env. Next and drizzle.config.ts both load root .env.
npm run dev
```

Example **local-only** Docker database:

```bash
docker run -d --name ttyarcade-db \
  -e POSTGRES_PASSWORD=local-only-change-me \
  -e POSTGRES_DB=ttyarcade -p 5432:5432 postgres:17
# .env: DATABASE_URL=postgresql://postgres:local-only-change-me@127.0.0.1:5432/ttyarcade
```

A build can run without DATABASE_URL; live database-backed functionality cannot. Pool connections time out after five seconds and idle errors no longer terminate the process. The per-instance pool max is five; size host instance counts against your database connection budget.

## 4. Ready-to-run SQL and setup

### New database

1. Create a PostgreSQL database/project.
2. Open **Supabase → SQL Editor → New query** or **Neon → SQL Editor**, selecting the correct database/branch.
3. Paste **the entire contents of `sql/schema.sql`** and run once as the database owner.
4. Alternatively use a CLI connection URI in a shell variable:

```bash
# Set DATABASE_URL securely in this shell; a root .env file is not automatically
# sourced by psql. Avoid putting secrets directly in shell history.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/schema.sql
```

This is a transactional **fresh-database bootstrap**, not an idempotent migration. Re-running it on initialized tables intentionally fails rather than concealing schema differences.

### Existing original repository database

Back up with `pg_dump`, make a test branch/restore and confirm the original seven tables match `src/db/schema.ts`. Run **`sql/existing-database.sql` once**, not the fresh bootstrap. This adds logs, indexes, reporting and access restrictions without recreating existing tables. It does not backfill older scores into logs. For any other existing schema, review/migrate the differences manually first. The two SQL files are alternatives, not sequential steps.

### Schema

| Object | Purpose |
|---|---|
| `users` | Unique username and lowercase key, password salt/hash, admin/block flags, registration/login timestamps. |
| `sessions` | User foreign key, random session token, creation/expiration. User deletion cascades sessions. |
| `game_scores` | Account or guest display name, game ID, integer score, JSON metadata, timestamp. Account deletion detaches attribution. |
| `rooms`, `room_players` | Generic shared JSON game state, host/turn/round, authenticated seat capability tokens, scores and presence. |
| `card_rooms`, `card_players` | Crazy Eights deck/discard, private hands, seat tokens and timestamps. |
| `game_logs` | Append-only-by-convention score-submission history, names, game, optional account/score, JSON details and timestamp. |
| `player_high_scores` | Reporting view: max score, count of score submissions and latest timestamp per account/name/game. |
| `game_score_log` | Trigger logs every inserted score in the same DB transaction. It is not a log of every game move or failed request. |

Foreign keys preserve other players when accounts/rooms are removed. Timestamp columns match the existing app's `timestamp` fields; keep the database session timezone UTC and interpret stored values as UTC. Guest names are not unique identities. `plays` means accepted score submissions, not every game start.

RLS is enabled without browser policies, and Supabase `anon`/`authenticated` access is revoked for these tables/view. **Connect the backend as table owner or a deliberately configured trusted BYPASSRLS role.** A normal non-owner application role needs explicit grants and policies; otherwise queries will be denied. This app never queries Supabase tables directly from a browser. Do not grant public access to salts, hashes, sessions, decks or seat tokens.

The ORM tracks tables; SQL owns the trigger, reporting view, indexes and security. Do **not** use `drizzle-kit push` as a replacement for these SQL files: it does not install all of those objects. `drizzle.config.ts` now reads DATABASE_URL, not a committed local credential. Generated migration intermediates are excluded; deploy using the reviewed SQL files.

### Administrator promotion

Register your own account, then run from the provider SQL editor:

```sql
UPDATE users SET is_admin = true WHERE username_key = 'your_registered_username';
SELECT username, is_admin FROM users WHERE username_key = 'your_registered_username';
```

Verify exactly the intended row before promotion. The app rechecks authorization from the DB on each request; logout/login is optional. Admins cannot block or delete their own account through the API.

### Housekeeping, backups and retention

`GET /api/cron/cleanup` requires `Authorization: Bearer <CRON_SECRET>`. It deletes rooms idle for six hours (cascading seats) and expired sessions. It does **not** delete score history or logs. Schedule daily; existing `vercel.json` uses `0 4 * * *` (UTC). Test manually:

```bash
curl --fail -H "Authorization: Bearer $CRON_SECRET" https://YOUR-HOST/api/cron/cleanup
```

Choose a privacy/retention policy. For example, after approval: `DELETE FROM game_logs WHERE created_at < now() - interval '90 days';`. Logs contain display names even after account deletion and are not erased by wipe-scores; change this if your privacy policy requires full erasure. Enable provider backups and test restores before release.

## 5. Production deployment

This project requires a **Next.js Node/serverless runtime**, not a static export. Use the committed lockfile, HTTPS, environment secrets and a network-reachable PostgreSQL database. SQL initialization is a separate deliberate step, never part of every build.

### Vercel (recommended)

1. Complete SQL setup, commit/push your reviewed branch and merge to your deployment branch.
2. Dashboard → Add New → Project → import `Sakthivelan-B/TTYARCADE`. Framework: Next.js; root: repository root.
3. Node version: 22.x. Install: `npm ci`; build: `npm run build`; output: framework default. Do not set `out` or a static publish folder.
4. Settings → Environment Variables: add DATABASE_URL (pooled provider URL) and CRON_SECRET. Set production and, only if appropriate, preview/development values. Use an isolated DB branch for previews.
5. Deploy/redeploy after adding variables. Vercel supplies production mode/ports. The committed cron configuration calls the cleanup endpoint; confirm cron availability and current plan limits in the dashboard.
6. Visit `/api/health`, register, promote only your account via SQL, submit a score and test two-browser room play. Confirm unauthorized cleanup returns 401 and authorized cleanup returns 200.
7. Attach your domain in Settings → Domains and apply the displayed DNS records; wait for HTTPS before account testing.

### Render

1. New → Web Service → connect the repository; runtime Node; branch/root as appropriate.
2. Node 22.x (set host `NODE_VERSION=22` if needed; this is a **Render platform setting**, not an application variable).
3. Build command: `npm ci && npm run build`.
4. Start command: `npm run start -- --hostname 0.0.0.0 --port $PORT`.
5. Add DATABASE_URL and CRON_SECRET in Environment. Render supplies PORT; production mode must be enabled. Database and app regions should be close. Private Render DB URLs work only for services on the permitted internal network; use an external URI for local tools.
6. Health check path: `/api/health`. Deploy and follow the acceptance checklist above. Plan sleep/cold-start behavior may delay polling.
7. Configure a Render Cron Job (where supported) or an external scheduler to call cleanup with the Bearer header; `vercel.json` does nothing on Render.

### Netlify

1. Add new project → import repository; choose Next.js detection and the current supported Next.js/OpenNext adapter. Node 22.x.
2. Install with npm/lockfile; build command `npm run build`. Keep the framework adapter's detected output configuration (normally `.next`), **not** a plain static folder. Do not use `next export`.
3. Project configuration → Environment Variables: DATABASE_URL and CRON_SECRET for server/function runtime and appropriate deploy contexts; redeploy.
4. Verify App Router API routes, cookies and PostgreSQL networking work on the selected adapter with Next 16.4.1. This host integration was not tested here; if the adapter does not support this version, use Vercel/Render rather than silently downgrading security patches.
5. Schedule cleanup externally with its Authorization header; Vercel's cron config is not applied. Complete the same acceptance checklist.

Host dashboards/plan limits and adapter support change. The commands above describe required configuration, not evidence of a completed cloud deployment. Do not put server secrets into build-time public JavaScript.

## 6. Verification and results

Audit artifacts in `audit/` record the actual local checks:

- `npm run lint`: passes, zero warnings. Only `react-hooks/set-state-in-effect` is intentionally disabled in the ESLint configuration for browser-preference hydration/subscription initialization; other hook, refs and purity checks remain enabled. React Compiler is not enabled. This is disclosed, not presented as a wholesale refactor of all effects.
- `npm run typecheck`: passes.
- `npm run build`: passes; all game routes and backend handlers compile.
- `npm run test:unit`: four suites covering 2048 merge behavior, Snake bounded high-level generation/full-board food corrupt preferences and secure card token/encoding helpers.
- `npm test`: four live API suites against a disposable PostgreSQL-backed production server: JSON validation, account attribution, host/turn restrictions, concurrency/capacity, reconnect, hidden-card protection and concurrent draw rejection.
- `npm run test:browser`: Chromium checks 26 page routes, internal navigation links, pure-black/white body colors, absence of image/canvas/SVG/video elements, legacy light-theme override, Snake/2048/Pong input and sequence navigation. No browser page errors in the final successful run.
- SQL bootstrap, trigger logging, account-delete FK behavior and 104-card conservation checked locally; SQL output is included.
- `npm audit --omit=dev`: **zero reported production vulnerabilities at audit time**. This is a registry snapshot, not a guarantee.
- Full `npm audit`: **five high findings in the development-only ESLint/fast-glob/micromatch/braces chain**. The registry currently lists no patched braces release (latest 3.0.3); do not force a downgrade to ESLint Config Next 14 as npm's proposed workaround. Do not expose development tooling to untrusted users, and recheck updates before deploying. An explicit esbuild override removes a separate Drizzle development-server advisory; configuration generation was exercised with it.

To reproduce:

```bash
npm ci
npx playwright install --with-deps chromium
npm run lint
npm run typecheck
npm run test:unit
npm run build
# Terminal 1: with .env pointing ONLY at a disposable initialized DB
npm run start
# Terminal 2:
npm test
npm run test:browser
npm audit --omit=dev
```

API/browser tests create accounts, rooms and scores. Use a disposable database, never production. API tests assume the test server has CRON_SECRET configured when asserting unauthorized cleanup is 401.

The browser run is a smoke/regression check, not full gameplay coverage of every level/multiplayer permutation, a soak test, mobile-device certification, accessibility certification or penetration test. External provider dashboards, actual production TLS, quota behavior and real gamepads were not exercised.

## 7. Detailed changelog

The complete per-file review inventory is `audit/FILE_REVIEW.md`, with source SHA-256 hashes for traceability. Files not listed as changed were reviewed for imports/routes, event/timer lifecycle, database/API interactions and terminal rendering; this does not imply mathematical correctness of every procedural level.

### Backend and security

- All `src/app/api/**/route.ts`: shared error boundary prevents uncaught DB/handler exceptions from exposing error details; controlled 503 JSON responses. Mutation bodies use object-only JSON parsing with a size check and 400/413 responses.
- `src/lib/http.ts` (new): shared request validation and response wrapper.
- `api/auth/register`: removed first-user and username-list admin escalation; 8–128-character passwords; awaited asynchronous hash; recognize wrapped PostgreSQL unique errors for 409 duplicate-name responses.
- `api/auth/login`, `src/lib/auth.ts`: bounded login password input; asynchronous scrypt avoids blocking Node's event loop; existing session-cookie attributes retained.
- `api/admin/users`: prevent self-block/delete, rotate transferred seat tokens, transfer Crazy Eights seats too, retain blocked-account score attribution for filtering and fix delete ordering so score deletion really works.
- `api/scores`: registry validation, numeric-type validation, score-post rate limiting, consistent blocked-user filtering and public projection without internal account IDs.
- `api/rooms/route.ts`: only implemented online games accepted; integer game-specific capacity; room+host insert is atomic.
- `api/rooms/[code]`: serialize mutations under room-row lock; host-only bots/start/rematch; validate start/rematch lifecycle; enforce turns even without optional expectTurn; allow valid full-room reconnect/CPU replacement; compact waiting-room seats after leave; permit takeover-only presence recovery.
- `api/cards/rooms/route.ts`: validate JSON, atomically create room+host, attach logged-in host user ID, correctly decode suit-prefixed cards, avoid initial eight and stop exposing full decks/discards in public room lists.
- `api/cards/rooms/[code]/join`: serialize reconnect/deal/CPU takeover; reconnect in playing/full rooms; preserve seat identity.
- `api/cards/rooms/[code]/start`: validate host token; serialize against concurrent joins/actions.
- `api/cards/rooms/[code]/action`: transaction and row lock make deck, hand and score writes atomic; repeated same-turn requests are rejected; suit choice only allowed when an eight is pending.
- `src/db/index.ts`: remove eager import-time env exception, bounded pool/connect timeout and idle-pool error listener.
- `src/db/schema.ts`: add game_logs definition; SQL provides logging trigger, indexes/view and RLS/revocations.
- `src/lib/rate-limit.ts`: hard bound on per-process IP counter map.
- `next.config.ts`: nosniff, same-origin referrer and same-origin frame headers.

### Input, rendering and lifecycle

- `src/lib/controls.ts`: validate corrupt saved bindings, normalize legacy Space labels, ignore editable/select targets and modifier shortcuts, avoid repeated confirm actions, reset gamepad edges on hidden/disconnected state; callback refs synchronize in effects.
- `src/lib/storage.ts` (new), all browser preference/room-token consumers: guarded localStorage with in-memory fallback. Storage-denied browsers no longer crash on ordinary reads/writes.
- `src/lib/levels.ts`: tolerate non-array corrupt history, bound retained hashes; correct the misleading never-repeat guarantee (it is best-effort).
- `games/snake` + `src/lib/snake.ts`: bounded sampled walls instead of impossible high-level rejection loop; finite free-cell food selection; stable single queued non-reverse turn per tick; consume the turn outside a replayable state updater.
- `games/2048` + `src/lib/2048.ts`: deterministic server/client initial markup and browser initialization fix observed React hydration errors; move side effects out of nested functional state updater; tested extracted merge rules.
- `games/pong`: render immutable snapshots instead of reading simulation refs during render; release held touch controls on cancel, blur and visibility changes; reset held inputs on restart.
- `games/sequence`: ignore repeat/editable-key input; track delayed callbacks and check cancellation around playback waits.
- `games/tictactoe`, `games/connect4`: prevent human input during local CPU turns; correct online CPU expectTurn/next-turn values so bots can move. Only these generic games offer CPU seats; memory/math/typing require real players rather than adding inert CPU seats. Remove circular Connect Four cell styling.
- `src/lib/cards.ts`: use cryptographically random 24-byte seat tokens and consistently decode two-digit ranks/suit prefixes.
- `games/connect4`: stop global number keys from intercepting text editing/OS shortcuts or auto-repeat.
- `games/codebreaker`: ignore held Enter/shortcut/button duplicate submissions; escape JSX quotes.
- `games/minesweeper`: prevent repeated mine clicks during delayed reset and clear reset timeout on unmount.
- `src/lib/clock.ts` (new), `games/math`, `games/typing`: render-safe sampled clock; race countdown updates independently of room polling; typing elapsed display derives from timer state.
- `components/multi`: stable post callback, handled create/join/action failures, avoid overlapping poll requests, clearer CPU labeling.
- `games/crazy8`: catch network failures and always clear busy state; avoid overlapping poll requests.

### Strict terminal theme

- `globals.css`: all theme selectors resolve to #000000 background and #ffffff text, including dim/soft elements; native color-scheme fixed dark; disabled state uses dashed borders rather than gray opacity; visible focus and reduced-motion blink support.
- `layout.tsx`: remove saved light/medium initialization; first paint remains black.
- `components/term.tsx`, `settings/page.tsx`: replace theme switching with fixed terminal label; no light/medium or system auto-switch UI remains; Space remapping stores actual key.
- No image, icon, emoji-art, canvas or webfont asset added. Existing text card suits and block characters remain monospace text. Inverted selected cells/buttons use white background/black glyphs as a terminal selection convention; the overall page always stays pure black.

### Packaging and documentation

- Updated/pinned Next/React/PostCSS and matching Next ESLint config; committed lockfile and esbuild development override.
- Added `.gitignore`, `.env.example`, `.nvmrc`, tests and audit evidence.
- Replaced hardcoded `drizzle.config.json` with environment-driven `drizzle.config.ts`.
- SQL files, this handover, publishing guide, README and patch/clean ZIP supplied.
- ZIP excludes `.git`, credentials, node_modules, build output and local database/test state.

## 8. Remaining risks / next work

1. Generic room state and score values are client-authoritative. Authorization/serialization is improved, but a participant can still cheat by submitting plausible arbitrary state/scores. Do not offer cash prizes or claim anti-cheat. Move each game's rules server-side for that requirement.
2. Process-local rate limits are not shared across serverless instances and trust proxy-forwarded IPs. Deploy provider WAF/rate limits for auth, score writes, room creation and polling. Password hashing uses a worker pool, not unlimited capacity.
3. Polling is not websockets and is not a load/soak-tested concurrency solution. Poll guards avoid overlapping requests, but responses already in flight are not universally aborted on every route change. Browser effect cleanup is present; do not claim a proof of no memory leaks.
4. Generic game payload fields are not all covered by game-specific runtime schemas. The JSON size check happens after reading the request body; use hosting request-size limits/WAF as the hard ingress cap. Known malformed types return controlled errors, not guaranteed game-specific 400s.
5. Generic rooms retain client-driven CPU behavior. Losing a host mid-game, host-seat transitions, stale human turns and per-game rematch edge cases need expanded multiplayer acceptance/soak testing. Crazy Eights has no complete disconnect takeover/rematch workflow.
6. Leaderboard UI aggregates only the top 4,000 stored score rows and cross-game account ranks compare unlike score scales; low-score games can be underrepresented as data grows. Replace with SQL per-game ranking before larger scale. The new SQL reporting view is available but not wired into that UI.
7. Best-effort fresh-pattern history retains 800 hashes and retries 60 times. Repetition and hash collisions remain possible; procedural difficulty is not literally unbounded resource usage safe at arbitrarily large level numbers. Snake's demonstrated high-level freeze is fixed.
8. Five development-only audit findings remain as described above. Run audits again at release time and keep dependencies patched.
9. Some short input-focus timers use optional refs rather than a common cancellation abstraction; no long-duration memory profile was run. Keyboard smoke tests do not certify all mobile/gamepad behavior.
10. Logs and names require a retention/privacy policy. Session/seat tokens are capability credentials; use HTTPS, avoid logging query strings, and rotate credentials if leaked. Blocked people can still visit as guests; account blocking is not an IP/device ban.

## 9. Publishing, rollback and ownership

See `PUBLISHING.md` for exact branch/commit/push commands and clean-ZIP application. Use a pull request and inspect the diff rather than force-pushing. The archive has no `.git` directory; use it as an overlay in a fresh clone. No license was added: confirm the repository owner's licensing decision before redistribution.

Before release: back up DB, review remaining risks, use separate preview credentials, run all tests, promote only your admin, verify health/cron/HTTPS, and exercise two real browser sessions. Roll back code through the hosting provider or `git revert` of the merge commit; database schema rollback requires a reviewed migration/restore, not blindly running the bootstrap again.
