# Upstream comparison — 16 October 2026

Public repository: https://github.com/Sakthivelan-B/TTYARCADE

Observed HEAD: `83e5309f09e5aceeec802603579ba3c435e449d0` (`Add files via upload`). Compared a fresh public shallow clone with the previous delivered `TTYARCADE-tabs-update.zip` (SHA-256 `a01be5309091d0fa05cba07b96de407af2b9341e2c3ea836610236d5516d22c3`).

- All 179 non-Git upstream files were compared by bytes against their previous-archive paths.
- The only differing upstream source file was `src/app/games/codebreaker/page.tsx`: the completed Code Breaker fix. Its logic is retained. Current expansion changes only that page’s instruction container from a visible div to collapsed details.
- Upstream omitted `.env.example`, `.gitignore` and `.nvmrc`; the clean repository retains these necessary template/configuration files from the prior audited archive.
- SQL bootstrap/upgrade scripts, account/authentication, tab coordination and advertising engines remain based on the previous working code, not replaced with upstream’s older missing pieces.
- New expansion files, intentional integration changes, current documentation and current regression evidence are included. Obsolete duplicate historical audit folders are not.
- No push, branch creation in the user's remote, deployment or credential access was performed. Public source inspection does not confer write permission.

Review the current remote again before applying: it may have advanced after this comparison. See PUBLISHING.md for a non-destructive branch/overlay/PR workflow.
