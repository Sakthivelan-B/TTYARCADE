# Release file inventory / review scope

15 October 2026. This is an inventory, not a claim that every file received a fresh line-by-line security proof. Previous audited code was preserved; upgrade changes were reviewed with lint/types/build, SQL tests, API tests and browser gameplay checks. Upstream comparison: `7a1aa47b424db0a46fab3bc5162356ca96ab30be`.

New verification is in `audit/upgrade/`. Older top-level audit artifacts belong to the previous release and are historical, not the latest pass counts. Complete coverage/limits: HANDOVER §8. No cloud deployment, exhaustive all-level, real-hardware, or anti-cheat certification.

| File | Release status / evidence |
|---|---|
| `.env.example` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `.gitignore` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `.nvmrc` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `HANDOVER.md` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `PUBLISHING.md` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `README.md` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `audit/api-tests.txt` | Historical previous-audit evidence; retained |
| `audit/browser-tests.txt` | Historical previous-audit evidence; retained |
| `audit/build.txt` | Historical previous-audit evidence; retained |
| `audit/database-tests.txt` | Historical previous-audit evidence; retained |
| `audit/drizzle-config-test.txt` | Historical previous-audit evidence; retained |
| `audit/existing-database-test.txt` | Historical previous-audit evidence; retained |
| `audit/lint.txt` | Historical previous-audit evidence; retained |
| `audit/npm-audit-production.json` | Historical previous-audit evidence; retained |
| `audit/npm-audit.json` | Historical previous-audit evidence; retained |
| `audit/typecheck.txt` | Historical previous-audit evidence; retained |
| `audit/unit-tests.txt` | Historical previous-audit evidence; retained |
| `audit/upgrade/ads-blocked.txt` | Upgrade verification evidence |
| `audit/upgrade/ads-db-kill-switch.txt` | Upgrade verification evidence |
| `audit/upgrade/ads-live-mocked.txt` | Upgrade verification evidence |
| `audit/upgrade/ads-off.txt` | Upgrade verification evidence |
| `audit/upgrade/ads-placeholder.txt` | Upgrade verification evidence |
| `audit/upgrade/all-games-browser.txt` | Upgrade verification evidence |
| `audit/upgrade/api-tests.txt` | Upgrade verification evidence |
| `audit/upgrade/browser-tests.txt` | Upgrade verification evidence |
| `audit/upgrade/build.txt` | Upgrade verification evidence |
| `audit/upgrade/lint.txt` | Upgrade verification evidence |
| `audit/upgrade/main-remote-commit.txt` | Upgrade verification evidence |
| `audit/upgrade/multiplayer-api.txt` | Upgrade verification evidence |
| `audit/upgrade/multiplayer-browser.txt` | Upgrade verification evidence |
| `audit/upgrade/multiplayer-migration.txt` | Upgrade verification evidence |
| `audit/upgrade/npm-audit-production.json` | Upgrade verification evidence |
| `audit/upgrade/npm-audit.json` | Upgrade verification evidence |
| `audit/upgrade/prior-schema-upgrade.txt` | Upgrade verification evidence |
| `audit/upgrade/reference-commit.txt` | Upgrade verification evidence |
| `audit/upgrade/retention-browser.txt` | Upgrade verification evidence |
| `audit/upgrade/retention-tests.txt` | Upgrade verification evidence |
| `audit/upgrade/sql-bootstrap.txt` | Upgrade verification evidence |
| `audit/upgrade/sql-idempotent.txt` | Upgrade verification evidence |
| `audit/upgrade/theme-preservation.txt` | Upgrade verification evidence |
| `audit/upgrade/typecheck.txt` | Upgrade verification evidence |
| `audit/upgrade/unit-tests.txt` | Upgrade verification evidence |
| `audit/upstream-commit.txt` | Historical previous-audit evidence; retained |
| `drizzle.config.ts` | Carried from previous audited baseline; regression checked where exercised |
| `eslint.config.mjs` | Carried from previous audited baseline; regression checked where exercised |
| `next.config.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `package-lock.json` | Carried from previous audited baseline; regression checked where exercised |
| `package.json` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `postcss.config.mjs` | Carried from previous audited baseline; regression checked where exercised |
| `sql/existing-database.sql` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `sql/schema.sql` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `sql/upgrade-multiplayer-rules.sql` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `sql/upgrade-retention-ads.sql` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/account/page.tsx` | Carried from previous audited baseline; regression checked where exercised |
| `src/app/admin/page.tsx` | Carried from previous audited baseline; regression checked where exercised |
| `src/app/api/activity/route.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/api/admin/users/route.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/api/auth/login/route.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/api/auth/me/route.ts` | Carried from previous audited baseline; regression checked where exercised |
| `src/app/api/auth/register/route.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/api/cards/rooms/[code]/action/route.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/api/cards/rooms/[code]/join/route.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/api/cards/rooms/[code]/route.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/api/cards/rooms/[code]/start/route.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/api/cards/rooms/route.ts` | Carried from previous audited baseline; regression checked where exercised |
| `src/app/api/cron/cleanup/route.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/api/health/route.ts` | Carried from previous audited baseline; regression checked where exercised |
| `src/app/api/rooms/[code]/route.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/api/rooms/route.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/api/scores/route.ts` | Carried from previous audited baseline; regression checked where exercised |
| `src/app/games/2048/page.tsx` | Carried from previous audited baseline; regression checked where exercised |
| `src/app/games/codebreaker/page.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/games/connect4/page.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/games/crazy8/page.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/games/crazy8/rules/page.tsx` | Carried from previous audited baseline; regression checked where exercised |
| `src/app/games/lights/page.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/games/math/page.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/games/matrix/page.tsx` | Carried from previous audited baseline; regression checked where exercised |
| `src/app/games/maze/page.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/games/memory/page.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/games/minesweeper/page.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/games/numbers/page.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/games/odd/page.tsx` | Carried from previous audited baseline; regression checked where exercised |
| `src/app/games/pong/page.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/games/scramble/page.tsx` | Carried from previous audited baseline; regression checked where exercised |
| `src/app/games/sequence/page.tsx` | Carried from previous audited baseline; regression checked where exercised |
| `src/app/games/slide/page.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/games/snake/page.tsx` | Carried from previous audited baseline; regression checked where exercised |
| `src/app/games/tictactoe/page.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/games/typing/page.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/globals.css` | Carried from previous audited baseline; regression checked where exercised |
| `src/app/layout.tsx` | Carried from previous audited baseline; regression checked where exercised |
| `src/app/leaderboard/page.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/login/page.tsx` | Carried from previous audited baseline; regression checked where exercised |
| `src/app/page.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/app/settings/page.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/components/Card.tsx` | Carried from previous audited baseline; regression checked where exercised |
| `src/components/ads/AdSlot.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/components/ads/PromotionPlacement.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/components/multi.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/components/term.tsx` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/db/index.ts` | Carried from previous audited baseline; regression checked where exercised |
| `src/db/schema.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/lib/2048.ts` | Carried from previous audited baseline; regression checked where exercised |
| `src/lib/activity.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/lib/ad-consent.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/lib/ads.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/lib/auth.ts` | Carried from previous audited baseline; regression checked where exercised |
| `src/lib/board-rules.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/lib/bots.ts` | Carried from previous audited baseline; regression checked where exercised |
| `src/lib/cards.ts` | Carried from previous audited baseline; regression checked where exercised |
| `src/lib/clock.ts` | Carried from previous audited baseline; regression checked where exercised |
| `src/lib/controls.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/lib/games.ts` | Carried from previous audited baseline; regression checked where exercised |
| `src/lib/http.ts` | Carried from previous audited baseline; regression checked where exercised |
| `src/lib/levels.ts` | Carried from previous audited baseline; regression checked where exercised |
| `src/lib/memory-rules.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/lib/online-games.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/lib/player.ts` | Carried from previous audited baseline; regression checked where exercised |
| `src/lib/race-rules.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/lib/rate-limit.ts` | Carried from previous audited baseline; regression checked where exercised |
| `src/lib/room-lifecycle.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/lib/snake.ts` | Carried from previous audited baseline; regression checked where exercised |
| `src/lib/storage.ts` | Carried from previous audited baseline; regression checked where exercised |
| `src/lib/use-game-activity.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `src/lib/words.ts` | Carried from previous audited baseline; regression checked where exercised |
| `tests/ads-browser.mjs` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `tests/all-games-browser.mjs` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `tests/api.test.mjs` | Carried from previous audited baseline; regression checked where exercised |
| `tests/browser.mjs` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `tests/multiplayer-api.mjs` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `tests/multiplayer-browser.mjs` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `tests/retention-browser.mjs` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `tests/unit.test.ts` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `tests/upgrade.test.mjs` | Upgrade-added/changed; relevant build, API, SQL and/or gameplay checks |
| `tsconfig.json` | Carried from previous audited baseline; regression checked where exercised |
| `vercel.json` | Carried from previous audited baseline; regression checked where exercised |
