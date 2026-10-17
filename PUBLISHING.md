# Publish TTYARCADE — 70-game release

Complete source ZIP: **TTYARCADE-70-games.zip**. Read **HANDOVER.md** first. This release adds 51 new games without replacing the existing 19. It does not include a GitHub push or hosted deployment.

## 1. Review and apply

Compared upstream main at **83e5309f09e5aceeec802603579ba3c435e449d0** on 16 October 2026. Against the prior delivered tabs source, upstream’s only different source file was the completed Code Breaker fix, which is retained. Upstream can change again; review rather than blindly overwriting newer work.

```bash
git clone https://github.com/Sakthivelan-B/TTYARCADE.git
cd TTYARCADE
git fetch origin
git switch -c expansion/70-games
git log -1 --oneline
```

Extract the ZIP outside the clone. Its top-level folder is `TTYARCADE/`; HANDOVER.md is at that repository root. Preserve the clone’s `.git` and ALL real environment files:

```bash
unzip ~/Downloads/TTYARCADE-70-games.zip -d ../ttyarcade-release
rsync -av --exclude='.git' --exclude='.env' --exclude='.env.local' \
  --exclude='.env.production' --exclude='.env.production.local' \
  ../ttyarcade-release/TTYARCADE/ ./
```

An overlay does not delete obsolete files. After making an external backup, remove old **audit reports only** so they do not look like current verification, then copy the packaged `audit/` folder. Current follow-up results are in `audit/sequence-review/`; `audit/expansion/` is the retained previous-release baseline. Do not delete source/tests/SQL migrations. Remove obsolete `drizzle.config.json` if present; the supported config is `drizzle.config.ts`. On Windows copy hidden `.gitignore`, `.env.example` and `.nvmrc` too, without replacing `.git` or private `.env*` files. No patch or intermediate ZIP needs applying first.

## 2. Database first

Back up and test on a disposable restore. For the current room-controls/tabs/Code Breaker database, **no migration is needed for this expansion**. Existing rooms, accounts and scores use the same schema.

| Starting point | SQL |
|---|---|
| Empty/new database | `sql/schema.sql` once |
| Original seven-table schema, before audited logging/security | `sql/existing-database.sql` once |
| Previous audited schema, before retention/ads | `sql/upgrade-retention-ads.sql` |
| Has retention/ads but not room-version column | `sql/upgrade-multiplayer-rules.sql`, then `sql/upgrade-room-access.sql` |
| Has retention/ads/version but no room passwords | `sql/upgrade-room-access.sql` |
| Already has room-password columns and current schema | no SQL change |

Run the correct complete script as the trusted database owner, before deployment. CLI: `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/FILE.sql`. Next’s `.env` is not automatically read by psql. Never use the fresh bootstrap as an upgrade/rollback. Keep older migration files: they are needed installation paths, not unwanted old code.

## 3. Build and test

```bash
nvm install
nvm use
npm ci
cp .env.example .env
# Configure isolated DATABASE_URL + CRON_SECRET; ads off.
npm run lint
npm run typecheck
npm run test:unit
npm run test:pack
npm run build
# Separate terminal: npm run start
npx playwright install --with-deps chromium
npm test
npm run test:browser
npm run test:all-games-browser
npm run test:pack-browser
npm run test:pack-online-browser
npm run test:war-browser
npm run test:multiplayer-browser
npm run test:retention-browser
npm run test:tabs-browser
# Securely export ALLOW_DATABASE_TESTS=1, TEST_DATABASE_URL,
# TEST_CRON_SECRET matching the isolated running server, then:
npm run test:pack-api
npm run test:multiplayer-api
npm run test:upgrade
npm run test:access
npm run test:access-browser
TEST_BASE_URL=http://127.0.0.1:3000 TEST_AD_MODE=off npm run test:ads
npm audit --omit=dev
```

Database/API mutation tests must NEVER target production. HANDOVER §8 explains coverage and limitations. Review all new files, not only tracked diffs:

```bash
git status --short
git diff --check
git diff
git add -A
git diff --cached --stat
git diff --cached
# Stop if secrets, a DB dump, node_modules or build output appear.
git commit -m "Add 51 games, private online engines, catalog filters and collapsed help"
git remote -v
# Verify origin before pushing with your own authorized credentials:
git push -u origin expansion/70-games
```

Open/review a pull request and merge to the repository’s real default branch. Do not force-push; use a fork if you lack repository write access. Do not embed access tokens in URLs.

## 4. Deploy

| Host | Build | Runtime |
|---|---|---|
| Vercel | Next.js preset, Node 22.x, `npm ci`, `npm run build` | Framework default; NOT static export |
| Render Web Service | Node 22, `npm ci && npm run build` | `npm run start -- --hostname 0.0.0.0 --port $PORT` |

Set server-only DATABASE_URL and CRON_SECRET in the hosting dashboard; optional public ad variables require rebuilding. Use separate preview/production databases. Leave `TTYARCADE_EMBED_PREVIEW` unset on a normal production site; the `1` option is only for trusted embedded previews and must be set at both build and start (Next records headers during build). Browser requests use same-origin relative URLs, never sandbox localhost addresses.

Owner acceptance after HTTPS deployment:

- `/api/health` returns 200; guest can play without login; catalog shows 70 games.
- Rummy works for two browsers and larger groups; each player sees only their own hand. Draw/discard/declaration rules hold. Optional jokers survive refresh/rematch.
- Fleet Battle hides enemy ships. Mission briefing reaches only its current seat and disappears after sealing. No raw-state/debug endpoint is present.
- Original Memory shows both cards; Code Breaker retains one secret/history per round.
- Refresh/offline tabs retain seats. Explicit leave/kick ends a NEW game round but retains the room; host can invite replacements/rematch. Last explicit human leave or host close deletes it. Kicked users can rejoin.
- New game tab returns the older same-profile game tab home without server leave/logout. Different devices/profiles remain independent.
- Optional login, score attribution and SQL-promoted `/admin` work. Daily authenticated cron flags inactive accounts and deletes expired sessions, not rooms/users/scores/logs.
- Ads remain off unless deliberately configured; enabling live requires real CMP/site approval/privacy/ads.txt and Auto ads disabled. External creatives cannot be guaranteed monochrome.

No real cloud deployment, provider account access or Google approval was exercised here.

## 5. Rollback / archive hygiene

Use the previous provider deployment or an owner-reviewed `git revert`. Keep compatible additive columns; these SQL scripts are not downgrades. Preserve database backups and credentials. Do not roll the live database back just to remove games.

The ZIP contains source, lockfile, current docs, necessary SQL paths, tests and current audit evidence. It excludes `.git`, every private `.env*` (except `.env.example`), dependencies, `.next`, caches, scratch files, earlier archives and database/browser state. The final checksum detects corruption, not malicious provenance. Optional scores/logs/abandoned rooms still need an owner-approved storage policy; reversible inactive flags do not substantially reclaim storage.
