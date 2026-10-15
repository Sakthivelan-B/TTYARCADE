# TTYARCADE — upgraded developer handover

**15 October 2026 · Tested deployment candidate, not a hosted deployment.** Built on the previous audited release, compared against `Sakthivelan-B/TTYARCADE` main commit `7a1aa47b424db0a46fab3bc5162356ca96ab30be`. Nothing was pushed to GitHub or deployed to a cloud account. The new archive is **TTYARCADE-tabs-update.zip**; the earlier `TTYARCADE-final.zip` is not this release.

## Latest home / single-tab revision

The home-page waiting-room block and its DB room-list queries have been removed; no retained rooms are purged. One active game document per same-origin browser profile is coordinated via `src/lib/game-tab.tsx`, called by Shell for gameplay routes (not rules). Newer game pages claim ownership; older game tabs perform a local full navigation to home, with a one-time notice. This unmounts their timers/polls without any explicit server leave/close, token deletion or account sign-out. Valid online seats remain reserved/recoverable in the newer tab. Any game page, including its mode menu, claims ownership; opening home/account/admin/settings/rules does not. Navigating back to a game can reclaim ownership; merely focusing the old home tab does not.

The lease uses a fresh document ID (not copied sessionStorage IDs), reads current ownership before handling delayed events, and uses storage events plus BroadcastChannel fallback. Closing all tabs leaves only one overwritten local ownership record, not history. Separate origins/profiles/private contexts/devices do not coordinate. If both browser mechanisms are unavailable, cross-tab exclusion cannot be guaranteed; games remain usable. This is client coordination, not an anti-cheat or device/account security boundary. Solo in-memory progress is not saved by forced handoff. Browsers normally prohibit closing arbitrary tabs; the older tab returns home rather than closing its browser window.

**No SQL change from the room-controls revision.** New archive `TTYARCADE-tabs-update.zip`; base archive SHA-256 `23538b2c9530970733e92a338759f0fb035ff4dba170195d47447c5197453715`. New browser suite covers six online handoffs with state/hand/turn/token preservation, cross-game ownership, refresh, separate-profile independence, each coordination fallback and rapid concurrent claims. All previous gameplay/retention/admin suites rerun; latest evidence is `audit/tabs/`.

## Retained room-access / admin revision

Read **[ADMIN_GUIDE.md](ADMIN_GUIDE.md)** for step-by-step host password/kick controls, first-admin SQL setup, ad switches and player moderation. On an installation already running the previous upgraded ZIP, run **`sql/upgrade-room-access.sql` before deployment**. New room passwords are salted scrypt hashes; old rooms remain open by default. Hosts can enable/change/disable passwords and kick another human; selected policy allows rejoining with the current password. Valid existing seats still refresh without retyping it. Passwords govern joining, not confidentiality of public room snapshots.

The admin UI now exposes persisted placement switches, effective/configured ad modes, searchable accounts, activity/inactive timestamps, per-game scores and latest 100 account/guest score submissions. Environment IDs/mode, real CMP/site approval, Google reporting and consent remain owner/provider responsibilities. Deprecated ADMIN_USERNAMES guidance was removed from the UI. New verification in `audit/access/`: **8 API scenarios**, six-game password/kick/rejoin browsers, admin UI/backend authorization/persistence, fresh/previous-release/repeated SQL. Previous all-19/playthrough/retention suites rerun successfully. Below documents the retained architecture; ADMIN_GUIDE supplies latest operational details.

## 1. Architecture and preserved design

19 text/ASCII browser games. Next.js App Router serves React pages and same-origin Node API routes; PostgreSQL/Drizzle stores accounts, rooms, hands and scores. No separate socket service, canvas, external font, game images or icon assets. Guests can play immediately: **registration/login is optional**, including online rooms and score submissions.

Strict terminal black `#000000` / white `#ffffff`; selection may invert those same colors. No automatic/light theme. Existing layouts retained. `src/app/globals.css` is byte-identical to the previous audited release: SHA-256 `69b94197c54ece4ceacad6e190bc9de54affd9899e6b7e65ef0b82050a3a00bb`. Off/placeholder advertising retains this guarantee; actual Google creatives are outside application styling control.

