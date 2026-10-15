# Publish the TTYARCADE upgrade

New release: **TTYARCADE-room-controls.zip** (not the previous TTYARCADE-final.zip). Complete architecture, exact environment/provider URI instructions, SQL choice, AdSense/CMP, refresh/leave behavior, seven-day flags, Vercel/Render deployment and limits: **[HANDOVER.md](HANDOVER.md)**.

**Already running the previous upgraded ZIP?** Back up and run `sql/upgrade-room-access.sql` first. See **ADMIN_GUIDE.md** for room access, admin setup and ads/player management. This full archive includes the earlier upgrades as well.

## 1. Review against current GitHub before applying

Compared public main at `7a1aa47b424db0a46fab3bc5162356ca96ab30be`. Upstream may have changed since this audit. Authenticate with an authorized GitHub account using a credential manager or SSH; do not embed a token in a URL.

```bash
git clone https://github.com/Sakthivelan-B/TTYARCADE.git
cd TTYARCADE
git fetch origin
git switch -c upgrade/room-access-admin
git log -1 --oneline
```

Extract the ZIP **outside** the clone; its top-level directory is `TTYARCADE/`. Preserve clone `.git` and any private environment files. An overlay does not remove obsolete tracked files:

```bash
unzip ~/Downloads/TTYARCADE-room-controls.zip -d ../ttyarcade-release
rsync -av --exclude='.git' --exclude='.env' ../ttyarcade-release/TTYARCADE/ ./
git rm --ignore-unmatch drizzle.config.json
```

On Windows extract/copy all contents, including `.gitignore`, `.env.example`, `.nvmrc`, preserving `.git`; remove obsolete `drizzle.config.json` if present. If remote has newer work, merge selectively, not a blind overwrite. The optional `TTYARCADE-room-controls.patch` is relative to the previous delivered TTYARCADE-upgraded.zip, SHA-256 `dc63e82d5009a0ceaa8fbe529408b07651716dbb7b1f4888b0ba134359670c0b`; it is not a cumulative patch against original main. Use `git apply --check` first on that exact extracted baseline. Do not apply the patch on top of the ZIP overlay.

## 2. Initialize or migrate DB BEFORE running new code

Back up and test on an isolated branch/restore. Choose exactly one initial route from HANDOVER §3:

- Previous upgraded database with room version/ads/retention: **`sql/upgrade-room-access.sql`**.
- Empty database: `sql/schema.sql` once.
- Original seven-table schema: `sql/existing-database.sql` once.
- Previous audited database: **`sql/upgrade-retention-ads.sql`** (repeat-safe, includes version).
- Already on the retention/ads upgrade but missing room version: `sql/upgrade-multiplayer-rules.sql`, then `sql/upgrade-room-access.sql`.

Run with SQL Editor as owner or `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/FILE.sql`, replacing FILE. Root `.env` is not automatically sourced by psql. Never run fresh schema on an initialized production DB. Preserve backups; scripts are not downgrades.

## 3. Verify and publish branch

```bash
nvm install
nvm use
npm ci
cp .env.example .env
# Fill local disposable DATABASE_URL and CRON_SECRET; leave ads off.
npm run lint
npm run typecheck
npm run test:unit
npm run build
# In a separate terminal: npm run start
npm test
npx playwright install --with-deps chromium
npm run test:browser
npm run test:all-games-browser
npm run test:retention-browser
npm run test:multiplayer-browser
# Securely export test-only ALLOW_DATABASE_TESTS=1, TEST_DATABASE_URL,
# TEST_CRON_SECRET matching that isolated server, then:
npm run test:upgrade
npm run test:multiplayer-api
npm run test:access
npm run test:access-browser
npm audit --omit=dev
```

Then review **new files as well as tracked diffs**:

```bash
git status --short
git diff --check
git diff
git add -A
git diff --cached --stat
git diff --cached
# STOP if you see a real .env, password, token, DB dump or credentials.
git commit -m "Preserve rooms, flag inactive accounts, add optional ads and validate multiplayer rules"
git remote -v
# Confirm origin is the intended repository, then:
git push -u origin upgrade/room-access-admin
```

Open a pull request, review/resolve newer remote changes, pass checks and merge into the repository's actual default branch. Do not force-push. If you lack write access, push a fork and open a PR. This agent has not pushed anything.

## 4. Deploy and accept

| Host | Build | Runtime |
|---|---|---|
| Vercel | Next.js preset, Node 22.x, `npm ci`, `npm run build` | Framework default, no static export |
| Render Web Service | Node 22, `npm ci && npm run build` | `npm run start -- --hostname 0.0.0.0 --port $PORT` |

Configure server **DATABASE_URL**, **CRON_SECRET** and optional public ads env in the hosting dashboard. Use separate preview/production DBs. Rebuild after public env changes. See HANDOVER §7 for full steps; no cloud deployment was exercised here.

Owner acceptance after HTTPS deployment:

- `/api/health` is 200; guest can play without login.
- Two separate browsers create/join/start; Memory shows **both** cards before mismatch resolution.
- Refresh/offline tabs retain room/seat/hand; explicit leave transfers host; host close/last explicit leave deletes room.
- Optional login, score attribution and SQL-promoted administrator work.
- Daily authenticated cron flags old accounts, deletes expired sessions, **deletes no rooms/users/scores/logs**. Vercel schedule is 04:00 UTC; Render requires its own scheduled call.
- Ads stay off unless deliberately configured. If enabling live, finish real CMP/site approval/privacy/ads.txt first, disable Auto ads, verify consent before network loading. Live Google creatives cannot be guaranteed monochrome.

## 5. Rollback and clean archive

Select previous provider deployment or `git revert` the reviewed merge commit. Do not blindly revert/overwrite schema; retain tested additive columns or use an owner-reviewed migration/backup restore. Never use bootstrap SQL for rollback.

ZIP includes source, lockfile, docs, SQL, regression tests and audit evidence. It excludes `.git`, `.env`, dependencies, `.next`, database/browser data and caches. The accompanying SHA-256 file detects archive corruption, not malicious provenance. See HANDOVER §8 for remaining trust-based score, rate-limit, storage and test-coverage limitations.
