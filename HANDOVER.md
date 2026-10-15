# HANDOVER.md - ttyarcade

> **Status (latest audit):** typecheck + production build pass; end-to-end tested: seat-hijack fix, name-clash suffixes, concurrent joins (no duplicate cards/seats), room capacity, account score attribution, admin block/unblock (kills sessions), login rate limit, cron auth.

> Read this first. It is written for any AI agent or developer taking the project over.
> Free hosting / deployment steps live in [`PUBLISHING.md`](./PUBLISHING.md).

Stack: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind v4 (layout only) + Drizzle ORM + PostgreSQL. No other runtime dependencies.

---

## 1. What this is

**ttyarcade** (formerly "arcade.sh"; renamed because arcade.sh is owned by someone else; planned domain `ttyarcade.com`, Vercel project `ttyarcade`) - a text-only, black-and-white game site that looks like a Linux terminal.

- 1 dedicated **online multiplayer** card game (Crazy Eights, 2-10 players).
- 13 **endless level games**: every level is procedurally generated, gets harder, and is never served twice to the same browser.
- 4 **classics**: XoX (tic-tac-toe), Connect Four, 2048, Pong.
- Games can be played **solo**, **same device** (hot-seat, 2-10 players), **vs cpu**, or in an **online room** (2-10 seats).
- **Accounts** (optional): server-side score tracking, profile, site rank.
- **Admin panel**: block / unblock / delete accounts, wipe scores.
- **Settings**: display name, theme, fully remappable controls + joystick support.

---

## 2. HARD DESIGN RULES (do not break)

| Rule | Enforced by |
|---|---|
| **Text only** - no images, icons, SVG art, emoji or canvas graphics | Games render characters (`# @ * █ . [ ] ?`) in `<pre className="screen">` or button grids. Pong is ASCII, not canvas. |
| **Black & white only** | Every color comes from CSS vars in `src/app/globals.css`. Never use Tailwind color classes (`bg-red-500`, `text-blue-*`, ...). |
| **3 themes**: `dark`, `medium`, `light` | `[data-theme]` on `<html>`; inline no-flash script in `layout.tsx`; switcher in `Shell` and in `/settings`. |
| **Monospace terminal look, instant load** | System monospace stack, zero web fonts, zero image assets. |

Emphasis without color: inversion (`.inv`, `.cell.on`), **bold**, underline, dashed vs solid vs double borders, `.dim` text.
Card suits: outlined `♡ ♢` = "red" suits, filled `♣ ♠` = "black" suits (see `components/Card.tsx`).

CSS classes: `box`, `box-dashed`, `btn` (+`.on`), `inp`, `cell` (+`.on`, `.soft`), `inv`, `dim`, `screen`, `blink`.
CSS vars: `--bg`, `--fg`, `--dim`, `--soft`.

---

## 3. File map

```
src/
  app/
    layout.tsx              root html + no-flash theme script
    globals.css             THE design system
    page.tsx                home: "ls -la ./games", open rooms, login/settings links
    login/page.tsx          login + register (client)
    account/page.tsx        profile: plays, best, rank, recent scores, logout
    admin/page.tsx          moderation panel (admin only)
    settings/page.tsx       name, theme, control remap, gamepad, wipe local data
    leaderboard/page.tsx    top 5 per game (server component; blocked users excluded)
    api/
      health/route.ts                 GET -> {ok:true}   (hosting healthcheck, keep it)
      scores/route.ts                 POST score, GET ?game=
      auth/register|login|me/route.ts accounts + sessions (cookie)
      admin/users/route.ts            GET list, POST {id, action}
      rooms/route.ts                  POST create room, GET ?game= open rooms
      rooms/[code]/route.ts           GET poll; POST action=join|leave|bots|start|move|rematch
      cards/rooms/...                 Crazy Eights: create, get, join(+cpu), start, action
    games/<id>/page.tsx     one folder per game (ids below)
  components/
    term.tsx                Shell (top bar/theme/name), Stats, Banner, Pad, lifeBar, keyDir
    multi.tsx               useRoom() hook + RoomLobby UI  <- all online play goes through this
    Card.tsx                text playing card + card back
  lib/
    games.ts                GAME REGISTRY (modes, min/maxPlayers). Home + rooms API read it.
    levels.ts               procedural engine: rand, shuffle, pick, freshPattern, useBest, submitScore
    controls.ts             remappable keys + gamepad: useControls(onDir, onAction?)
    words.ts                word bank by length
    cards.ts                deck helpers (buildDeck(copies)) + canPlay rule
    player.ts               guest display name (localStorage) + change event
    bots.ts                 random cpu names, name de-duplication
    auth.ts                 scrypt hashing, session cookie, currentUser()
    rate-limit.ts           in-memory per-IP limiter (login 10/min, register 5/min)
  db/
    index.ts                pg Pool + drizzle (DATABASE_URL)
    schema.ts               all tables
  app/api/cron/cleanup/route.ts   daily cleanup (Bearer CRON_SECRET), scheduled in vercel.json
README.md  HANDOVER.md  PUBLISHING.md  .env.example  .gitignore  vercel.json
```

