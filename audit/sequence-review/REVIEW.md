# Gameplay sequence review — 16 October 2026

Follow-up to the reported War second-battle card visibility defect. This is the current verification record. The earlier `audit/expansion/` results describe the previous release only.

## Corrections

1. **War stale cards:** the projector used `lastBattle` before the current reveals, so later individual reveals displayed old cards. It now prefers current cards whenever either slot is revealed. Both named player slots update independently; unrevealed cards remain `??`. Added ready/revealing/resolved stages and battle labels.
2. **War tied exhaustion:** both piles empty on equal final cards now draws rather than awarding player 2. One-sided exhaustion is decided before shifting facedown cards.
3. **Public same-device tables:** a private-turn curtain no longer hides War/strategy/Golf public results on a turn change. Private hands, Fleet and Mission still use privacy handoffs; puzzle relays retain them.
4. **Mental Rotation:** removed a 180-degree-symmetric generated shape which produced duplicate-looking answers. All four generated options are distinct; geometric grading accepts equivalent options in older symmetric states.
5. **River Crossing:** display order is shuffled independently of the real food-chain conflicts.

## Two completed passes

Environment: Node 22.23.3, PostgreSQL 17 isolated database, headless Chromium/Linux. Production Next server; embed-preview flag set at build and start for the workspace preview only. No cloud deployment or GitHub push.

| Check | First pass | Second pass |
|---|---|---|
| Original unit suite | 9/9 | 9/9 |
| Expansion unit suite | 70/70 | 70/70 |
| API: original/retention/access/original multiplayer/new multiplayer | 4+4+8+6+17 = 39/39 | 39/39 |
| War full local sequence | 560 reveal actions across two completed rounds | 560 reveal actions across two completed rounds |
| War online | Two browsers; each reveal over first three battles, hidden peer slot, refresh | Same checks passed |
| New-game UI paths | All 51, real legal controls; catalog, garden modes, mobile | Same checks passed |
| Retained games | All 19 real browser play paths | Same checks passed |
| Two-browser private new games | Rummy/Fleet/Mission turns, private snapshots, reconnect/cooperative rematch | Same checks passed |
| Original multiplayer | Memory full matching/mismatch/refresh/finish/rematch; TicTacToe/Connect4/Math/Typing complete rounds | Same checks passed |
| Routes/appearance/input | 77 routes, links, monochrome/text-only DOM, input/navigation | Same checks passed |
| Room retention/access/admin/tabs | Refresh, failed leave, close, passwords, kick/rejoin, admin controls, one active tab/fallbacks | Same checks passed |
| Code Breaker | 15,625 duplicate-aware scoring combinations and browser round/retry regressions | Same checks passed |
| Ads default off | Passed with explicit matching test URL/mode | Passed |

`validation.txt` records lint/typecheck/units/build and first unit pass. `game-browsers-pass1.txt`, `game-browsers-pass2.txt`, `api-pass1.txt`, `api-pass2.txt`, `regression-pass1.txt`, `regression-pass2.txt` record actual runs. The first regression group initially stopped at the ads harness because its default was a nonexistent port-3001 placeholder server; the explicit port-3000/ads-off correction and successful remaining checks are appended to the same log. This was a test configuration failure, not an application change. The second pass supplied the correct settings from the start.

Fresh packaged-source extraction independently passed `npm ci`, lint, types, 9+70 units and a normal production build with no private environment file (`clean-install.txt`). Final source/configuration bytes were compared against that tested extraction. Documentation and verification evidence were subsequently updated; application source did not change. Production dependency audit: zero vulnerabilities. Five high development-only advisories remain; see JSON audit files. No dependency or SQL changes were required for this follow-up.

## Stronger regression coverage

The expansion reducer helper now compares intermediate public projected boards with actual current state after every helper-applied command, checks each viewer's private hand, Golf revealed/hidden slots, Mission clue ownership and Fleet shots/incoming results. War assertions use the actual current card IDs, not the projector's own output as an oracle. Dedicated unit fixtures cover simultaneous/one-sided tied exhaustion and fresh rounds. Rotation tests examine every displayed option for 250 seeds, including a legacy symmetric fixture. River tests independently restrict pairs to the real named food chains across 250 seeds. Existing generated puzzle solves cover levels 1/2/8/50/1,000,000 and seeded supported-seat strategy/card simulations. Rummy has scaling, conservation, rule and valid-declaration fixtures, not a claim of a strategic natural full game at every seat count.

The War browser sequence independently computes each expected slot from raw reducer cards after every click, checks it in the DOM, rejects public-table curtains, finishes two rounds and checks the next-round reset. New script: `npm run test:war-browser`. Other reproduction commands are in HANDOVER.md and package.json. Database mutation suites must only target an isolated test database with explicit opt-in.

## Limits

These are automated representative engine/integration/browser checks, not manual full playthroughs of every game twice, an exhaustive proof across every possible generated state, a long-duration load test, or a guarantee of zero defects. Most new-game browser paths exercise legal controls and a progression step, complemented by full generated engine solves/simulations; War has additional full browser rounds. Knowledge-bank facts were not all independently re-source-verified in this follow-up. Preview runs on an isolated database; production CSP/frame restrictions remain the default when the embed flag is absent. No real advertising traffic, publisher IDs or external service deployment were used. The UI remains black/white, terminal text only, with optional accounts and the existing room/tab policies preserved.
