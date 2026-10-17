-- Run BEFORE the room-access/admin release. Additive and repeat-safe.
BEGIN;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE card_rooms ADD COLUMN IF NOT EXISTS password_hash text;
COMMIT;
