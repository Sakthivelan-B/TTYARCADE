# File inventory and review scope — room-access/admin revision

Baseline: previous delivered TTYARCADE-upgraded.zip (SHA-256 in ADMIN_GUIDE/PUBLISHING and audit/access/RELEASE.md). Files carried from prior audits were not all re-reviewed line by line; the changed paths received relevant API/SQL/types/build/browser checks. This inventory is not an exhaustive security proof. Latest verification: audit/access/. Prior audit/upgrade/ and other audit artifacts are historical.

| File | Scope |
|---|---|
| `.env.example` | Preserved prior-release file; regression exercised where applicable |
| `.gitignore` | Preserved prior-release file; regression exercised where applicable |
| `.nvmrc` | Preserved prior-release file; regression exercised where applicable |
| `ADMIN_GUIDE.md` | New revision file; relevant regression checks |
| `HANDOVER.md` | Changed this revision; relevant regression checks |
| `PUBLISHING.md` | Changed this revision; relevant regression checks |
| `README.md` | Changed this revision; relevant regression checks |
| `audit/access/RELEASE.md` | New revision test/release evidence |
| `audit/access/ads-off.txt` | New revision test/release evidence |
| `audit/access/all-games-browser.txt` | New revision test/release evidence |
| `audit/access/api.txt` | New revision test/release evidence |
| `audit/access/baseline-api.txt` | New revision test/release evidence |
| `audit/access/browser.txt` | New revision test/release evidence |
| `audit/access/build.txt` | New revision test/release evidence |
| `audit/access/lint.txt` | New revision test/release evidence |
| `audit/access/multiplayer-api.txt` | New revision test/release evidence |
| `audit/access/multiplayer-browser.txt` | New revision test/release evidence |
| `audit/access/npm-audit-production.json` | New revision test/release evidence |
| `audit/access/npm-audit.json` | New revision test/release evidence |
| `audit/access/retention-api.txt` | New revision test/release evidence |
| `audit/access/retention-browser.txt` | New revision test/release evidence |
| `audit/access/routes-browser.txt` | New revision test/release evidence |
| `audit/access/schema.txt` | New revision test/release evidence |
| `audit/access/typecheck.txt` | New revision test/release evidence |
| `audit/access/unit.txt` | New revision test/release evidence |
| `audit/access/upgrade-sql.txt` | New revision test/release evidence |
| `audit/api-tests.txt` | Prior audit evidence retained |
| `audit/browser-tests.txt` | Prior audit evidence retained |
| `audit/build.txt` | Prior audit evidence retained |
| `audit/database-tests.txt` | Prior audit evidence retained |
| `audit/drizzle-config-test.txt` | Prior audit evidence retained |
| `audit/existing-database-test.txt` | Prior audit evidence retained |
| `audit/lint.txt` | Prior audit evidence retained |
| `audit/npm-audit-production.json` | Prior audit evidence retained |
| `audit/npm-audit.json` | Prior audit evidence retained |
| `audit/typecheck.txt` | Prior audit evidence retained |
| `audit/unit-tests.txt` | Prior audit evidence retained |
| `audit/upgrade/ads-blocked.txt` | Prior audit evidence retained |
| `audit/upgrade/ads-db-kill-switch.txt` | Prior audit evidence retained |
| `audit/upgrade/ads-live-mocked.txt` | Prior audit evidence retained |
| `audit/upgrade/ads-off.txt` | Prior audit evidence retained |
| `audit/upgrade/ads-placeholder.txt` | Prior audit evidence retained |
| `audit/upgrade/all-games-browser.txt` | Prior audit evidence retained |
| `audit/upgrade/api-tests.txt` | Prior audit evidence retained |
| `audit/upgrade/browser-tests.txt` | Prior audit evidence retained |
| `audit/upgrade/build.txt` | Prior audit evidence retained |
| `audit/upgrade/lint.txt` | Prior audit evidence retained |
| `audit/upgrade/main-remote-commit.txt` | Prior audit evidence retained |
| `audit/upgrade/multiplayer-api.txt` | Prior audit evidence retained |
| `audit/upgrade/multiplayer-browser.txt` | Prior audit evidence retained |
| `audit/upgrade/multiplayer-migration.txt` | Prior audit evidence retained |
| `audit/upgrade/npm-audit-production.json` | Prior audit evidence retained |
| `audit/upgrade/npm-audit.json` | Prior audit evidence retained |
| `audit/upgrade/prior-schema-upgrade.txt` | Prior audit evidence retained |
| `audit/upgrade/reference-commit.txt` | Prior audit evidence retained |
| `audit/upgrade/retention-browser.txt` | Prior audit evidence retained |
| `audit/upgrade/retention-tests.txt` | Prior audit evidence retained |
| `audit/upgrade/sql-bootstrap.txt` | Prior audit evidence retained |
| `audit/upgrade/sql-idempotent.txt` | Prior audit evidence retained |
| `audit/upgrade/theme-preservation.txt` | Prior audit evidence retained |
| `audit/upgrade/typecheck.txt` | Prior audit evidence retained |
| `audit/upgrade/unit-tests.txt` | Prior audit evidence retained |
| `audit/upstream-commit.txt` | Prior audit evidence retained |
| `drizzle.config.ts` | Preserved prior-release file; regression exercised where applicable |
| `eslint.config.mjs` | Preserved prior-release file; regression exercised where applicable |
| `next.config.ts` | Preserved prior-release file; regression exercised where applicable |
| `package-lock.json` | Preserved prior-release file; regression exercised where applicable |
| `package.json` | Changed this revision; relevant regression checks |
| `postcss.config.mjs` | Preserved prior-release file; regression exercised where applicable |
| `sql/existing-database.sql` | Changed this revision; relevant regression checks |
| `sql/schema.sql` | Changed this revision; relevant regression checks |
| `sql/upgrade-multiplayer-rules.sql` | Preserved prior-release file; regression exercised where applicable |
| `sql/upgrade-retention-ads.sql` | Changed this revision; relevant regression checks |
| `sql/upgrade-room-access.sql` | New revision file; relevant regression checks |
| `src/app/account/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/admin/page.tsx` | Changed this revision; relevant regression checks |
| `src/app/api/activity/route.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/app/api/admin/ads/route.ts` | New revision file; relevant regression checks |
| `src/app/api/admin/users/route.ts` | Changed this revision; relevant regression checks |
| `src/app/api/auth/login/route.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/app/api/auth/me/route.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/app/api/auth/register/route.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/app/api/cards/rooms/[code]/action/route.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/app/api/cards/rooms/[code]/join/route.ts` | Changed this revision; relevant regression checks |
| `src/app/api/cards/rooms/[code]/route.ts` | Changed this revision; relevant regression checks |
| `src/app/api/cards/rooms/[code]/start/route.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/app/api/cards/rooms/route.ts` | Changed this revision; relevant regression checks |
| `src/app/api/cron/cleanup/route.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/app/api/health/route.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/app/api/rooms/[code]/route.ts` | Changed this revision; relevant regression checks |
| `src/app/api/rooms/route.ts` | Changed this revision; relevant regression checks |
| `src/app/api/scores/route.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/2048/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/codebreaker/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/connect4/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/crazy8/page.tsx` | Changed this revision; relevant regression checks |
| `src/app/games/crazy8/rules/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/lights/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/math/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/matrix/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/maze/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/memory/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/minesweeper/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/numbers/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/odd/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/pong/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/scramble/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/sequence/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/slide/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/snake/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/tictactoe/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/games/typing/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/globals.css` | Preserved prior-release file; regression exercised where applicable |
| `src/app/layout.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/leaderboard/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/login/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/app/settings/page.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/components/Card.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/components/ads/AdSlot.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/components/ads/PromotionPlacement.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/components/multi.tsx` | Changed this revision; relevant regression checks |
| `src/components/room-access.tsx` | New revision file; relevant regression checks |
| `src/components/term.tsx` | Preserved prior-release file; regression exercised where applicable |
| `src/db/index.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/db/schema.ts` | Changed this revision; relevant regression checks |
| `src/lib/2048.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/activity.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/ad-consent.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/ads.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/auth.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/board-rules.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/bots.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/cards.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/clock.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/controls.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/games.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/http.ts` | Changed this revision; relevant regression checks |
| `src/lib/levels.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/memory-rules.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/online-games.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/player.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/race-rules.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/rate-limit.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/room-access.ts` | New revision file; relevant regression checks |
| `src/lib/room-lifecycle.ts` | Changed this revision; relevant regression checks |
| `src/lib/snake.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/storage.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/use-game-activity.ts` | Preserved prior-release file; regression exercised where applicable |
| `src/lib/words.ts` | Preserved prior-release file; regression exercised where applicable |
| `tests/access-browser.mjs` | New revision file; relevant regression checks |
| `tests/access.test.mjs` | New revision file; relevant regression checks |
| `tests/ads-browser.mjs` | Preserved prior-release file; regression exercised where applicable |
| `tests/all-games-browser.mjs` | Preserved prior-release file; regression exercised where applicable |
| `tests/api.test.mjs` | Preserved prior-release file; regression exercised where applicable |
| `tests/browser.mjs` | Preserved prior-release file; regression exercised where applicable |
| `tests/multiplayer-api.mjs` | Preserved prior-release file; regression exercised where applicable |
| `tests/multiplayer-browser.mjs` | Preserved prior-release file; regression exercised where applicable |
| `tests/retention-browser.mjs` | Preserved prior-release file; regression exercised where applicable |
| `tests/unit.test.ts` | Changed this revision; relevant regression checks |
| `tests/upgrade.test.mjs` | Preserved prior-release file; regression exercised where applicable |
| `tsconfig.json` | Preserved prior-release file; regression exercised where applicable |
| `vercel.json` | Preserved prior-release file; regression exercised where applicable |
