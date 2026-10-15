# Home / single-tab revision

Baseline: delivered TTYARCADE-room-controls.zip, SHA-256 `23538b2c9530970733e92a338759f0fb035ff4dba170195d47447c5197453715`. No schema migration from that release.

- Removed the home live-waiting-room box and its room queries. Did not purge rooms/history/accounts or change in-game lobbies.
- Gameplay Shell coordinates latest active game document with same-origin/profile localStorage + BroadcastChannel. Older game tabs return home, unmounting game effects. Does not send leave/close, clear saved capabilities or log out accounts. No repeated ownership polling or heartbeat.
- Fresh per-document identity; delayed events consult latest ownership; refresh/back navigation can claim ownership. Home/admin/settings/rules don't claim. Solo progress remains in-memory and can be lost on handoff. Separate profiles/devices are independent; if both coordination APIs are unavailable, exclusion is not guaranteed. No server security/anti-cheat claim.
- Single-tab browser regression: all six online games preserve room, turn, state/hand and credential through handoff; refresh still works. Cross-game and profile separation, denied localStorage/absent BroadcastChannel fallbacks, rapid concurrent claims, absent home room-list with retained room: PASS. Zero page errors.
- Existing 31 unit/API tests, six-game room-access/admin browser, 26-route browser, retention, all-19 playable-path and complete generic multiplayer browser regressions: PASS on this code. Default-off ads: PASS. Lint, types and production build: PASS. CSS hash unchanged: `69b94197c54ece4ceacad6e190bc9de54affd9899e6b7e65ef0b82050a3a00bb`.

Node20.20.2, PostgreSQL17, Chromium/Linux tested; Node22 recommended, not separately verified. Prior audit/access and audit/upgrade evidence retained as historical. No deployment, exhaustive levels, actual provider/CMP approval, physical hardware or long soak is claimed. Prior five high development-only dependency advisories remain; earlier production audit zero.
