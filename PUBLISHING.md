# Publishing TTYARCADE

Full configuration, provider-dashboard instructions, SQL setup, host-specific deployment and known limitations: [HANDOVER.md](HANDOVER.md).

## 1. Apply the audited ZIP to a fresh clone

Requires Git and Node 22 LTS. Authenticate with your GitHub account (SSH key, credential manager or a personal access token when Git prompts). Never put a token into a remote URL.

```bash
git clone https://github.com/Sakthivelan-B/TTYARCADE.git
cd TTYARCADE
git switch -c audit/terminal-hardening
# Extract TTYARCADE-final.zip OUTSIDE this clone first.
# Its top-level folder is TTYARCADE/. Copy that folder's CONTENTS into this
# clone, including .gitignore, .env.example and .nvmrc. Preserve clone/.git.
```

Unix/macOS example (adjust your actual download location):

```bash
unzip ~/Downloads/TTYARCADE-final.zip -d ../audited-release
rsync -av --exclude='.git' ../audited-release/TTYARCADE/ ./
# The audited release replaces this old config; an overlay cannot delete it:
git rm --ignore-unmatch drizzle.config.json
```

On Windows, enable hidden-file visibility and copy the extracted folder's contents into the clone without replacing `.git`. Delete old `drizzle.config.json` if it exists. You can also apply the supplied patch to a clone of exactly the recorded upstream commit using `git apply --check ../TTYARCADE-audit.patch` then `git apply ../TTYARCADE-audit.patch` instead of an overlay.

If you are using a working clone with local changes, first commit or stash them and fetch the upstream branch. Do not overwrite uncommitted work. Review compatibility if upstream has moved beyond `audit/upstream-commit.txt`.

## 2. Set up and validate

```bash
nvm install
nvm use
npm ci
cp .env.example .env
# Edit .env: real disposable DATABASE_URL + generated CRON_SECRET.
# Initialize that database with sql/schema.sql (new) OR
# sql/existing-database.sql (original existing seven-table schema).
# See HANDOVER.md for provider SQL Editor and psql instructions.
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm audit --omit=dev
npx playwright install --with-deps chromium
```

In terminal 1, start the production build against your disposable test DB:

```bash
npm run start
```

In terminal 2:

```bash
npm test
npm run test:browser
```

Do not run mutation tests against production. Five known high **development-only** audit findings are documented in HANDOVER.md; full `npm audit` is expected to flag them until upstream has a safe patched release. Do not use `npm audit fix --force` to downgrade Next's ESLint configuration.

## 3. Review and push

```bash
git status --short
git diff --stat
git diff --check
git diff
# .env must be ignored; this should print the .gitignore rule:
git check-ignore .env
# Stage the audited files (not .env or node_modules):
git add -A
git diff --cached --stat
git diff --cached --check
# Inspect newly added files too: git diff alone omits untracked files.
git diff --cached
# Stop if you see a real password, connection URI, token or .env.
git commit -m "Audit games, harden room APIs, enforce terminal theme and add SQL handover"
git remote -v
# Ensure origin is https://github.com/Sakthivelan-B/TTYARCADE.git
# (or your authorized SSH equivalent), then:
git push -u origin audit/terminal-hardening
```

Open the branch's pull request in GitHub, inspect all changes, pass checks and merge into the repository's actual default branch. Do not assume it is `main`; check the repository first. Do not force-push or overwrite remote work. If your account lacks write permission, push a fork and open a PR to the original repository.

After merge:

```bash
git fetch origin
# Replace ACTUAL_DEFAULT_BRANCH with the branch reported by GitHub.
git switch ACTUAL_DEFAULT_BRANCH
git pull --ff-only origin ACTUAL_DEFAULT_BRANCH
```

The branch placeholder is deliberate: substitute the actual name, not the literal placeholder. This audit did not push anything to GitHub.

## 4. Deploy

Initialize/back up the production database separately. Configure **DATABASE_URL** and **CRON_SECRET** in the host dashboard, not Git.

| Host | Build | Start / runtime |
|---|---|---|
| Vercel | `npm run build` (install `npm ci`) | Next.js preset, Node 22.x, default framework output |
| Render | `npm ci && npm run build` | `npm run start -- --hostname 0.0.0.0 --port $PORT` |
| Netlify | `npm run build` | Supported Next.js/OpenNext adapter, Node 22.x; not static export |

See HANDOVER.md §5 for complete dashboard steps and compatibility caveats. Connect the production branch, deploy, test `/api/health`, sign in, promote your admin in SQL and verify one solo score plus a two-browser room. Configure the authorized daily cleanup scheduler. Enable HTTPS before using account cookies.

## 5. Clean ZIP contents and rollback

The archive contains source, configuration, lockfile, SQL scripts, docs, tests and audit evidence. It intentionally excludes `.git`, `.env`, credentials, node_modules, `.next`, database contents, installed browser files and caches. `npm ci` and `npm run build` recreate dependencies/output after extraction.

Rollback code by reverting the merged commit or selecting the previous deployment. Back up before database work; SQL bootstraps are not rollback scripts. Never use reset/force-push as the default release recovery strategy.
