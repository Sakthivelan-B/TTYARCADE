# PUBLISHING.md - put ttyarcade online for free, step by step

> Companion to [`HANDOVER.md`](./HANDOVER.md). Free-tier limits were checked in 2026.
> Providers change their plans, so re-check the linked pricing pages before relying on a number.

**Total cost: $0.** A custom domain (~$10/year) is optional.
**Time: about 30 minutes.**

---

## 0. What you need (all free)

| # | Thing | Where to get it | Why |
|---|---|---|---|
| 1 | **GitHub account** | https://github.com/signup | Stores the code. Vercel deploys from it. |
| 2 | **Neon account** | https://neon.com (sign up with GitHub) | Free PostgreSQL database |
| 3 | **Vercel account** | https://vercel.com/signup (sign up with GitHub) | Free hosting for the Next.js app |
| 4 | **Node.js 20.9 or newer** | https://nodejs.org (LTS version) | Needed once, to create the database tables |
| 5 | **Git** (optional) | https://git-scm.com/downloads or **GitHub Desktop**: https://desktop.github.com | Uploads the code to GitHub |

Free-tier summary:

| Service | Free plan | Important limits |
|---|---|---|
| Vercel Hobby | $0, no card | **Personal / non-commercial use only.** ~100 GB transfer, 1M function calls, 4 h active CPU per month. Cron jobs run **once per day** at most. |
| Neon Free | $0, no card | 1 GB storage per project, 100 compute-hours per month. Sleeps after 5 min idle, so the first visit afterwards is ~1 s slower. |

---

## 0.5 Claim the name "ttyarcade" (do this first)

The project was renamed from `arcade.sh` because that domain is **already registered and in use by someone else** (it resolves to a live server).

Availability check of **`ttyarcade`**, done against the official registries when this guide was written:

| Where | Result |
|---|---|
| `ttyarcade.com` (Verisign registry) | not registered |
| `ttyarcade.net` / `ttyarcade.dev` / `ttyarcade.app` | not registered |
| `ttyarcade.vercel.app` | free |
| `github.com/ttyarcade` | free |
| npm package `ttyarcade` | free |
| Existing brand / product named "ttyarcade" | none found in a web search |

**Important:** nobody can reserve a name just by using it in code. Availability can change at any moment until **you** register it. To make the name yours, so nobody else can use it for a website:

1. **Register the domain `ttyarcade.com`** (about $10-12/year; this is the only paid step and is optional). Any registrar works, e.g. Cloudflare Registrar https://dash.cloudflare.com (sells at cost), Porkbun https://porkbun.com or Namecheap https://namecheap.com. Search "ttyarcade.com" and buy it. Turn on **auto-renew**; an expired domain can be bought by anyone.
2. **Claim the GitHub name:** create a free GitHub organization at https://github.com/organizations/plan named `ttyarcade`, and put the repository there (`github.com/ttyarcade/ttyarcade`). Or use your personal account with a repo named `ttyarcade`.
3. **Claim the free subdomain:** name the Vercel project exactly **`ttyarcade`** (step 5), and the address `https://ttyarcade.vercel.app` becomes yours for as long as the project exists.
4. **Optional, strongest protection:** a trademark stops others using the name for a similar product, which a domain alone can't do. That is a legal process with fees (US: USPTO https://www.uspto.gov/trademarks; other countries have their own office). It's only worth it if the site becomes a real brand.

---

## 1. Environment variables: names and where each one comes from