| Area | Source |
|---|---|
| Games, registry | `src/app/games/*/page.tsx`, `src/lib/games.ts` |
| Shell, text cards, device controls | `src/components/{term,Card,multi}.tsx`, `src/lib/controls.ts` |
| Canonical generic online rules | `src/lib/{online-games,memory-rules,board-rules,race-rules}.ts` |
| Generic room API | `src/app/api/rooms/` |
| Private Crazy Eights hands/actions | `src/app/api/cards/rooms/`, `src/lib/cards.ts` |
| Explicit departure/host handover | `src/lib/room-lifecycle.ts` |
| Input activity and reversible flags | `src/lib/{activity,use-game-activity}.ts`, `api/activity`, `api/cron/cleanup` |
| Ads/consent/placement policy | `src/lib/{ads,ad-consent}.ts`, `src/components/ads/` |
| Auth/storage/error handling | `src/lib/{auth,http,rate-limit,storage}.ts` |
| DB and SQL | `src/db/`, `sql/` |
| Verification | `tests/`, `audit/upgrade/`, `audit/FILE_REVIEW.md` |

Generic room mutations are row-locked transactions. A monotonic `rooms.version` prevents stale gameplay updates; clients apply command responses immediately and ignore older snapshots. Memory polls at 500ms, other generic games at 1000ms. These are polling intervals, **not a latency SLA**. Crazy Eights retains its separate transactional action API.

## 2. Runtime and exact environment

Node **22 LTS recommended** (`.nvmrc`, package engines); PostgreSQL 14+. Tests here ran on Node **20.20.2**, PostgreSQL **17**, Chromium/Linux. Node 22 itself was not separately exercised. Next.js 16.4.1, React 19.3.1, TypeScript 5.9.3. Use the included lockfile and `npm ci`.

| Variable | Required / exact meaning |
|---|---|
| `DATABASE_URL` | Server-only PostgreSQL URI: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require`. Use the provider's exact role, database, port and TLS parameters. Never make it `NEXT_PUBLIC_*`. No Supabase API key/anon key is needed. |
| `CRON_SECRET` | Server-only scheduler secret; generate with `openssl rand -hex 32`. Set the same value on the app and scheduler. Missing returns 503; incorrect bearer returns 401. |
| `PORT` | Default local 3000; Render supplies its own. Omit on Vercel. |
| `NODE_ENV` | Development for dev, production for build/start; normally managed by npm/host. Production account cookies require HTTPS. |
| `NEXT_PUBLIC_ADSENSE_MODE` | `off` (default), `placeholder`, or `live`. Unknown values become off. |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | Live publisher ID, exactly `ca-pub-` followed by 16 digits. Not a server secret. |
| `NEXT_PUBLIC_ADSENSE_SLOT_ID` | Live ad-unit slot, exactly 10 digits. Currently shared by the two named placements. |
| `NEXT_PUBLIC_ADSENSE_SCRIPT_URL` | Default `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js`. Security allowlist accepts only this HTTPS origin/path, no query/hash/credentials. The loader appends `?client=...`. This is not an arbitrary third-party script injection setting. |
| `TEST_BASE_URL` | Test-only running server, defaults to `http://127.0.0.1:3000`; ad test defaults to port 3001. |
| `ALLOW_DATABASE_TESTS`, `TEST_DATABASE_URL`, `TEST_CRON_SECRET` | Test-only opt-in (`1`), disposable DB URI and that test server's cron secret. Never point mutation suites at production. |
| `TEST_AD_MODE`, `TEST_AD_BLOCK` | Ad test assertions only; `off`/`placeholder`/`live`, and `1` to simulate blocking. They do not configure the app. |

**Rebuild after changing `NEXT_PUBLIC_*`.** IDs may be public; DB credentials, session/seat tokens and CRON_SECRET must not be published. `ADMIN_USERNAMES` is removed/ignored; no first-user administrator shortcut. No AUTH_SECRET is required by this implementation.

### Where DATABASE_URL comes from

- **Neon:** project → **Connect** → select branch/database/role → connection string for Node.js. Prefer **pooled** connection for Vercel/serverless. Copy the complete PostgreSQL URI (not a `psql` shell command), preserving pooler hostname and TLS options.
- **Supabase:** project → **Connect** → connection string → **Transaction pooler** for serverless or **Session pooler** for a persistent Node service. Substitute your database password if the dashboard shows `[YOUR-PASSWORD]`. Use the displayed username, host and port. Project URL and anon API key are not database URIs. A direct connection can require IPv6; poolers can help IPv4-only hosting.
- Dashboard wording may change. URL-encode special characters in manually substituted passwords. Never disable TLS verification to work around a copied URI.

