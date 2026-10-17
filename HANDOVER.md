# TTYARCADE — 70-game developer handover

**16 October 2026 · Complete repository expansion · `TTYARCADE-70-games-reviewed.zip`.**

**51 NEW games + the existing 19 = 70 games.** The alphabet and numbers garden is ONE game with two modes, not two counted games. This builds on the previous audited code and retains the completed Code Breaker fix. No GitHub push or cloud deployment was performed.

Public upstream was compared again at **`83e5309f09e5aceeec802603579ba3c435e449d0`**. Against the previous delivered tabs ZIP, the only differing upstream source file was the already-fixed Code Breaker page. That logic is retained; only its instruction container is now collapsed. No unrelated upstream features were replaced. See `audit/expansion/UPSTREAM.md`.

## Follow-up: gameplay sequence review

This release corrects the reported **War second-battle visibility bug**. A current reveal now replaces the previous battle immediately, with separate named player slots; the other card remains `??` until that player reveals. Completed-battle and current/last-battle labels distinguish the stages.

Other corrections found during review:
- War: tied final cards with both piles exhausted produce a draw; only one exhausted pile loses. Exhaustion is checked before moving facedown cards.
- Same-device play: public boards (War, Golf, Nim and other public strategies) remain visible between turns. Private hands, fleets, mission clues and puzzle relay handoffs retain their privacy curtain.
- Mental Rotation: every newly generated option is visually distinct. Geometry-based grading also accepts equivalent rotations in older symmetric saved states.
- River Crossing: shuffling names no longer changes the predator/food relationships.

**Current verification is `audit/sequence-review/REVIEW.md` and its logs.** `audit/expansion/` is the previous release baseline, not evidence for these new corrections. Both complete follow-up passes succeeded: 9 original + 70 expansion unit tests, 39 API scenarios, all 51 new rendered-control paths plus all 19 original browser play paths, two-browser gameplay/privacy, refresh/rematch, tabs, retention and access/admin regressions. The expansion suite now checks intermediate projections after reducer transitions, not only final outcomes. War additionally passed **560 individually checked reveals across two complete local rounds per pass**, plus two-browser first/second/third battles and refresh. Fresh extraction/install/lint/types/units/production build passed with default production headers.

These are representative automated checks, **not a claim that every game was manually played to completion twice or that every possible state is defect-free**. Full generated engine solves and supported seat-count simulations complement browser-path checks; Rummy finishing uses the existing isolated test fixture. No schema changes are needed for this follow-up. All setup and publishing instructions below still apply.

## 1. What ships and where to start

- **8 new card games:** 13-card Rummy, Go Fish, War, Higher or Lower, Twenty One, Sevens, Six-card Golf, Old Maid.
- **8 turn-based strategy/cooperative games:** Nim, Dots and Boxes, Reversi, Mancala, Fleet Battle, Word Duel, Poisoned Chocolate, Secret Mission.
- **35 other puzzle/learning games:** thought-number membership, alphabet/numbers garden, memory/knowledge/word/number/logic puzzles. Full names, routes, modes and all new rules are in **[GAMES.md](GAMES.md)**.
- **15 new online games**, plus the 6 existing online games. All new online games also support same-device play; Higher or Lower is solo. Other new puzzles generally support solo + same-device round relay; thought-number and children’s garden are solo-only. No unsupported CPU mode is advertised for new games.
- Home catalog: multiword search, play-mode/category/group-size filters, sort A–Z/Z–A/maximum players/new first, clear filters and no-results message. No bottom home waiting-room listing.
- Instructions are collapsed by default through Shell on every gameplay route. Long original Code Breaker/2048/Minesweeper instruction panels and Memory/Math mode-menu rules also start collapsed. Board prompts and relevant controls remain visible.
- Strict black `#000000` / white `#ffffff`, terminal text and monospace; no theme switch, images, canvas or external game assets. Existing layouts are retained apart from requested catalog/help changes. Expansion-only controls are scoped under `.pack-ui` in the same stylesheet.
- Guests play immediately. Login/registration remains optional. Password checkbox, host controls, kick-with-rejoin, administrator dashboard, inactivity flags, advertising switches and single-active-game-tab coordination remain intact.