| Name | Required? | Where you get the value | Example |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | Neon dashboard → your project → **Connect** button → copy the **pooled** connection string (the host contains `-pooler`) | `postgresql://neondb_owner:AbC123@ep-cool-name-123456-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require` |
| `ADMIN_USERNAMES` | Recommended | **You choose it.** Pick the username(s) that should be admins, comma-separated. Usernames are 3-20 characters: `a-z 0-9 _ . -` | `alice` or `alice,bob` |
| `CRON_SECRET` | Optional | **You generate it.** Run `openssl rand -hex 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | `9f2c...` (64 hex characters) |

How they're used:
- **`DATABASE_URL`**: every API route and page reads the database through it. The site cannot start without it. `/api/health` returns 500 if it's wrong.
- **`ADMIN_USERNAMES`**: when someone registers with a listed username, that account becomes an admin and can open `/admin` to block, unblock or delete users and wipe scores. **If you leave it empty, the first account ever registered becomes admin.** In that case, register your own account right after the first deploy, before anyone else does.
- **`CRON_SECRET`**: protects `/api/cron/cleanup`. That job runs daily, deletes rooms idle for 6+ hours and expired login sessions, and keeps the free database small. Vercel sends it automatically as `Authorization: Bearer <CRON_SECRET>` (schedule in `vercel.json`). Without it the site works fine; the cleanup just won't run.
- `NODE_ENV` is set by the host automatically. Don't add it.

---

## 2. Run it on your computer first (optional, recommended)

```bash
# inside the unzipped project folder
npm install
cp .env.example .env        # Windows: copy .env.example .env
# open .env and paste your Neon DATABASE_URL (or a local Postgres URL)
npx drizzle-kit push --dialect=postgresql --schema=./src/db/schema.ts --url="PASTE_DATABASE_URL_HERE"
npm run dev
```

Open http://localhost:3000. The `drizzle-kit push` line creates the 7 tables:
`users`, `sessions`, `game_scores`, `rooms`, `room_players`, `card_rooms`, `card_players`.

> `drizzle.config.json` contains a local development URL. The `--url` flag overrides it, so you never need to edit that file.

---

## 3. Put the code on GitHub

**Option A: command line**
```bash
cd ttyarcade                 # the unzipped folder
git init
git add .
git commit -m "ttyarcade initial commit"
```
1. On https://github.com/new create an **empty** repository named `ttyarcade`. Don't add a README, `.gitignore` or license, because the project already has them.
2. Then run:
```bash
git remote add origin https://github.com/YOUR-NAME/ttyarcade.git
git branch -M main
git push -u origin main
```

**Option B: GitHub Desktop (no command line)**
1. In GitHub Desktop: **File → Add local repository →** choose the folder. It will offer "create a repository"; accept that.
2. Commit, then click **Publish repository**. You can choose Private or Public.

Check: the GitHub repo must **not** contain a `.env` file. `.gitignore` already excludes it.

---

## 4. Create the free database (Neon)

1. Go to https://console.neon.tech and click **New Project**.
2. Name it `ttyarcade`, choose Postgres 16 or newer, and pick the region closest to your players. Click **Create**.
3. Click **Connect** (top right of the project dashboard).
4. Make sure **Connection pooling** is ON. Copy the string; it contains `-pooler` and ends with `?sslmode=require`.
   **This is your `DATABASE_URL`.** Keep it private; it contains the password.
5. Create the tables from your computer (inside the project folder, after `npm install`):
   ```bash
   npx drizzle-kit push --dialect=postgresql --schema=./src/db/schema.ts --url="YOUR_NEON_DATABASE_URL"
   ```
   You should see `[✓] Changes applied`. Re-run this command whenever `src/db/schema.ts` changes.

---

## 5. Deploy on Vercel

1. Go to https://vercel.com/new and click **Import** next to your `ttyarcade` repository.
   If it isn't listed, click "Adjust GitHub App Permissions" and allow the repo.
2. Set **Project Name** to exactly `ttyarcade` (this gives you `https://ttyarcade.vercel.app`). The Framework Preset is detected as **Next.js**. Leave the build settings at their defaults.
3. Open **Environment Variables** and add:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | your Neon pooled URL from step 4 |
   | `ADMIN_USERNAMES` | your chosen admin username, e.g. `alice` |
   | `CRON_SECRET` | the random value you generated |

4. Click **Deploy** and wait about 1-2 minutes. Your site is live at `https://ttyarcade.vercel.app`. If Vercel adds a suffix, the subdomain was taken in the meantime; your site still works at the suffixed address, or use your own domain (step 7).
5. Open `https://YOUR-URL/api/health`. It must show `{"ok":true}`.

