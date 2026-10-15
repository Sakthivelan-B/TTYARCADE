# Room passwords, host controls and administrator guide

## 1. What changed in this revision

Current complete repository: **TTYARCADE-tabs-update.zip**.

Latest small update: the home waiting-room list is removed without deleting rooms. Opening a game in a new tab stops the older game tab locally and returns it home. No server leave/close or account logout occurs; saved online seats remain recoverable. Same-site/browser-profile only; use separate profiles/devices for independent players. Home/admin/settings/rules do not take over a game; solo in-memory progress is not saved. **No SQL migration when updating from TTYARCADE-room-controls.zip.**

Room-access/admin baseline: **TTYARCADE-room-controls.zip**. Built on the working previous **TTYARCADE-upgraded.zip**, not a replacement architecture/theme. All six online games now have optional passwords and host kick controls. `/admin` now has ad-placement switches and expanded account/score details.

**Earlier upgraded installation without room controls: run `sql/upgrade-room-access.sql` BEFORE deploying this revision.** It adds nullable `password_hash` columns to both room tables and is safe to repeat. Existing rooms stay open (no password) until their hosts enable protection. No accounts/rooms/scores are deleted. Fresh and older-install SQL paths in HANDOVER also include these columns.

## 2. Host: protect a room, change password, or kick

Applies to XoX, Connect Four, Memory, Math, Typing and Crazy Eights.

1. Select the online mode (Crazy Eights is already an online room game).
2. Before **create room**, check **require room password** and enter 4–128 characters. Use a strong, unique password; it is case-sensitive and spaces are significant. Share the code/link **and password separately** with invited players.
3. Leave the checkbox **unchecked** to create an open room. A code alone is not an access secret when rooms are listed publicly.
4. Joiners enter the code and **join password**; wrong/missing passwords are rejected by the server, not just the browser UI. The open-room list marks protected generic rooms `[password]`.
5. Inside the room, the host opens **host controls**. Check/uncheck protection and press **save room access**. When already protected, leaving the password blank preserves it; typing a new one replaces it. Unchecking removes protection. Re-enabling after removal requires a new password.
6. To remove someone, press **kick NAME** and confirm. Only the current host can kick another human; players cannot kick themselves or the host. Host control transfers normally after an explicit host leave.

### The chosen kick/rejoin policy

**Kick is removal, not a ban.** The old seat credential is revoked. The removed browser notices on its next poll, clears the old saved credential and offers joining again. The player may rejoin with the current password—or without one if protection is off. To exclude someone who still knows the password, change it and then kick them; there is no room ban list in this revision.

During a waiting generic lobby the removed seat is deleted/positions compacted. During live games, array positions/hands are retained: departed board/card slots can be driven by CPU, Memory/races skip departed seats. A returning player can occupy an available CPU/departed slot, inheriting its game state rather than resetting the whole game. Crazy Eights retains its seven-card seat even in its waiting lobby to conserve all 104 cards. Kicking someone mid-suit-choice resolves the pending eight and advances safely. The host is never removed by their own kick action, so kicking another player does not close the room.

**Refresh remains seamless:** a valid saved seat capability or authenticated account reconnects without re-entering the password, even after the host changes it. Password changes govern **new joins**, not existing members. Use kick to revoke a particular existing seat. Refresh/network loss is still not an implicit leave, timeout or CPU takeover.

Passwords are stored as salted scrypt hashes, never returned in room/list/admin responses, and not saved in localStorage. There is no “show forgotten room password”; the host can replace it. Credentials travel in JSON POST bodies over **HTTPS**. Hashing does not replace HTTPS. Per-process rate limiting slows password checks; public deployments still need trusted proxy/WAF limits across instances.

**Privacy boundary:** room passwords control joining/seats. Room codes, membership/presence and normal public room snapshots are still observable by code/API. This is not an encrypted private chat or confidential game-state service. Crazy Eights private hands still require the matching seat capability. Never use a room password as your account password.

## 3. Set up the first administrator

