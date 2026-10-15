-- Additive upgrade for the ORIGINAL seven-table repository schema only.
-- Back up and test on a branch first. Run once as database owner.
BEGIN;

-- Each accepted score is the canonical completed-play log. Scores are client
-- supplied: these are operational records, not anti-cheat attestations.
CREATE TABLE game_logs (
  id bigserial PRIMARY KEY,
  user_id integer REFERENCES users(id) ON DELETE SET NULL,
  player_name text NOT NULL,
  game text NOT NULL,
  event text NOT NULL DEFAULT 'score_submitted',
  score integer,
  details jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX game_scores_leaderboard_idx ON game_scores(game, score DESC, created_at DESC);
CREATE INDEX game_scores_user_idx ON game_scores(user_id);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
CREATE INDEX room_players_room_idx ON room_players(room_id);
CREATE INDEX card_players_room_idx ON card_players(room_id);
CREATE INDEX rooms_cleanup_idx ON rooms(updated_at);
CREATE INDEX card_rooms_cleanup_idx ON card_rooms(updated_at);
CREATE INDEX game_logs_created_idx ON game_logs(created_at);
CREATE INDEX game_logs_user_game_idx ON game_logs(user_id, game);
CREATE VIEW player_high_scores AS
  SELECT user_id, player_name, game, max(score) AS high_score,
         count(*) AS plays, max(created_at) AS last_played_at
  FROM game_scores GROUP BY user_id, player_name, game;
CREATE FUNCTION log_game_score() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO game_logs(user_id, player_name, game, score, details)
  VALUES (NEW.user_id, NEW.player_name, NEW.game, NEW.score, NEW.meta);
  RETURN NEW;
END;
$$;
CREATE TRIGGER game_score_log AFTER INSERT ON game_scores
FOR EACH ROW EXECUTE FUNCTION log_game_score();
-- Deny direct browser access (Supabase anon/authenticated). The trusted
-- server connects as table owner/BYPASSRLS, never with the anon API key.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON player_high_scores FROM PUBLIC;
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON TABLE users, sessions, game_scores, rooms, room_players, card_rooms, card_players, game_logs, player_high_scores FROM %I', r);
    END IF;
  END LOOP;
END $$;

COMMIT;
