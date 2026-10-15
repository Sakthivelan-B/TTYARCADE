# ttyarcade

**Planned address:** https://ttyarcade.vercel.app (free), with `ttyarcade.com` as the custom domain once you register it (see PUBLISHING.md §0.5).

A text-only, black-and-white game website that looks like a Linux terminal.
No images, no colors, instant load.

- **19 games:** Crazy Eights (online, 2-10 players), 13 endless level games
  whose levels are newly generated every time, and the classics XoX, Connect Four, 2048 and Pong.
- **Play modes:** solo, same device (2-10 players), vs CPU, or online rooms with a 5-letter code.
  If nobody joins within about 9 seconds, a random-named CPU player fills the seat.
  A human who joins later takes that seat over.
- **Optional accounts** with saved score tracking, plus an **admin panel** to block, unblock or delete users.
- **Settings:** dark / medium / light theme, remappable keys, and joystick (gamepad) support.

## Quick start (local)

Requirements: **Node.js 20.9+** and **PostgreSQL 14+**. Use a local install, Docker, or a free Neon database.

```bash
npm install
cp .env.example .env            # then put your DATABASE_URL in .env
npx drizzle-kit push --dialect=postgresql --schema=./src/db/schema.ts --url="$DATABASE_URL"
npm run dev                     # http://localhost:3000
```

The PostgreSQL database must already exist. A one-line Docker database for local development:

```bash
docker run -d --name ttyarcade-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=app_db -p 5432:5432 postgres:16
# DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
```

## Documentation

| File | What it is for |
|---|---|
| [`PUBLISHING.md`](./PUBLISHING.md) | Step-by-step free deployment (GitHub + Neon + Vercel): every environment variable and where to get it |
| [`HANDOVER.md`](./HANDOVER.md) | Full technical handover for the next developer or AI agent: architecture, rules, file map, APIs |
| [`.env.example`](./.env.example) | All environment variables, with explanations |

## Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm run start      # run the production build
npm run lint       # eslint
npx tsc --noEmit   # typecheck
```