There is no default administrator account or universal admin password. A display/guest name is not a registered account. `ADMIN_USERNAMES` is **not supported**, and registration never grants admin rights.

1. Deploy the app with HTTPS and a migrated PostgreSQL database. Sign up through the optional account page using your own strong account password.
2. Open your database owner's trusted SQL console: Supabase **SQL Editor**, Neon **SQL Editor**, or a secure `psql` session connected to the app database.
3. Replace `YOUR_USERNAME` below with the account you just registered. Do not grant a username you do not own:

```sql
UPDATE users
SET is_admin = true
WHERE username_key = lower('YOUR_USERNAME')
RETURNING id, username, is_admin;
```

4. Confirm exactly the expected row was updated. If zero rows, register first/check spelling/database/branch. Sign in or refresh the app and open **`https://YOUR_DOMAIN/admin`**.
5. Unauthorized/ordinary guest requests to both admin APIs return 403. Hiding a button is not the security boundary; every API call checks the current account's admin flag.

To revoke administrator rights deliberately through trusted SQL:

```sql
UPDATE users SET is_admin = false
WHERE username_key = lower('YOUR_USERNAME');
```

Keep at least one trusted owner/admin. Do not publish database credentials, session cookies or room tokens. No admin-password/DB-secret fields are shown in the dashboard.

## 4. Admin: manage advertising

At **`/admin` → advertising placements**, you can enable/disable:

- **home-footer** — footer of the home page.
- **leaderboard-footer** — footer of leaderboard.

Each has its persisted state and update timestamp. The switch updates `ad_placements.enabled` immediately in PostgreSQL. It affects **subsequent page requests/reloads**, not an ad already loaded in another browser. No game-page placement, popup, automatic refresh or Auto ads is introduced.

### Enabled is not the same as serving ads

The dashboard shows **configured mode** and **effective mode**. Four gates must all pass for a live request: valid owner environment configuration, an enabled placement, a real CMP permission decision, and an available/approved ad provider.

| Mode | What visitors see |
|---|---|
| `off` | No ad slot or Google loading, even if dashboard placement is enabled. Default/safest. |
| `placeholder` | Monochrome text placeholder; no Google ad/tracking request. |
| `live` | Consent-gated AdSense slot only with valid publisher/slot settings. Invalid config falls back to off. |

The dashboard switches **cannot** configure publisher credentials, obtain Google approval, grant visitor consent, read earnings, or override an ad blocker. It is an application placement manager, not the Google AdSense account/reporting console.

### Owner environment setup (hosting dashboard)

```dotenv
NEXT_PUBLIC_ADSENSE_MODE=placeholder
NEXT_PUBLIC_ADSENSE_CLIENT_ID=
NEXT_PUBLIC_ADSENSE_SLOT_ID=
NEXT_PUBLIC_ADSENSE_SCRIPT_URL=https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js
```

Start with placeholder. For approved live serving, set mode `live`, your real `ca-pub-` + 16-digit publisher ID and a 10-digit ad-unit slot ID. The same slot ID currently serves the two named placements. **Rebuild/redeploy after public env changes.** Only the allowlisted Google loader origin/path is accepted. No real publisher credentials were supplied/tested by this agent.

Before enabling live: complete Google site approval, your applicable certified CMP/consent integration, privacy/cookie disclosures and publisher `ads.txt`; disable **Google Auto ads** so Google does not inject uncontrolled placements. HANDOVER §6 documents the actual consent bridge. Dashboard enabling does not bypass it. On revocation the app removes its slot/stops future app requests; already-loaded third-party scripts/cookies cannot be undone by a DB switch.

**Strict monochrome:** off/placeholder retains the original terminal palette. Google live creatives may contain colors/images; the app must not recolor/filter them to force monochrome. Keep off/placeholder if every pixel must remain black/white.

For an emergency without UI access, the DB owner can disable both slots:

```sql
UPDATE ad_placements SET enabled=false, updated_at=now()
WHERE id IN ('home-footer','leaderboard-footer');
```

