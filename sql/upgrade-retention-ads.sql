-- Upgrade the PREVIOUS AUDITED release. Backup first. Safe to re-run.
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS inactive_at timestamp;
-- First upgrade backfills from login / submitted scores, not migration time.
UPDATE users u SET last_active_at = GREATEST(u.created_at, u.last_login_at,
  (SELECT max(s.created_at) FROM game_scores s WHERE s.user_id = u.id))
WHERE last_active_at IS NULL;
ALTER TABLE users ALTER COLUMN last_active_at SET DEFAULT now();
ALTER TABLE users ALTER COLUMN last_active_at SET NOT NULL;
CREATE INDEX IF NOT EXISTS users_last_active_idx ON users(last_active_at);
ALTER TABLE room_players ADD COLUMN IF NOT EXISTS left_at timestamp;
ALTER TABLE card_players ADD COLUMN IF NOT EXISTS left_at timestamp;
ALTER TABLE card_rooms ADD COLUMN IF NOT EXISTS host_position integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS ad_placements (
  id text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp NOT NULL DEFAULT now()
);
INSERT INTO ad_placements(id) VALUES ('home-footer'), ('leaderboard-footer') ON CONFLICT DO NOTHING;
ALTER TABLE ad_placements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ad_placements FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=r) THEN
      EXECUTE format('REVOKE ALL ON ad_placements FROM %I',r);
    END IF;
  END LOOP;
END $$;
CREATE OR REPLACE FUNCTION touch_player_activity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE users SET last_active_at=now(), inactive_at=NULL
  WHERE id=NEW.user_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS game_score_activity ON game_scores;
CREATE TRIGGER game_score_activity AFTER INSERT ON game_scores
FOR EACH ROW WHEN (NEW.user_id IS NOT NULL) EXECUTE FUNCTION touch_player_activity();
-- Reversible flag only: never deletes users, rooms, scores or logs.
CREATE OR REPLACE FUNCTION flag_inactive_accounts() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE flagged integer;
BEGIN
  UPDATE users SET inactive_at=now()
  WHERE last_active_at < now() - interval '7 days' AND inactive_at IS NULL;
  GET DIAGNOSTICS flagged = ROW_COUNT;
  RETURN flagged;
END $$;
REVOKE ALL ON FUNCTION flag_inactive_accounts() FROM PUBLIC;
REVOKE ALL ON FUNCTION touch_player_activity() FROM PUBLIC;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
COMMIT;