Game ids: `crazy8 matrix numbers memory sequence scramble odd maze slide lights math codebreaker typing snake minesweeper tictactoe connect4 2048 pong`.

---

## 4. Procedural levels ("never the same pattern")

`src/lib/levels.ts`

- `rand()` uses `crypto.getRandomValues` (falls back to `Math.random`).
- `freshPattern(gameId, generator, keyFn)` hashes each generated level (djb2) and compares it with the hashes this browser already saw (`localStorage["ttyarcade-seen:<gameId>"]`, last 800 kept). On a collision it regenerates (up to 60 tries). This is what guarantees "no repeated patterns".
- Difficulty is a pure function of `level` in each game (usually a `config(level)`).
- `useBest(gameId)` -> `[best, report]`, stored in `localStorage["ttyarcade-best:<gameId>"]`.
- `submitScore(gameId, score, meta, playerName)` -> `POST /api/scores`. The API attaches `userId` when the browser has a session cookie, so logged-in scores are tracked per account.

Always-solvable generators: slide puzzle is shuffled by legal moves; lights-out is built by applying random presses to a dark board; minesweeper places mines *after* the first click so it is never an instant loss.

| game | what scales with level |
|---|---|
| matrix | grid 3->8, more lit cells, shorter preview |
| numbers | digits = level+2 |
| memory | pairs 3->18, new symbols + shuffle |
| sequence | length level+2, keys 4->9, faster playback, new sequence each level |
| scramble | word length 3->9 |
| odd | grid 4->12, 5 tiers of look-alike glyphs, less time |
| maze | maze grows, fog of war from level 4 (radius shrinks) |
| slide | board 3x3->6x6, deeper shuffle |
| lights | board 3->7, more presses |
| math | range, operators + - x /, 3-term chains, less time |
| codebreaker | code length 3->6, digits 5->10 |
| typing | longer lines, capitals, punctuation, less time per char |
| snake | every 5 food: new random walls + more speed |
| minesweeper | field 8->16, density 11%->21% |

---

## 5. Generic multiplayer rooms (up to 10 players)

**Server** (`api/rooms*`), tables `rooms` + `room_players`:

- `rooms.state` is a jsonb blob defined by each game; `rooms.turn` is the seat index (-1 = simultaneous/race).
- One endpoint does everything: `POST /api/rooms/<CODE>` with `{token, action}`:
  - `join {name}` - takes a seat; reconnects ONLY by the seat's own `token` or the same logged-in account (never by display name - that allowed seat hijacking and was fixed); runs in a transaction with the room row locked so simultaneous joins get distinct seats and can't exceed `maxPlayers`; **takes over a cpu seat** if a human joins mid-game; suffixes clashing names (`ada` -> `ada~2`).
  - `leave` - in a live game the seat becomes a cpu so the others can finish; otherwise the seat/room is deleted.
  - `bots {count}` - add cpu seats with random names (`lib/bots.ts`).
  - `start {state, turn}` - waiting -> playing (needs >= 2 seats).
  - `move {state?, turn?, status?, score?, guard?, expectTurn?, takeover?, wins?}` - the core call.
    - `guard:{key,value}` = optimistic concurrency (used by races: `{key:"qid"}`), returns 409 `stale` when someone already moved on.
    - `expectTurn` = turn validation, returns 409 `not your turn`. A human **may** move for a cpu seat (that is how bots are driven in XoX/Connect4).
    - `takeover:<seat>` turns a stale human seat into a cpu seat.
  - `rematch {state, turn}` - finished -> playing, scores reset, `round+1`.