Backend connects as **table owner or a trusted, explicitly configured BYPASSRLS role**. SQL enables RLS without browser policies and revokes Supabase public-role access. A normal non-owner role can otherwise fail queries. Keep DB timezone UTC; existing schema uses timestamp without timezone.

## 3. Database setup — choose ONE starting path

**Backup first**, test on a disposable restore/branch, run SQL **before deploying this code**. Open Supabase SQL Editor / Neon SQL Editor on the correct database as owner, paste the entire chosen script, execute. CLI equivalent, with DATABASE_URL securely set in your shell:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/CHOSEN_FILE.sql
```

A root `.env` is read by Next and `drizzle.config.ts`, **not automatically sourced by psql**. Replace `CHOSEN_FILE` with one filename below.

| Starting database | Run |
|---|---|
| Empty/new | `sql/schema.sql` — complete bootstrap, once. Not repeat-safe; don't run against initialized tables. |
| Original seven-table repository, before audited logging/security additions | `sql/existing-database.sql` — one-time original-schema upgrade including the new fields. Not the previous-audit upgrade. |
| Previous audited release (already has game_logs/reporting/RLS) | **`sql/upgrade-retention-ads.sql`** — additive, repeat-safe; includes activity flags, departure tracking, card host position, placements and room version. |
| Previous room-controls release (has room-password columns) | No SQL change for the home/single-tab update. |
| Previous upgraded release, already has retention/ads and room version | **`sql/upgrade-room-access.sql`** — repeat-safe room-password columns for this revision. |
| Already applied retention/ads upgrade before multiplayer rules were added | `sql/upgrade-multiplayer-rules.sql` — repeat-safe `rooms.version` addition only; then run `upgrade-room-access.sql`. Not sufficient for a pre-retention database. |

Do not run bootstrap and original-schema upgrade sequentially. Do not use `drizzle-kit push` as a substitute for the supplied triggers/functions/RLS SQL. For any other schema, inspect differences manually.

Main objects: `users`, `sessions`, `game_scores`, `rooms`, `room_players`, `card_rooms`, `card_players`, `game_logs`, `player_high_scores`, `ad_placements`. Added fields: `users.last_active_at/inactive_at`, both player tables' `left_at`, `card_rooms.host_position`, `rooms.version`, plus nullable `rooms.password_hash` / `card_rooms.password_hash`. Score logging and account activity triggers are included. Scores/history are not backfilled into play logs; logs record accepted score inserts, not all moves. Guest names are not unique identities.

## 4. Refresh, disconnect, explicit leave and room ownership

- Refresh, closing a tab, network loss and extended inactivity **do not delete rooms or relinquish human seats**. Offline presence is informational, never automatic CPU takeover. Account inactivity does not close rooms.
- Tokens are stored per room in guarded localStorage; query `?room=CODE` reopens a saved session automatically. Login-backed generic join can also find that account's seat. Tokens are capability credentials: HTTPS only, avoid logging token-bearing query strings.
- **Explicit Leave/mode-menu departure:** authenticated seat is surrendered; credential rotates; waiting generic seats compact, active games preserve array positions. Board/card departed seats can be driven by CPU; Memory/races skip departed humans. Host transfers to a remaining human. Last human's explicit leave deletes the room and its seats, even if CPUs remain.
- **Host Close room:** explicit destructive room deletion; nonhosts get 403.
- Failed leave does not discard the local credential. Lost guest storage cannot prove ownership; there is no name-based seat hijacking/recovery. Clearing storage is not a server leave. There is deliberately **no room-expiry cron**: abandoned credentials can leave rooms stored indefinitely.
- New humans cannot append slots to an already-playing Memory/race. Existing owners may reconnect; explicit CPU/departed slots can be replaced. CPU fill is only available for tic-tac-toe/Connect Four and only before start; Memory/Math/Typing do not advertise unsupported CPUs.
- Blocking/deleting an account administratively revokes its seat credentials and transfers host control to remaining humans under locks. It does not expire unrelated rooms. If no human remains after moderation, the unowned room is retained rather than silently purged; owner review/manual recovery may be needed. Inactivity flags are not moderation.
- Card rooms use saved capabilities/private hands; refreshing is not a redeal. Crazy Eights has no in-place rematch UI; create a new room after completion.

### Canonical gameplay commands / compatibility

New clients send `expectVersion`; stale updates return 409 with current room/seats. Re-fetch/retry a deliberate input, never blindly replay stale state. This is an API behavior change: old generic clients that submit arbitrary full state must reload after deployment.

- Memory: `action: "memory-flip", index`. Second card stays open with the first for **1800ms**. Matches score immediately and retain the turn; mismatches pass the turn only on resolution. GET/POST settles overdue reveals under lock. Reopening the room reconstructs remaining reveal time. Final matched cards stay visible; ties are named correctly. Full pattern is present in browser state, so this is not anti-cheat.
- Math/Typing: `action: "race-answer", challenge, answer` or `"race-timeout", challenge`. Server generates challenges/deadlines, checks answers/current ID, allows only one concurrent winner and rejects early timeouts/late answers. Math target 30 (award current level), Typing target 8 (award one). Peer advancement clears partial input. Same-device Typing uses rotating relay turns.
- Boards: requested board must change exactly one legal cell with correct mark/turn; Connect Four enforces gravity. Server derives result, scoreboard and finished status, ignoring supplied score/status. Clients still choose CPU strategy; server validates its legal move.
- Start/restart/rematch are host-only. Mid-game restart is distinct from finished rematch; board rounds can retain/reset series scores. Memory/races get fresh server-generated boards/challenges. Nonhost restart affordances are disabled/hidden.
- Server records generic verified finishes in `game_scores` (winning boards; active Memory/race totals), with room/round metadata. **Public `/api/scores` and solo games remain client-submitted**; callers can forge ordinary scores/metadata. Leaderboards are not anti-cheat attestations and must not be used for prizes.

Additional gameplay repairs: local CPU-turn input guards retained; race finished clocks stop; Minesweeper now renders its initial safe-click grid and cancels delayed resets; Lights Out reset clears won state; maze win effects are outside React state updaters; Code Breaker Enter prevents native duplicate submission; Pong clamps paddle collisions; sliding-board shuffling is bounded and cannot start solved. Existing Snake/2048/card/security fixes are retained.

## 5. Seven-day inactivity — reversible flag, NOT purge

Chosen policy: `flag_inactive_accounts()` sets `inactive_at=now()` only where `last_active_at < now() - interval '7 days'` and not already flagged. Exactly seven days is not older than seven days. Migration backfills activity from registration/login/latest score, not deployment time.

Successful login, actual game input (`/api/activity`, throttled about once/minute), and attributed score insertion clear the flag/update activity. Mere room polling/background presence is not play. Guests receive 204 without needing an account. No user, score, log or room is deleted by this inactivity policy. This is a reversible organizational flag, **not meaningful storage reclamation**. No automatic hiding/blocking of flagged accounts is implied; admin API exposes timestamps.

`GET /api/cron/cleanup` requires `Authorization: Bearer CRON_SECRET`; transaction flags accounts and deletes expired sessions only. Response includes `flaggedAccounts`, `deletedSessions`, `deletedRooms:0`.

`vercel.json`: daily **04:00 UTC / 09:30 IST** (`0 4 * * *`). Vercel supplies the matching CRON_SECRET authorization for its cron integration. On Render or another scheduler, run daily:

```bash
curl --fail --silent --show-error \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://YOUR_DOMAIN/api/cron/cleanup
```

Secrets are scheduler/app environment variables, not URL query parameters. Confirm your plan supports scheduled requests. A missed day delays flagging; flags are not evaluated continuously. There is no room timeout job to enable.

## 6. Promotion/AdSense architecture

Reference compared: `Sakthivelan-B/axono-prism` commit `27b797a7e637785f379cf92f4e16f35f9f941b16`. Reused the architectural idea of **named placement + centralized eligibility**, not its image/color-heavy campaign UI, billing, click tracking or interstitials.

Current named placements: **home-footer**, **leaderboard-footer**, outside gameplay. No game-page ad slots, popups, overlays, automatic refresh or paid-campaign engine. `PromotionPlacement` reads env/DB flags, fails closed on configuration/DB errors; `AdSlot` reserves footer space. Off does no ad-configuration DB query or Google loading (the page may still query its normal room/score data).

1. Leave **off** for completely ad-free strict monochrome.
2. Set **placeholder**, rebuild: terminal text only, no Google request; useful for layout testing without publisher credentials.
3. For **live**, obtain approved AdSense site/publisher/ad-unit IDs, configure env, implement the real consent integration, rebuild/deploy. Invalid IDs/URL fail closed to off. Configuring placeholders is not approval or a promise of revenue.
4. Database kill switch, checked server-side on subsequent page requests:

```sql
UPDATE ad_placements SET enabled=false, updated_at=now()
WHERE id IN ('home-footer','leaderboard-footer');
-- Re-enable deliberately with enabled=true; don't add an Auto ads script.
```

**Certified CMP required where applicable** (Google EEA/UK/Switzerland policies, etc.). This repository provides a bridge, not a CMP, legal consent interface, privacy policy or compliance certification. Your CMP must establish permission before loading on *each document*. In app code call `setAdvertisingConsent(true/false)` from `src/lib/ad-consent.ts`, or have the CMP use:

```js
window.ttyarcadeAdvertisingConsent = true; // only after real permission
window.dispatchEvent(new CustomEvent('ttyarcade-ad-consent', {
  detail: { granted: true }
}));
// Revocation: set durable window flag to false and dispatch granted:false.
```

The durable flag handles CMP decisions before hydration. App consent is not persisted independently. Revocation removes the visible slot/stops further app requests; it cannot undo an already-loaded third-party script, cookies or prior network requests. CMP must handle its own revocation duties. Ad blockers/timeouts show a nonintrusive text fallback. Disable **Google Auto ads**; external automatic placements would violate this placement policy. Do not recolor/filter/modify Google creatives or simulate impressions/clicks. **Live ads can be colored/image-based**: use off/placeholder if every pixel must remain monochrome. Add real publisher `ads.txt`, privacy/cookie disclosures, CMP and provider-required CSP entries only when the owner is ready; no fabricated publisher ID/ads.txt was included.

Future monetization belongs behind `AD_PLACEMENTS`/eligibility and additional explicit DB configuration—not scattered scripts or theme changes. Current slots share one env slot ID; separate per-placement slots require extending configuration.

## 7. Local setup, admin and deployment

```bash
nvm install
nvm use
npm ci
cp .env.example .env
# Edit .env with real DATABASE_URL, generated CRON_SECRET; ads default off.
# Initialize/migrate PostgreSQL using section 3 FIRST.
npm run dev
# http://localhost:3000
```

Local-only Docker alternative:

```bash
docker run -d --name ttyarcade-db -p 5432:5432 \
  -e POSTGRES_DB=ttyarcade -e POSTGRES_PASSWORD=LOCAL_ONLY_CHANGE_ME postgres:17