Changing an env var later: Vercel → Project → **Settings → Environment Variables** → edit → then **Deployments → ⋯ → Redeploy**. Env changes only apply after a redeploy.

---

## 6. First-run checklist (5 minutes)

- [ ] `/api/health` shows `{"ok":true}`
- [ ] Open `/login`, choose **register**, and use the exact username from `ADMIN_USERNAMES`. Your account page should show admin, and `/admin` should open.
- [ ] `/admin`: the user list loads. Optionally test block / unblock on a throwaway account.
- [ ] Multiplayer: open `games/tictactoe` and expand **play with friends**. Create a room, then join from a phone or incognito window using the 5-letter code.
- [ ] Stay alone in a room for about 10 s: a random-named CPU player joins and plays.
- [ ] `games/crazy8`: create a room, add a CPU player, start, and play a card.
- [ ] `/settings`: rebind a key, connect a gamepad, try all three themes.
- [ ] Cleanup job (if you set `CRON_SECRET`): Vercel → Project → **Settings → Cron Jobs** lists `/api/cron/cleanup`. To test it by hand:
      `curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://YOUR-URL/api/cron/cleanup`

---

## 7. Custom domain (optional)

- `https://ttyarcade.vercel.app` is free forever.
- To use `ttyarcade.com` (registered in step 0.5): Vercel → Project → **Settings → Domains → Add** → type `ttyarcade.com`. Also add `www.ttyarcade.com` and let Vercel redirect it to the main domain.
- Vercel shows the DNS records to create. At your registrar, typically an `A` record for `@` pointing to Vercel's IP and a `CNAME` for `www` pointing to Vercel's target. **Copy the exact values Vercel shows.** Using Cloudflare? Set those records to "DNS only" (grey cloud).
- Wait for DNS to update (usually minutes, at most 48 h). HTTPS is set up automatically and is free.

## 8. Updating the site

Every `git push` to `main` redeploys automatically. Pull requests get their own preview URL.
If you changed `src/db/schema.ts`, run the `drizzle-kit push ... --url=<prod url>` command from step 4 **before** pushing.

---

## 9. Other free hosting options

| Option | How | Trade-offs |
|---|---|---|
| **Render + Neon** | New Web Service from the GitHub repo. Build `npm install && npm run build`, start `npm run start`. Add the same env vars. | The free instance sleeps after ~15 min idle (first load ~30-50 s). No `vercel.json` cron; use https://cron-job.org (free) to call the cleanup URL with the Bearer header. |
| **Netlify + Neon** | Import the repo; Next.js is detected. Add the env vars. | Similar to Vercel. Use an external cron for cleanup. |
| **Supabase as the database** | Project → **Connect** → "Transaction pooler" string → use as `DATABASE_URL` | Free projects pause after about a week of inactivity. |
| **Self-host (VPS / Raspberry Pi)** | Node 20.9+, PostgreSQL, `npm run build && npm run start` behind Caddy or Nginx | Full control. You handle updates and backups. Use a system cron for cleanup. |

Fly.io and Railway no longer have permanent free tiers for new accounts (trial credit only).

---

## 10. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Error page, `/api/health` = 500 | `DATABASE_URL` is missing or wrong. Fix it in Vercel env vars, then **Redeploy**. |
| `relation "users" does not exist` | Tables were never created. Run step 4.5 against the **production** URL. |
| SSL / certificate error | The URL must end with `?sslmode=require` |
| "too many connections" | Use the **pooled** Neon URL (host contains `-pooler`) |
| First visit after a while is slow | Normal: Neon (and Render) wake up after idling on free tiers. |
| My account isn't admin | The username must match `ADMIN_USERNAMES` exactly (lowercase) **at registration time**. Either register a new account with the listed name, or in the Neon **SQL Editor** run `UPDATE users SET is_admin = true WHERE username = 'yourname';` |
| "too many attempts, try again in Ns" | Login/register rate limit (10 logins or 5 registrations per minute per IP). Wait, then retry. |
| Cron Jobs page empty | `vercel.json` must be in the repo root. Hobby plan crons run once per day, at the scheduled hour ±59 min. |