- `GET /api/rooms/<CODE>?token=` polls (clients poll every 1.5 s), refreshes presence (`lastSeen`, `online`) and marks seats offline after 20 s.

**Client** (`components/multi.tsx`): `useRoom(gameId, maxPlayers)` returns `{room, seats, me, mySeatIndex, myTurn, create, join, leave, addBots, start, move, rematch, takeover, openRooms, err, busy}` plus:
- **auto cpu fill**: if the host is alone in a waiting room for ~9 s, one random-named cpu joins (so a solo visitor is never stuck);
- **offline takeover**: if the seat whose turn it is went offline, it is converted to a cpu automatically;
- **resume**: seat token is kept in `localStorage["ttyarcade-room:<CODE>"]` and the URL is `?room=CODE`, so a refresh keeps you in the game.
`RoomLobby` renders the whole create/join/open-rooms/seats/start UI - games just pass `onPlay` (start state). Before a room exists the create/join panel is a collapsed `<details>` ("play with friends"), so solo players see only the game; errors stay visible outside it.

Games using it today: `tictactoe` (2p, + cpu seat), `connect4` (2p, + cpu seat), `memory` versus (2-10), `math` race (2-10), `typing` race (2-10). Same-device hot-seat modes exist for `memory`, `math`, `typing`, `minesweeper`, `scramble`, `codebreaker`, `tictactoe`, `connect4`.

**Crazy Eights** keeps its own dedicated tables/API (hidden hands need server authority): `card_rooms`, `card_players`, `api/cards/rooms/*`. It now uses **2 shuffled decks** (104 cards) so up to **10 players** fit, supports `join {cpu:true}` (host only) to seat a random-named cpu, and `action:"cpu"` makes the **server** play that seat - so cpu hands stay secret.

Crazy Eights joins use the same rules: reconnect by token/account only, clashing names get `~2`, and dealing happens inside a transaction with the room row locked (verified: 4 simultaneous joins -> all 104 cards present exactly twice).

Trust/safety notes: hidden information is only protected where the server owns it (Crazy Eights). In memory/races the shared `state` blob is visible to anyone who inspects network traffic; that is accepted for a friendly game - move those games to server-authoritative logic if cheating ever matters. Room state is last-write-wins apart from `guard`/`expectTurn`.

---

## 6. Accounts, scores, moderation

- `users` (username unique + `username_key` lowercase unique, `salt`, `password_hash` scrypt, `is_admin`, `blocked`, `blocked_reason`), `sessions` (token cookie `ttyarcade_session`, httpOnly, lax, 30 days).
- **Admin bootstrap:** if env `ADMIN_USERNAMES` (comma-separated) is set, only those usernames become admin when they register. If it is empty, the first account ever registered becomes admin (fallback - register yours right after deploy). Promote manually with `UPDATE users SET is_admin = true WHERE username = '...';`.
- Login and register are rate-limited per IP (`lib/rate-limit.ts`, in-memory per server instance -> 429 with `Retry-After`).
- `game_scores.userId` is nullable: guests still score (name from `localStorage`), logged-in users are attributed.
- `GET /api/auth/me` -> user + `{plays, best, rank}` + last 15 scores. `POST /api/auth/me` logs out.
- `POST /api/admin/users {id, action}` with `action` in `block | unblock | wipe-scores | delete`. Admin only (`currentUser().isAdmin`).
- **Blocking must not hurt other players**, so on block/delete the API: destroys the user's sessions, converts their live room seats to cpu seats (`is_cpu=true, online=false`), detaches their score rows (`user_id=null`), and deletes rooms that no longer contain a human. On delete it also removes their score rows.
- Leaderboard excludes blocked accounts and shows `@name` for accounts, `name (guest)` otherwise.
- Password rules: 6+ chars. Username: 3-20 chars `[a-z0-9_.-]`. Login never reveals whether a name exists.