This does not disable unrelated third-party scripts someone separately adds to the deployment. No arbitrary paid-campaign/banner/upload/tracking engine is included.

## 5. Admin: inspect and moderate players

**registered players:** search username or numeric ID, expand an account to see:

- Account ID/name, admin/blocked state and block reason.
- Registration, last login and last recorded game/login activity.
- Seven-day inactive flag timestamp (or “not flagged”). Not flagged is **not** proof the person is online.
- Per-game best score, accepted score-submission count, latest score time.

**Recent score submissions:** latest **100** rows across accounts and guests, with player name, account ID when available, game, score and timestamp. A null ID means guest or detached/deleted account attribution; names can collide. This is not an identity directory for every anonymous visitor, a live attendance monitor or a log of every move/start. Cross-game scores are not comparable, and public solo submissions are trust-based.

| Action | Effect / caution |
|---|---|
| Block | Sets account block, destroys login sessions, revokes room capabilities/transfers host to other humans, excludes attributed scores from public rankings. Account remains stored. Not an IP/device ban; the person can still visit as a guest. |
| Unblock | Restores account eligibility/ranking visibility. Does not restore destroyed sessions or revoked old room tokens; sign in/rejoin again. |
| Wipe scores | **Permanent deletion** of that account's score rows, after confirmation. Does not delete the account or historical game-log records. |
| Delete account | **Permanent deletion** of the account, sessions and its score rows after confirmation; other players remain. Historical logs/names remain with account links detached. Not a complete privacy-data erasure operation. |

Admin-account destructive buttons are disabled in the UI; the server also prevents deleting/blocking your own administrative account. Use trusted SQL to manage administrator grants. No passwords/hashes, raw sessions, room credentials or private opponent hands are included in admin responses.

### Seven-day inactivity is separate from moderation

The selected policy is **reversible flag only**. Daily authenticated cron marks accounts whose last activity is older than seven days; it never automatically purges users/rooms/scores/logs. Successful login, actual game input or an attributed score clears the flag. Passive room polling does not count. Do **not** delete/wipe merely to clear a flag or claim that flagging frees significant storage.

Rooms are still retained through disconnection/inactivity. The stored-room count includes both room engines, including retained finished/abandoned rooms; it is not an online-player count. If moderation removes the only human, the room can remain unowned for owner review rather than expiring automatically.

## 6. Deployment and verification for this revision

1. Back up DB. If coming from the earlier pre-room-controls upgraded installation, run **`sql/upgrade-room-access.sql`** as owner. From the room-controls release, this tab/home update needs no SQL. Repeat execution is harmless. Other starting schemas: HANDOVER §3.
2. Overlay the complete `TTYARCADE-tabs-update.zip` source in a reviewed branch, preserving `.git` and private env; follow PUBLISHING.md.
3. `npm ci`, lint, typecheck, unit tests, production build. Deploy on Node 22 LTS (recommended); test execution here used Node 20.20.2/PostgreSQL17/ChromiumLinux.
4. Confirm all six room flows, wrong-password rejection, kick/rejoin and refresh. Promote only your own administrator, open `/admin`, toggle each ad flag and inspect account activity. Test preview against a separate DB.
5. Ads remain off unless you deliberately change hosting configuration. No actual cloud deployment/Google approval is claimed.

New repeatable checks, **disposable database only** (export test credentials securely; do not write them into Git):

```bash
# Running production test server using the SAME isolated DB:
# export ALLOW_DATABASE_TESTS=1 TEST_DATABASE_URL=... TEST_CRON_SECRET=...
npm run test:access
npm run test:access-browser
```

New checks: **8/8 API scenarios**, password and kick/rejoin browser flows for **all six** online games, admin authorization/ad persistence/activity UI, pending-eight kick, fresh/repeat/previous-release SQL migration. Earlier full gameplay/retention/all-19-game checks were rerun and passed; see `audit/access/`. No exhaustive load/soak/mobile/gamepad/anti-cheat certification. Five high development-only dependency advisories remain; production audit clean at the recorded snapshot.
