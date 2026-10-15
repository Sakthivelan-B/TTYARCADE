# File inventory / home and single-tab revision

Compared with delivered TTYARCADE-room-controls.zip. Latest evidence: audit/tabs/. Other audit directories are retained historical evidence. Changed files received relevant types/build/API/browser checks; this inventory does not assert an exhaustive line-by-line security review or every-level/hardware/soak coverage. See HANDOVER and audit/tabs/RELEASE.md.

| File | Scope |
|---|---|
| `.env.example` | Preserved baseline; regression exercised where applicable |
| `.gitignore` | Preserved baseline; regression exercised where applicable |
| `.nvmrc` | Preserved baseline; regression exercised where applicable |
| `ADMIN_GUIDE.md` | Changed in this revision |
| `HANDOVER.md` | Changed in this revision |
| `PUBLISHING.md` | Changed in this revision |
| `README.md` | Changed in this revision |
| `audit/access/RELEASE.md` | Previous verification retained |
| `audit/access/ads-off.txt` | Previous verification retained |
| `audit/access/all-games-browser.txt` | Previous verification retained |
| `audit/access/api.txt` | Previous verification retained |
| `audit/access/baseline-api.txt` | Previous verification retained |
| `audit/access/browser.txt` | Previous verification retained |
| `audit/access/build.txt` | Previous verification retained |
| `audit/access/lint.txt` | Previous verification retained |
| `audit/access/multiplayer-api.txt` | Previous verification retained |
| `audit/access/multiplayer-browser.txt` | Previous verification retained |
| `audit/access/npm-audit-production.json` | Previous verification retained |
| `audit/access/npm-audit.json` | Previous verification retained |
| `audit/access/retention-api.txt` | Previous verification retained |
| `audit/access/retention-browser.txt` | Previous verification retained |
| `audit/access/routes-browser.txt` | Previous verification retained |
| `audit/access/schema.txt` | Previous verification retained |
| `audit/access/typecheck.txt` | Previous verification retained |
| `audit/access/unit.txt` | Previous verification retained |
| `audit/access/upgrade-sql.txt` | Previous verification retained |
| `audit/api-tests.txt` | Previous verification retained |
| `audit/browser-tests.txt` | Previous verification retained |
| `audit/build.txt` | Previous verification retained |
| `audit/database-tests.txt` | Previous verification retained |
| `audit/drizzle-config-test.txt` | Previous verification retained |
| `audit/existing-database-test.txt` | Previous verification retained |
| `audit/lint.txt` | Previous verification retained |
| `audit/npm-audit-production.json` | Previous verification retained |
| `audit/npm-audit.json` | Previous verification retained |
| `audit/tabs/RELEASE.md` | Latest verification evidence |
| `audit/tabs/access-api.txt` | Latest verification evidence |
| `audit/tabs/access-browser.txt` | Latest verification evidence |
| `audit/tabs/ads-off.txt` | Latest verification evidence |
| `audit/tabs/all-games-browser.txt` | Latest verification evidence |
| `audit/tabs/baseline-api.txt` | Latest verification evidence |
| `audit/tabs/browser.txt` | Latest verification evidence |
| `audit/tabs/build.txt` | Latest verification evidence |
| `audit/tabs/lint.txt` | Latest verification evidence |
| `audit/tabs/multiplayer-api.txt` | Latest verification evidence |
| `audit/tabs/multiplayer-browser.txt` | Latest verification evidence |
| `audit/tabs/retention-api.txt` | Latest verification evidence |
| `audit/tabs/retention-browser.txt` | Latest verification evidence |
| `audit/tabs/routes-browser.txt` | Latest verification evidence |
| `audit/tabs/typecheck.txt` | Latest verification evidence |
| `audit/tabs/unit.txt` | Latest verification evidence |
| `audit/typecheck.txt` | Previous verification retained |
| `audit/unit-tests.txt` | Previous verification retained |
| `audit/upgrade/ads-blocked.txt` | Previous verification retained |
| `audit/upgrade/ads-db-kill-switch.txt` | Previous verification retained |
| `audit/upgrade/ads-live-mocked.txt` | Previous verification retained |
| `audit/upgrade/ads-off.txt` | Previous verification retained |
| `audit/upgrade/ads-placeholder.txt` | Previous verification retained |
| `audit/upgrade/all-games-browser.txt` | Previous verification retained |
| `audit/upgrade/api-tests.txt` | Previous verification retained |
| `audit/upgrade/browser-tests.txt` | Previous verification retained |
| `audit/upgrade/build.txt` | Previous verification retained |
| `audit/upgrade/lint.txt` | Previous verification retained |
| `audit/upgrade/main-remote-commit.txt` | Previous verification retained |
| `audit/upgrade/multiplayer-api.txt` | Previous verification retained |
| `audit/upgrade/multiplayer-browser.txt` | Previous verification retained |
| `audit/upgrade/multiplayer-migration.txt` | Previous verification retained |
| `audit/upgrade/npm-audit-production.json` | Previous verification retained |
| `audit/upgrade/npm-audit.json` | Previous verification retained |
| `audit/upgrade/prior-schema-upgrade.txt` | Previous verification retained |
| `audit/upgrade/reference-commit.txt` | Previous verification retained |
| `audit/upgrade/retention-browser.txt` | Previous verification retained |
| `audit/upgrade/retention-tests.txt` | Previous verification retained |
| `audit/upgrade/sql-bootstrap.txt` | Previous verification retained |
| `audit/upgrade/sql-idempotent.txt` | Previous verification retained |
| `audit/upgrade/theme-preservation.txt` | Previous verification retained |
| `audit/upgrade/typecheck.txt` | Previous verification retained |
| `audit/upgrade/unit-tests.txt` | Previous verification retained |
| `audit/upstream-commit.txt` | Previous verification retained |
| `drizzle.config.ts` | Preserved baseline; regression exercised where applicable |
| `eslint.config.mjs` | Preserved baseline; regression exercised where applicable |
| `next.config.ts` | Preserved baseline; regression exercised where applicable |
| `package-lock.json` | Preserved baseline; regression exercised where applicable |
| `package.json` | Changed in this revision |
| `postcss.config.mjs` | Preserved baseline; regression exercised where applicable |
| `sql/existing-database.sql` | Preserved baseline; regression exercised where applicable |
| `sql/schema.sql` | Preserved baseline; regression exercised where applicable |
| `sql/upgrade-multiplayer-rules.sql` | Preserved baseline; regression exercised where applicable |
| `sql/upgrade-retention-ads.sql` | Preserved baseline; regression exercised where applicable |
| `sql/upgrade-room-access.sql` | Preserved baseline; regression exercised where applicable |
| `src/app/account/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/admin/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/api/activity/route.ts` | Preserved baseline; regression exercised where applicable |
| `src/app/api/admin/ads/route.ts` | Preserved baseline; regression exercised where applicable |
| `src/app/api/admin/users/route.ts` | Preserved baseline; regression exercised where applicable |
| `src/app/api/auth/login/route.ts` | Preserved baseline; regression exercised where applicable |
| `src/app/api/auth/me/route.ts` | Preserved baseline; regression exercised where applicable |
| `src/app/api/auth/register/route.ts` | Preserved baseline; regression exercised where applicable |
| `src/app/api/cards/rooms/[code]/action/route.ts` | Preserved baseline; regression exercised where applicable |
| `src/app/api/cards/rooms/[code]/join/route.ts` | Preserved baseline; regression exercised where applicable |
| `src/app/api/cards/rooms/[code]/route.ts` | Preserved baseline; regression exercised where applicable |
| `src/app/api/cards/rooms/[code]/start/route.ts` | Preserved baseline; regression exercised where applicable |
| `src/app/api/cards/rooms/route.ts` | Preserved baseline; regression exercised where applicable |
| `src/app/api/cron/cleanup/route.ts` | Preserved baseline; regression exercised where applicable |
| `src/app/api/health/route.ts` | Preserved baseline; regression exercised where applicable |
| `src/app/api/rooms/[code]/route.ts` | Preserved baseline; regression exercised where applicable |
| `src/app/api/rooms/route.ts` | Preserved baseline; regression exercised where applicable |
| `src/app/api/scores/route.ts` | Preserved baseline; regression exercised where applicable |
| `src/app/games/2048/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/codebreaker/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/connect4/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/crazy8/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/crazy8/rules/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/lights/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/math/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/matrix/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/maze/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/memory/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/minesweeper/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/numbers/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/odd/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/pong/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/scramble/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/sequence/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/slide/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/snake/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/tictactoe/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/games/typing/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/globals.css` | Preserved baseline; regression exercised where applicable |
| `src/app/layout.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/leaderboard/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/login/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/app/page.tsx` | Changed in this revision |
| `src/app/settings/page.tsx` | Preserved baseline; regression exercised where applicable |
| `src/components/Card.tsx` | Preserved baseline; regression exercised where applicable |
| `src/components/ads/AdSlot.tsx` | Preserved baseline; regression exercised where applicable |
| `src/components/ads/PromotionPlacement.tsx` | Preserved baseline; regression exercised where applicable |
| `src/components/multi.tsx` | Preserved baseline; regression exercised where applicable |
| `src/components/room-access.tsx` | Preserved baseline; regression exercised where applicable |
| `src/components/term.tsx` | Changed in this revision |
| `src/db/index.ts` | Preserved baseline; regression exercised where applicable |
| `src/db/schema.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/2048.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/activity.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/ad-consent.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/ads.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/auth.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/board-rules.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/bots.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/cards.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/clock.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/controls.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/game-tab.tsx` | Added in this revision |
| `src/lib/games.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/http.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/levels.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/memory-rules.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/online-games.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/player.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/race-rules.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/rate-limit.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/room-access.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/room-lifecycle.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/snake.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/storage.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/use-game-activity.ts` | Preserved baseline; regression exercised where applicable |
| `src/lib/words.ts` | Preserved baseline; regression exercised where applicable |
| `tests/access-browser.mjs` | Preserved baseline; regression exercised where applicable |
| `tests/access.test.mjs` | Preserved baseline; regression exercised where applicable |
| `tests/ads-browser.mjs` | Preserved baseline; regression exercised where applicable |
| `tests/all-games-browser.mjs` | Preserved baseline; regression exercised where applicable |
| `tests/api.test.mjs` | Preserved baseline; regression exercised where applicable |
| `tests/browser.mjs` | Preserved baseline; regression exercised where applicable |
| `tests/multiplayer-api.mjs` | Preserved baseline; regression exercised where applicable |
| `tests/multiplayer-browser.mjs` | Preserved baseline; regression exercised where applicable |
| `tests/retention-browser.mjs` | Preserved baseline; regression exercised where applicable |
| `tests/tabs-browser.mjs` | Added in this revision |
| `tests/unit.test.ts` | Preserved baseline; regression exercised where applicable |
| `tests/upgrade.test.mjs` | Preserved baseline; regression exercised where applicable |
| `tsconfig.json` | Preserved baseline; regression exercised where applicable |
| `vercel.json` | Preserved baseline; regression exercised where applicable |
