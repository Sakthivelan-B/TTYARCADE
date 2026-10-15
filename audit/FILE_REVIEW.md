# Reviewed-file inventory

Upstream commit: `a4e9278876c562079074ee95eb84c84d9702328d`. Audit date: 15 October 2026.

Scope: TS/TSX (frontend JSX/HTML and Node route scripts), CSS, configuration, SQL and tests. No standalone .html or legacy backend scripts exist. TypeScript/build resolve imports; Chromium follows/checks the rendered internal navigation targets. No remote assets are required.

All listed source was included in static pattern/lifecycle/security review and compile checks. Browser smoke tests are not complete gameplay proofs. “Reviewed / unchanged” means no patch was made, not a bug-free certification. Detailed changes and limitations: HANDOVER.md §§7–8.

| File | Review outcome | SHA-256 |
|---|---|---|
| `.env.example` | Added — regression/configuration support | `3d8516244dc8e7204cbe80703821d19ce1795e6cbe282c50a16eeea20caf4097` |
| `.gitignore` | Added — regression/configuration support | `0192f75167d9dc23d3051c71707487e365ff368bf790bb9cea7a6dc05d8ea90e` |
| `.nvmrc` | Added — regression/configuration support | `f14b4987904bcb5814e4459a057ed4d20f58a633152288a761214dcd28780b56` |
| `drizzle.config.ts` | Added — regression/configuration support | `9d465fc097b4521b764d93475df56fdf142051965cfd99bcabbed8769386180e` |
| `eslint.config.mjs` | Changed — see handover changelog | `05cecb101c2973aeb69ad4f5639ba454277090d718228ecc3f4e71aaf62b538d` |
| `next.config.ts` | Changed — see handover changelog | `a1d8b6dc11230f26e621e7f1f8b8c5c8caf10bef6f9ab77745059a0ec6e1efde` |
| `package-lock.json` | Added — regression/configuration support | `c7f0e7d54682df50de40b9425884e78c62cb45d174e0ce6ad3443b0883bd7db6` |
| `package.json` | Changed — see handover changelog | `760bf7615af7397110ee7733f4f493805967b61dfc00fe9e98394cc618b91feb` |
| `postcss.config.mjs` | Reviewed / unchanged | `b8cd36495468ea54e029eb4b2e0e98f0feff6f95d6513e70db37a71c0e3bfba4` |
| `sql/existing-database.sql` | Added — regression/configuration support | `168c52c56422a76b45b9555805e495c0165bac9f0f1ddcfbefd953a0adbf0052` |
| `sql/schema.sql` | Added — regression/configuration support | `f3587d1ba93dc18a3c93efbada9b6014779b980dc9ee7ad76f88fa33cdf8bcc4` |
| `src/app/account/page.tsx` | Reviewed / unchanged | `968ee33833e96a45066ae8942d20a8a0c31c7ca6e6b75bd88c37841d81b4dc73` |
| `src/app/admin/page.tsx` | Reviewed / unchanged | `3c518b569047c1096593436d61174a930fd37130d164ddc634a000af65d2a25f` |
| `src/app/api/admin/users/route.ts` | Changed — see handover changelog | `a8a5765911ab7a0d99bab8cc788a3250752ee95dfd9e8c3caafad73697b130e8` |
| `src/app/api/auth/login/route.ts` | Changed — see handover changelog | `ab36a0f85f4ac5baa92aabcadbdb4510a3824e49b5d3f9a7cdb6e43b761776e8` |
| `src/app/api/auth/me/route.ts` | Changed — see handover changelog | `373a5e89edf0da60a96614d7ab4f6d8d6f6d19c448ac7b932c06663bfb7c26f8` |
| `src/app/api/auth/register/route.ts` | Changed — see handover changelog | `f55598f4ac1ec4e1fcfc44600c6eab21b6e815c98c897b30a17fcd1e40d36339` |
| `src/app/api/cards/rooms/[code]/action/route.ts` | Changed — see handover changelog | `33fc00ae140512e7ce30cd0c6890a61d42e040c3237b252116e5c74ef73087ac` |
| `src/app/api/cards/rooms/[code]/join/route.ts` | Changed — see handover changelog | `9fead14239f00d567f81b00bafbe26502a931e57bbccee5a743138c580bf89f6` |
| `src/app/api/cards/rooms/[code]/route.ts` | Changed — see handover changelog | `49da88ffa88cbda6577435e99f257f6590394ce3d50ff4461063c38cd8978974` |
| `src/app/api/cards/rooms/[code]/start/route.ts` | Changed — see handover changelog | `368b14bba846c8381208e4e48854e6577ddbf2e8aeda1b0e57326866391c40f8` |
| `src/app/api/cards/rooms/route.ts` | Changed — see handover changelog | `acb91f98ba6ff882d7c4426249e3f3133763454e48f93fdcc7ef06112fcfe6b7` |
| `src/app/api/cron/cleanup/route.ts` | Changed — see handover changelog | `1a0d536f8932b95cd7af32fba08ae37d0ad0aebf0f0c2aad97ddceb958cf0af5` |
| `src/app/api/health/route.ts` | Changed — see handover changelog | `94623c122db1d2d123bdb3f6bd3897678b18088469f2bca7a254249e3b06a004` |
| `src/app/api/rooms/[code]/route.ts` | Changed — see handover changelog | `ac15eb8d31da498b249a88307ac2b0c2f8af34bd8e355c871161c5077a20a64d` |
| `src/app/api/rooms/route.ts` | Changed — see handover changelog | `34ec64918f500bb70062e187cc8eaa149d90f4ed77967756ff460ece364802f9` |
| `src/app/api/scores/route.ts` | Changed — see handover changelog | `5caf2b07224d1c9e346a348f29a8f5b3a59378e042b19d290aa5420aede6cc85` |
| `src/app/games/2048/page.tsx` | Changed — see handover changelog | `632e0f6cf786ad5b636c5697b9fb13bd094f00b1c5a53ac515b28c5a23f98a89` |
| `src/app/games/codebreaker/page.tsx` | Changed — see handover changelog | `00fabbcfd649cde1724bec229c997d277ef451b00887ef8279fb34cac7b3ab7b` |
| `src/app/games/connect4/page.tsx` | Changed — see handover changelog | `f73b1cc89c503ac6a87fcdb1946715f418e399848585fdf43d49051c61c89b49` |
| `src/app/games/crazy8/page.tsx` | Changed — see handover changelog | `65b59a31a6e43ca5e4ecc5181d4484e235864d34c9e07ad5a685ca88ab8f749b` |
| `src/app/games/crazy8/rules/page.tsx` | Reviewed / unchanged | `cc491b9832ca4e2f48e0d8fe5e8c21b5723bc5bbf827dd3851cf4a044789dfd7` |
| `src/app/games/lights/page.tsx` | Reviewed / unchanged | `ba1084466596a731efa5c456e7175c9a50fa54bf76018994be2f3f8142fe95bb` |
| `src/app/games/math/page.tsx` | Changed — see handover changelog | `6dba9e336227d3a019dab4b5472e123ea9e234a949ed80433da4bf947b9a6b50` |
| `src/app/games/matrix/page.tsx` | Reviewed / unchanged | `f4d2e3aa410c7c3739b35afcd239b586cd60c5375e383b1f37985f7dba9d67e2` |
| `src/app/games/maze/page.tsx` | Reviewed / unchanged | `d4d02456b7172e19b4c8e823fddd359870e8493ed23dc408fafdd44e84608aec` |
| `src/app/games/memory/page.tsx` | Reviewed / unchanged | `f5589cddb397ffe8e12137a7a29bd404571243862a06f63e7bad14db83640629` |
| `src/app/games/minesweeper/page.tsx` | Changed — see handover changelog | `4ffb40f7399d9bfe70bb63d61ee3c6ce482a60e8cef4425f767ebb6dff0948d7` |
| `src/app/games/numbers/page.tsx` | Reviewed / unchanged | `c9ac668216730abff7dab90cba03004ddea816bc5dc62dea7a083ea140fded92` |
| `src/app/games/odd/page.tsx` | Reviewed / unchanged | `05fc27908a5e25c6941b486ae356b06decfe88005ce3d93a3ed70859a4d2882c` |
| `src/app/games/pong/page.tsx` | Changed — see handover changelog | `bb36199158cceecf3475d6d11f23c17a5a9bc286710849e5701fc5f01a8ca7aa` |
| `src/app/games/scramble/page.tsx` | Reviewed / unchanged | `7399bda9b2e359c621eb85f93575dfe71c79222a40adde7dcb3017d0dd28b740` |
| `src/app/games/sequence/page.tsx` | Changed — see handover changelog | `773680f53fb2f4fd320ce8a21a2accd34ba43ce9585000a7f1c6581dfe27858d` |
| `src/app/games/slide/page.tsx` | Reviewed / unchanged | `5abd1eccbd960fd449bcb33b0ccad241032e759d3257901d13e4fe42d47d1267` |
| `src/app/games/snake/page.tsx` | Changed — see handover changelog | `0b8c2676d9a517176f0766b02c32812e72e9cea00cdaebdd5cc7d593f156ae33` |
| `src/app/games/tictactoe/page.tsx` | Changed — see handover changelog | `afe9689bb44a63cf2b5e7f6a75ec2d0be4aee13f17bb9cae72af2278c66c573f` |
| `src/app/games/typing/page.tsx` | Changed — see handover changelog | `9a01942df295bd5c50270bc10d51b19106acca6ce5c92293d595675d1d33096b` |
| `src/app/globals.css` | Changed — see handover changelog | `69b94197c54ece4ceacad6e190bc9de54affd9899e6b7e65ef0b82050a3a00bb` |
| `src/app/layout.tsx` | Changed — see handover changelog | `2accf96b22fe3385c5a51d383e597fb551563c876885a6a43be4ae07c9bd6697` |
| `src/app/leaderboard/page.tsx` | Reviewed / unchanged | `a307d44c4e2ae488c39ea2fc0097fc1686e19bc55e7bad4d7ab4649a07294add` |
| `src/app/login/page.tsx` | Reviewed / unchanged | `462b6381b08d079ef2c082b82e97f9be037e3a807984f70eac1e0644fc9c9f2e` |
| `src/app/page.tsx` | Reviewed / unchanged | `e7d9d1f5ac9081b93bd1f7ea982242d1e21011009de808146631962198e04fd5` |
| `src/app/settings/page.tsx` | Changed — see handover changelog | `909ec016d38cca4f8aef4c7647058f2f8d74f290ebfce7de12b038a8925c5a12` |
| `src/components/Card.tsx` | Reviewed / unchanged | `263bf7f95146334d24753861a44be9adaf67af9185b28e5c5bb4745d37e71029` |
| `src/components/multi.tsx` | Changed — see handover changelog | `493745659dbabbba7f8bfa14d6f7dcf6de569a612699c3053436ec9864ada339` |
| `src/components/term.tsx` | Changed — see handover changelog | `380abe536a087bdb8d0fa6e46e82b8d6893e6526b53191ef0b59e62329f399e6` |
| `src/db/index.ts` | Changed — see handover changelog | `4539c2058cbeab2782e0aae4efe007b4ad1eb81abfe194f2d112b53f81e207d0` |
| `src/db/schema.ts` | Changed — see handover changelog | `5e823260b2b1d8cfc50329ddf4cab3704c4962e111985da29170752df3d903fc` |
| `src/lib/2048.ts` | Added — regression/configuration support | `6e060eea191247fb3707b8e07d26e454575a6a1010588172b6de504dc03f46c3` |
| `src/lib/auth.ts` | Changed — see handover changelog | `5efbfbceaa8255fef84da739ff669c5a51dc2b347e9881f63d733a90f3b8fdef` |
| `src/lib/bots.ts` | Reviewed / unchanged | `559956c813962d1ab8f2bd723d0f404b1afc7219bb25c9d82e1d6a4c89ece45c` |
| `src/lib/cards.ts` | Changed — see handover changelog | `3f06054ce5d57978a5d22a39d09a9d07c84493c1e6382a84cc2972da509f76f2` |
| `src/lib/clock.ts` | Added — regression/configuration support | `0bc04400a756e29c4afe0c1d93aa833c70b0562f57a0a5c6c474943c8bcc1da6` |
| `src/lib/controls.ts` | Changed — see handover changelog | `815926fa1bbe2ea1b4a011074aeeef278c55a10d73f15716549a7702f46f6b61` |
| `src/lib/games.ts` | Changed — see handover changelog | `d0b3eab9f815dc34a1dccea6c760ab965f94685111c80f8091b3a4a8ac3f23cb` |
| `src/lib/http.ts` | Added — regression/configuration support | `5bccf4ea8ef0a6afe7a3c0de4089182091a878aef6158ccf003c4c43af9f23e3` |
| `src/lib/levels.ts` | Changed — see handover changelog | `cd609db396db754533496061a0bccd4965800d2e795b02d95ed4754cc156a956` |
| `src/lib/player.ts` | Changed — see handover changelog | `1d70b90b4774348daa0ab9e6502639b56556db088bfb200816336ca370f97ff0` |
| `src/lib/rate-limit.ts` | Changed — see handover changelog | `5a6c49c262d40cfbe7ad50a693fc5a33e83c680603de0c1250bc8fab4e0f4713` |
| `src/lib/snake.ts` | Added — regression/configuration support | `66ccbce5767594e154e800c05d77410a3813335fab18ed2698df6eefc9f58f76` |
| `src/lib/storage.ts` | Added — regression/configuration support | `1493d4c906bf37aade6f8fc1e701ef8f345b98403a0d39441c7886db5db0ad52` |
| `src/lib/words.ts` | Reviewed / unchanged | `24d01f966474f4d20e31bfaac6358321b2f9001bffbc7f5bebae7d111aedf1b3` |
| `tests/api.test.mjs` | Added — regression/configuration support | `e994548e108841067ece8fbe6c1c5bc514471f74fe7892c51533585d3587976a` |
| `tests/browser.mjs` | Added — regression/configuration support | `6efd9a7d92746b12753d01b7ae7eae6b5d6fbd75aea7520beedb9e1e1d4b5f9c` |
| `tests/unit.test.ts` | Added — regression/configuration support | `a3c83783978dd99fb58eefe43e5c87977892d31b8e257378a154391f74c6b174` |
| `tsconfig.json` | Reviewed / unchanged | `4ea5303fb21d01b83151db57d43246ba2ac0bbb4e79b9e83b3a120b2599c4351` |
| `vercel.json` | Reviewed / unchanged | `40dfd11c0e4841e1cdb5e6753960dab65296348e2895ffaa3d98a3ac32ba1ef5` |

## Evidence

- `lint.txt`, `typecheck.txt`, `build.txt`: successful validation output.
- `unit-tests.txt`: four passing unit tests.
- `api-tests.txt`: four passing live PostgreSQL-backed API tests.
- `browser-tests.txt`: 26-route Chromium pass including local/online CPU checks.
- `database-tests.txt`: card conservation, logging trigger and deletion behavior.
- `existing-database-test.txt`: original schema plus additive upgrade executed successfully.
- `drizzle-config-test.txt`: environment-driven configuration loads with dependency override.
- `npm-audit-production.json`: zero reported runtime dependency advisories.
- `npm-audit.json`: five high development-only findings, disclosed in handover.

No production credentials, production database, deployment, GitHub write access or cloud-host validation was used. Testing used local PostgreSQL 17 and Chromium on the provided Node 20.20.2 sandbox; Node 22 LTS is recommended for deployment.