### New source map

| Area | Files |
|---|---|
| Canonical 51-game metadata / English rules | `src/lib/pack/catalog.ts` |
| Immutable state and validated commands | `src/lib/pack/{core,index}.ts` |
| Puzzle generators and reducers | `src/lib/pack/puzzles.ts` |
| Card engine, physical-card accounting, Rummy validator | `src/lib/pack/card-games.ts` |
| Strategy/cooperative engines | `src/lib/pack/strategy.ts` |
| Server-only row-locked room adapter | `src/lib/pack/online.ts` |
| Hidden-information allowlist projections | `projectPack` in `src/lib/pack/index.ts` |
| Dynamic game route, mode/relay/handoff controller | `src/app/games/[game]/page.tsx`, `src/components/pack-game.tsx` |
| Per-game text controls | `src/components/pack-board.tsx` |
| Searchable catalog / shared registry | `src/components/game-catalog.tsx`, `src/lib/games.ts` |
| Game guide generation | `scripts/game-guide.ts`, `npm run docs:games` |

Original static game routes retain precedence over the dynamic expansion route. Unknown expansion IDs return 404. The registry is now 70 entries; game IDs remain compatible with the existing text database columns. **No new SQL migration is required from the current room-controls/tabs/Code Breaker release.** Keep the supplied older migration paths for older installations.

### Authoritative online play and privacy

New rooms reuse the generic room API and its whole-request `SELECT FOR UPDATE` transactions. Clients send `{action:"pack-command", command:{type:...}, expectVersion}`. Server reducers validate actor, action, card ownership/indices, board legality and phase; supplied state/status/score cannot replace the canonical state. Start/restart/rematch are host-only. The server deals/shuffles, generates fleets/private clues, increments versions and records positive finishing scores once. `/api/scores` refuses direct scores for the new online-only-in-server games; their local match totals remain on-device. Existing solo score reporting remains trust-based.

`publicRoom(room, viewerSeat?)` calls the whitelist projection. **Deck order, opponent hands, unrevealed Golf cards, opponent fleets and other players’ Mission clues are not sent to the browser**, including spectator and stale/error responses. A valid seat token selects its private view. Mission clues disappear from projections after sealing. Never return raw pack state or add a debug-state endpoint. Server logs/error messages do not print secrets. This is access control, not end-to-end encryption; database operators can read stored state.

Presence/offline polling does not alter ownership or auto-play a hand. In NEW games an explicit departure/kick ends the current round without awarding a forfeit score; the room and physical cards/state remain stored. Remaining host can invite replacements and rematch. A departed credential rotates; kicked players may rejoin with the current password. Finished expansion rooms accept replacements/new members up to capacity. Starting the next round removes departed seats, compacts active human seats and redeals/regenerates; host seat and saved identity follow the remapping. Fewer than two humans cannot start an online match. Last human explicit leave or host close deletes the room. Original board/Memory/race/Crazy Eights departure behavior is unchanged.

### Same-device play, score and progression

New live card/strategy matches use named players and a handoff curtain whenever the turn changes. Only the current player sees their private information. Same-device puzzles are **round relays, not simultaneous races**: each player receives a fresh puzzle at the same level, then the shared level rises after a full rotation. A board may be retried at its current level. Match totals remain in memory; mode menu/reload resets them. Do not use local relay totals for stakes or prizes.

No final fixed level is imposed. Board sizes, generation work, display lengths and history are bounded. Difficulty eventually caps and fresh rounds continue; finite words/facts/events can recur, and random boards can repeat. Standard cards/boards offer endless rematches rather than increasingly huge boards. Existing Number Memory and Key Sequence now cap display lengths at **32** while continuing levels. The numeric level counter uses safe JavaScript integers; this is practical replayability, not a mathematical infinity/uniqueness claim or evidence of IQ/health improvement.