# Local URI: postgresql://postgres:LOCAL_ONLY_CHANGE_ME@127.0.0.1:5432/ttyarcade
```

Build/start: `npm run build`, then `npm run start -- --hostname 0.0.0.0 --port 3000`. A build can succeed without a DB URI; live accounts/rooms/scores/health need it. DB pool max five **per process**, connection timeout five seconds. Scale instance counts to connection budget; prefer pooled provider URLs on serverless.

Register your own account after HTTPS deployment, then explicitly promote through trusted SQL:

```sql
UPDATE users SET is_admin=true WHERE username_key=lower('YOUR_USERNAME');
```

Re-login/refresh and visit `/admin`. Do not promote arbitrary public usernames or place admin credentials in `.env.example`. Blocking an account is not an IP/device ban; guests can still visit.

### Vercel

1. Apply correct SQL first and keep a backup. Push reviewed branch/merge per PUBLISHING.md.
2. Import GitHub repository, **Next.js** preset, root repository, Node **22.x**, install `npm ci`, build `npm run build`, normal framework output (not static export).
3. Dashboard → Environment Variables: server DATABASE_URL, CRON_SECRET; optional public ad settings. Separate preview and production DBs/secrets. Redeploy after env changes, especially public settings.
4. Configure HTTPS domain. Check `/api/health` returns 200; test guest solo, two-browser room, refresh, explicit leave/close, optional login and cron. Confirm Cron Jobs recognized `vercel.json` and plan limits. Preview protection can block external cron calls.

### Render

1. New **Web Service**, connect repository/production branch, Node 22 runtime (`NODE_VERSION=22` if host needs it), root repository.
2. Build: `npm ci && npm run build`. Start: `npm run start -- --hostname 0.0.0.0 --port $PORT`. Do not hardcode a port in browser fetch URLs; API calls are same-origin.
3. Configure DATABASE_URL, CRON_SECRET and optional ads env before building. Persistent data lives in external PostgreSQL, not the service filesystem. Health check `/api/health`.
4. Enable HTTPS and domain; configure daily Render Cron Job or external authenticated scheduler using section 5. Service sleeping/cold starts can delay polls without deleting DB rooms. Free plans are not latency guarantees.

Netlify requires a compatible Next/OpenNext runtime/adapter, not a static site export; separately configure a scheduler. Generic static hosting cannot run accounts/room APIs. No provider account deployment was tested here.

## 8. Verification, evidence and honest limits

Latest production build was restarted before the final gameplay regression run. Latest evidence in `audit/tabs/`; `audit/access/` retains the preceding room-controls evidence; `audit/upgrade/` retains the preceding upgrade evidence:

- ESLint, TypeScript and production build: PASS.
- Unit: **9/9** (2048, bounded Snake, storage/controls, card encoding/tokens, ads, Memory lifecycle, board rules, race challenges, salted room-password rules).
- Baseline API: **4/4**; retention/API upgrade: **4/4**; expanded multiplayer API: **6/6**, including concurrent/stale moves, state/score forgery rejection, race timeouts, full Crazy Eights game/104-card conservation, late-join slots, administrative host handover.
- Room access/admin API: **8/8**, six-game password/kick/rejoin browser checks and authenticated admin UI/placement persistence: PASS.
- Two-browser complete gameplay for all five generic games: Memory both cards visible on both peers, mismatch/turn change, refresh with first card open, matching extra turns, final totals/rematch; board wins/rematches; complete Math/Typing races and peer input clearing. Zero page errors.
- Playable-path checks across **all 19 games**, including solved generated matrix/maze/slide/lights puzzles, solo progression, initial Minesweeper reveal/flags, local board wins. Not exhaustive every-level simulation.
- **26-route** browser suite, internal links/theme/device-control smoke; six-game retention/refresh/leave/close suite: PASS.
- Ads off, placeholder, mocked live consent/revocation, blocked loader, DB disable: PASS during upgrade; default-off rechecked on final production build. No real publisher approval, ad serving, impressions or clicks verified.
- Fresh SQL bootstrap plus repeated additive migrations: PASS; prior-schema upgrade and strict seven-day boundary checks recorded.
- Runtime dependency audit: **0 vulnerabilities** at snapshot. Full audit: **5 high, development-only**, ESLint dependency chain; see JSON. No forced downgrade was used. Re-audit before release.

Reproduce, on an isolated DB/server only:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
# Start server separately with the SAME isolated DB and cron secret.
npm test
npx playwright install --with-deps chromium
npm run test:browser
npm run test:retention-browser
npm run test:all-games-browser
npm run test:multiplayer-browser
# Export ALLOW_DATABASE_TESTS=1, TEST_DATABASE_URL, TEST_CRON_SECRET securely:
npm run test:upgrade
npm run test:multiplayer-api
# Ad mode must match the running app's build/env; tests mock Google:
TEST_BASE_URL=http://127.0.0.1:3000 TEST_AD_MODE=off npm run test:ads
npm audit --omit=dev
```