---

## 7. Controls / accessibility

`lib/controls.ts` -> `useControls(onDir, onAction?)`:
- Keyboard using the user's map from `localStorage["ttyarcade-controls"]` (defaults: arrows; `Enter`=OK, `f`=flag). **WASD is always accepted** as a second binding.
- **Gamepad/joystick**: polled every frame; d-pad or left stick -> directions, button 0 -> OK, button 1 -> FLAG, with edge detection (no auto-repeat spam).
- Ignores keystrokes while an `<input>`/`<textarea>` is focused.
- `/settings` lets the user rebind each action ("click, then press a key"), shows the connected pad, and can wipe best scores / seen patterns / all local data.
Wired into: `snake`, `maze`, `slide`, `2048`, `pong`. Touch fallbacks: `Pad` component (on-screen ^ v < >) and pong hold-buttons.

---

## 8. Database

Tables: `users`, `sessions`, `game_scores`, `card_rooms`, `card_players`, `rooms`, `room_players`.
Cards are encoded `<suit><rank>`: suit `H D C S`, rank `1..13` (1=A, 11=J, 12=Q, 13=K), e.g. `S10`, `H1`.

Apply schema changes: `npx drizzle-kit push` (local URL is in `drizzle.config.json`; for production pass `--url=...`, see PUBLISHING.md).

---

## 9. Add a new game (checklist)

1. `src/app/games/<id>/page.tsx` with `"use client"`.
2. Wrap in `<Shell path="/games/<id>" title help>`; use `box` / `btn` / `cell` / `Stats` / `Banner`.
3. Text-only rendering, no colors.
4. Levels: generate with `freshPattern("<id>", gen, key)`; scale from `level`.
5. Scores: `useBest("<id>")` + `submitScore("<id>", score)`.
6. Direction input: `useControls(onDir)` (+ `Pad` for touch).
7. Multiplayer: `const m = useRoom("<id>", maxPlayers)` + `<RoomLobby m={m} onPlay={() => m.start(initialState, firstTurn)} />`; drive cpu seats with `m.move({..., expectTurn})`.
8. Register in `GAMES` (`src/lib/games.ts`) with `modes`, `minPlayers`, `maxPlayers`.
9. Run the validation commands (section 10).

---

## 10. Commands & conventions

```bash
npm install
npm run dev                                   # http://localhost:3000
npx drizzle-kit push                          # sync schema (local)
npx next typegen                              # route types
npm exec tsc -- --noEmit --pretty false       # typecheck
npm run build && npm run start                # production
```

Env (see `.env.example` + PUBLISHING.md §1): `DATABASE_URL` (required), `ADMIN_USERNAMES` (recommended), `CRON_SECRET` (optional, enables `/api/cron/cleanup`). Never commit `.env`.

Naming: the brand is lowercase `ttyarcade` everywhere: UI, banner, `package.json` name, localStorage keys (`ttyarcade-*`) and the session cookie (`ttyarcade_session`). Keep that prefix for any new key; `/settings` "clear all" wipes keys starting with `ttyarcade-`.

Conventions: lowercase terminal copy (`cd ..`, `$ ls`, `> your turn`, `>> game over`); keyboard-first with touch fallbacks; server components only for DB reads, always wrapped in try/catch so pages render when the DB is down; keep `/api/health` returning 200.

## 11. Known limitations / next work

- No turn timers in rooms: an AFK human stalls the game until the 20 s presence window flips them to cpu.
- Cleanup cron exists (`/api/cron/cleanup`, daily via `vercel.json`) but needs `CRON_SECRET`; other hosts need an external scheduler (e.g. cron-job.org).
- Polling (1.5 s) instead of SSE/websockets; fine for 10 players, wasteful at scale.
- Auth rate limiting is in-memory per instance (serverless instances don't share counters) - add host WAF rules for stronger protection.
- Race games accept client-computed answers (see trust note in §5).
- Crazy Eights has no "call bluff"/skip/reverse variants and no rematch button (create a new room).