Rummy specifically uses **13 cards partitioned into 3+3+3+4**, at least one pure same-suit run, distinct-suit equal-rank sets, A low/high without wrap, optional printed jokers and at least two natural cards in each non-pure group. Decks scale 1/2/3/4 for 2 / 3–5 / 6–8 / 9–10 players. A bitmask search finds valid partitions automatically. Invalid declarations do not mutate the hand/turn. Draw + discard conserves each physical card; stock recycling keeps the top discard and reshuffles the remainder. All card games are recreational, without real-money wagers.

Nonogram, Sudoku and Cross Sums accept ANY valid completion, not just a generated hidden answer. Water Jugs uses reachable coprime-capacity targets; Peg Solitaire is generated by reverse legal jumps; Make Target stores a known integer expression; circuits have a known route; Logic Grid clues are added until unique; Rule Shift examples distinguish exactly one of its five documented candidate rules. The first thought-number round is exactly **1–20**; shuffled membership lists replace one another and invalid/out-of-range answer patterns are reported. The children’s game includes full A–Z and ascending-number modes, shuffled positions, untimed play, no lost lives and bounded large-touch grids.

### Retained architecture

Next.js App Router/React, same-origin Node APIs, PostgreSQL/Drizzle. Original rules remain in `src/lib/{online-games,memory-rules,board-rules,race-rules,cards}.ts`; Crazy Eights retains its separate private-card transaction API. Rooms use versioned snapshots, Memory 500ms and other generic games 1000ms polling; these intervals are not latency promises. `src/lib/game-tab.tsx` permits one active gameplay document per same-origin browser profile. A new game tab returns the older tab home without server leave/close, token removal or logout. Separate profiles/devices are independent; if both storage events and BroadcastChannel are blocked, coordination cannot be guaranteed. Solo in-memory progress is not saved by handoff.

**Operational details follow:** environment, database initialization/upgrades, lifecycle, inactive accounts, ads, local/admin/cloud setup, and verification.

## 2. Runtime and exact environment

Node **22 LTS recommended** (`.nvmrc`, package engines); PostgreSQL 14+. Final build/runtime and regression checks used Node **22.23.3**, PostgreSQL **17**, Chromium/Linux; earlier development also ran on Node 20.20.2. Next.js 16.4.1, React 19.3.1, TypeScript 5.9.3. Use the included lockfile and `npm ci`.

