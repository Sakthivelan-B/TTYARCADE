-- Safe after upgrade-retention-ads.sql. Repeat-safe.
BEGIN;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
COMMIT;