Remaining limits: no distributed/long-duration load or soak test, real gamepad/mobile hardware certification, cloud deployment, real CMP/AdSense approval or universal lag/bug-free guarantee. Room offline seats intentionally wait rather than auto-play; unrecoverable abandoned rooms consume storage. Rate limiting is process-local; use provider WAF/request limits for public scale. Public solo score endpoint remains trust-based; Math answers and Memory patterns are visible to participants. Leaderboard UI reads top 4,000 stored score rows and compares unlike cross-game score scales; replace with SQL per-game rankings for scale. Fresh-pattern history is bounded/best-effort, not a mathematical never-repeat promise. Unbounded long-term scores/logs/retained rooms need an owner-approved retention/storage policy, separate from the chosen non-destructive inactivity flag. Short focus timers/route edge cases are not a proof of zero leaks. Do not infer exhaustive coverage from passing tests.

## 9. Publishing and rollback

See **PUBLISHING.md** for exact clone/overlay/branch/push steps. No repository license was invented; confirm the owner's licensing choice. Archive excludes `.git`, `.env`, DB/browser state, dependencies, build artifacts and caches. Use a pull request, never force-push over newer remote work. Code rollback: provider's previous deployment or reviewed `git revert`; additive DB changes can normally remain for old code, but restore/backward compatibility must be tested. These SQL files are **not downgrade scripts**. Back up before migrations and preserve credentials securely.