| Variable | Required / exact meaning |
|---|---|
| `DATABASE_URL` | Server-only PostgreSQL URI: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require`. Use the provider's exact role, database, port and TLS parameters. Never make it `NEXT_PUBLIC_*`. No Supabase API key/anon key is needed. |
| `CRON_SECRET` | Server-only scheduler secret; generate with `openssl rand -hex 32`. Set the same value on the app and scheduler. Missing returns 503; incorrect bearer returns 401. |
| `TTYARCADE_EMBED_PREVIEW` | Preview-only `1` at BOTH build and start omits X-Frame-Options so Arena can embed the live app. Leave unset on normal production (SAMEORIGIN remains the default). |
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
| Previous room-controls release (has room-password columns) | No SQL change for this 70-game expansion. |
| Previous upgraded release, already has retention/ads and room version | **`sql/upgrade-room-access.sql`** — repeat-safe room-password columns for this revision. |
| Already applied retention/ads upgrade before multiplayer rules were added | `sql/upgrade-multiplayer-rules.sql` — repeat-safe `rooms.version` addition only; then run `upgrade-room-access.sql`. Not sufficient for a pre-retention database. |

Do not run bootstrap and original-schema upgrade sequentially. Do not use `drizzle-kit push` as a substitute for the supplied triggers/functions/RLS SQL. For any other schema, inspect differences manually.

Main objects: `users`, `sessions`, `game_scores`, `rooms`, `room_players`, `card_rooms`, `card_players`, `game_logs`, `player_high_scores`, `ad_placements`. Added fields: `users.last_active_at/inactive_at`, both player tables' `left_at`, `card_rooms.host_position`, `rooms.version`, plus nullable `rooms.password_hash` / `card_rooms.password_hash`. Score logging and account activity triggers are included. Scores/history are not backfilled into play logs; logs record accepted score inserts, not all moves. Guest names are not unique identities.

## 4. Refresh, disconnect, explicit leave and room ownership

- Refresh, closing a tab, network loss and extended inactivity **do not delete rooms or relinquish human seats**. Offline presence is informational, never automatic CPU takeover. Account inactivity does not close rooms.
- Tokens are stored per room in guarded localStorage; query `?room=CODE` reopens a saved session automatically. Login-backed generic join can also find that account's seat. Tokens are capability credentials: HTTPS only, avoid logging token-bearing query strings.
- **Explicit Leave/mode-menu departure in ORIGINAL games:** authenticated seat is surrendered; credential rotates; waiting generic seats compact, active games preserve array positions. Board/card departed seats can be driven by CPU; Memory/races skip departed humans. Host transfers to a remaining human. Last human's explicit leave deletes the room and its seats, even if CPUs remain.
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
- Server records ORIGINAL generic verified finishes in `game_scores` (winning boards; active Memory/race totals), with room/round metadata. **Original public `/api/scores` and solo games remain client-submitted**; callers can forge ordinary scores/metadata. Leaderboards are not anti-cheat attestations and must not be used for prizes.

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

## 8. Verification, evidence and limitations

Current follow-up evidence is **`audit/sequence-review/`**. The original expansion baseline is retained under `audit/expansion/`. Final production build/runtime used **Node 22.23.3**, PostgreSQL **17**, Chromium/Linux. Earlier development also ran on Node 20.20.2; Node 22 is the supported recommendation. Final checks:

| Check | Result / scope |
|---|---|
| ESLint, TypeScript, production build | PASS |
| Original unit suite | 9/9 |
| New game logic suite | 70/70; seeded generated solves at levels 1/2/8/50/1,000,000, supported card/strategy seat counts, immutable commands, Rummy partitions/decks/recycling, physical-card conservation, alternative constraint solutions, hidden-state projections, rule uniqueness and bounded high-level states |
| Baseline API | 4/4 |
| New online API | 17/17: every one of 15 new online games finishes and rematches, plus 10-seat password/kick/rejoin/host transfer/compaction, idle retention, concurrent/stale moves and privacy/error checks |
| Original expanded multiplayer API | 6/6, including full Crazy Eights and 104-card accounting |
| Retention/account inactivity API | 4/4 |
| Room-access/admin API | 8/8 |
| General browser route/theme/link suite | 77 routes: 70 games plus home/account/admin/settings/login/leaderboard/rules; text-only DOM, pure black/white body, device-input/CPU/navigation checks |
| New-game browser suite | Actual legal controls in all 51 new games; complete thought-number/children/cooperative cases, collapsed help, combined catalog filters, zero page errors; alphabet board fits a 390px viewport |
| Hidden-information two-browser suite | Rummy draw/discard/peer turn/reconnect, Fleet alternating shots/privacy, Mission private briefs/sealing/either-peer team finish/rematch; zero page errors |
| Original playable-path browser suite | All 19 retained game paths; solved representative generated puzzles/local board rounds; zero page errors |
| Original online complete-round browsers | Memory two-card visibility, mismatch/match/turn/reconnect/finish/rematch; XoX/Connect Four; full Math/Typing races |
| Single-active-tab browser | Original six online games plus Rummy/Fleet/Mission; preserved private views/tokens/state; separate-profile independence, storage/channel fallbacks, rapid claims |
| Retention/browser, host/admin/browser | PASS; original room flows, failed-leave recovery, gamepad denial fallback, six-game passwords/kick/rejoin and authorized admin placement persistence |
| Code Breaker regression | All 15,625 level-one score pairs, both screenshot histories (including unique 243), fixed secret/history, repeats/leading zeros, duplicate submissions, loss/retry; PASS |
| Database | Fresh `schema.sql` bootstrap and repeat additive retention/version/access migrations PASS. No schema files changed from compared upstream. |
| Ads | Default-off/no unconsented request/no game-page slots rechecked. Live/placeholder bridge logic retained; no real publisher approval or ad serving claimed. |
| Clean extraction | ZIP extracted without private env/dependencies/build output; Node 22 `npm ci`, lint, types, 9 original units, 70 expansion units and production build PASS. All source/config bytes matched the delivery candidate. |
| Dependency audit | Production: 0 vulnerabilities. Full development tree: 5 high ESLint-chain advisories; no forced dependency downgrade. |

Rummy API finishing uses a legal-hand fixture installed directly into the isolated test DB, then the real declaration endpoint; there is no application debug/backdoor endpoint. Other complete-round simulations use legal commands. Browser checks are representative input/progression checks, NOT exhaustive completion of every random level. Tests do not prove universal correctness.

Some fast parallel/repeated harness runs initially hit the real per-IP rate limiter or matched multiple accessibility status elements. Test selectors now scope the intended status, and API mutation suites use a per-process test IP so unrelated tests do not share a rate bucket. Production rate limiting was not disabled. Final evidence logs record the rerun results.

### Reproduce safely

```bash
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run test:pack
npm run build
# Separate terminal, configured with an ISOLATED test DB + cron secret:
npm run start
npx playwright install --with-deps chromium
npm test
npm run test:browser
npm run test:all-games-browser
npm run test:pack-browser
npm run test:pack-online-browser
npm run test:war-browser
npm run test:codebreaker
npm run test:multiplayer-browser
npm run test:retention-browser
npm run test:tabs-browser
# Securely export these for mutation suites (do not commit their values):
# ALLOW_DATABASE_TESTS=1
# TEST_DATABASE_URL=<same DISPOSABLE database used by the test server>
# TEST_CRON_SECRET=<that isolated server's CRON_SECRET>
npm run test:pack-api
npm run test:multiplayer-api
npm run test:upgrade
npm run test:access
npm run test:access-browser
TEST_BASE_URL=http://127.0.0.1:3000 TEST_AD_MODE=off npm run test:ads
npm audit --omit=dev
```

Never point mutation suites at production. Knowledge/word banks are finite; maintain references when extending `puzzles.ts`. Tests use deterministic seeds; production starts use fresh random seeds. No distributed/load/long-soak testing, real mobile/gamepad hardware certification, cloud deployment, real CMP/AdSense approval, zero-lag guarantee or educational/medical benefit is claimed. In-browser solo game state/scores are not anti-cheat; even server-derived finishes are not suitable for monetary prizes or proof of identity.

Rate limiting is process-local; use trusted proxy/WAF controls at scale. Polling intervals can be delayed in background tabs/network outages. Abandoned unrecoverable rooms are intentionally retained; long-term scores/logs/room storage require a separate owner-approved policy. Inactive flags do not meaningfully reclaim storage. Leaderboard reads at most 4,000 stored score rows and mixes differing game scales; use SQL per-game aggregation before scaling that feature. The game-tab policy is browser coordination, not security isolation. Do not log token-bearing room query strings.

## 9. Clean delivery, publishing and rollback

See **PUBLISHING.md** for clone/overlay/branch/test/push/deploy steps. The ZIP is the complete current repository, not a patch; no previous ZIP is needed. `HANDOVER.md`, `GAMES.md`, README, publishing/admin guides are at the extracted repository root. Necessary older SQL upgrade paths and regression tests remain; historical duplicate audits, earlier ZIPs and scratch files are excluded. No license was invented; confirm the owner's licensing choice.

The archive excludes `.git`, all real `.env*`, dependencies, `.next`, caches, DB dumps, browser state and local credentials. `.env.example` is the placeholder template. Check the final checksum before extracting. Review/merge through a pull request, never force-push over newer work. Roll code back via the previous provider deployment or reviewed `git revert`; leave compatible additive columns or use an owner-reviewed migration/restore. Supplied SQL scripts are not downgrades. Back up the database before any deployment migration.
