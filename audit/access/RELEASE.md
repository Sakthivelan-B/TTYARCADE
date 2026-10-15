# Room access and admin revision — 15 October 2026

Baseline: the previously delivered `TTYARCADE-upgraded.zip`, SHA-256 `dc63e82d5009a0ceaa8fbe529408b07651716dbb7b1f4888b0ba134359670c0b`. Original public-upstream comparison remains documented in HANDOVER; this revision preserves the working delivered source.

## New behavior

- Nullable salted-scrypt credentials on generic/card rooms; optional creation checkbox; host can change/disable protection. Server enforces new joins; reconnect ownership bypasses password as intended. No password/hash returned in public serializers.
- Host-only kicks, no self-kick. Revoked capability cannot act; player can rejoin with current password (chosen policy). Stable live-game arrays/hands and 104-card conservation. Browser notices removal and clears only the revoked saved capability.
- Host settings/kick UI across all six games; join forms wrap on narrow screens. No global CSS/theme change.
- Admin-authorized placement API + dashboard switches, config/status guidance, searchable account/activity/inactive/per-game details, latest 100 account/guest score rows. Deprecated admin-environment guidance removed. Full step-by-step ADMIN_GUIDE at root.
- Existing DB migration: `sql/upgrade-room-access.sql`, nullable fields and repeat-safe. Fresh/earlier installation paths include those fields.

## Verification

Evidence files in this directory. 9 unit + 4 baseline API + 4 retention + 6 gameplay API + 8 room/admin scenarios = **31 tests**, all PASS. Also full six-game protected creation/wrong-password/kick/rejoin/refresh browser flows and authorized admin switches/details, 26-route/theme browser suite, six-game retention, playable-path checks for all 19 games and complete two-browser generic gameplay PASS. Zero browser page errors in the recorded passing suites.

New 8-scenario API suite covers all six engines, host/nonhost/self permissions, credential rotation, password change/removal, saved-seat reconnect, new joining after kick, public-serializer secrecy, card-hand conservation, admin permission/persistence/activity, and pending-eight kick resolution. Direct SQL fixture manipulation is test-only; suites require explicit disposable-database opt-in.

Fresh bootstrap + repeated room-access migration, and migration from previous release bootstrap: PASS. No destructive schema change. Global CSS hash unchanged: `69b94197c54ece4ceacad6e190bc9de54affd9899e6b7e65ef0b82050a3a00bb`.

Production dependency audit: zero vulnerabilities at snapshot; full audit has five high development-only advisories. Node 20.20.2 / PostgreSQL17 / ChromiumLinux used here; Node22 recommended deployment target, not separately tested. No cloud deployment, real AdSense/CMP/provider approval, all-level exhaustive simulation, long-duration load/soak or hardware certification. Room passwords gate joining, not public snapshots. Admin controls cannot bypass consent or configure the provider account; flags are not storage purges. See ADMIN_GUIDE and HANDOVER for exact boundaries.
