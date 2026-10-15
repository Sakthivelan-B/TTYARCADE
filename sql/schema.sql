-- TTYARCADE: fresh PostgreSQL database only. Run once as database owner.
-- Existing database: back up first; do not run this bootstrap over it.
BEGIN;
CREATE TABLE "card_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"user_id" integer,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"hand" jsonb NOT NULL,
	"position" integer NOT NULL,
	"is_cpu" boolean DEFAULT false NOT NULL,
	"last_seen" timestamp DEFAULT now() NOT NULL,
	"has_called_draw" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "card_players_token_unique" UNIQUE("token")
);


CREATE TABLE "card_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"host_name" text NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"turn" integer DEFAULT 0 NOT NULL,
	"direction" integer DEFAULT 1 NOT NULL,
	"top_suit" text,
	"top_rank" text,
	"deck" jsonb NOT NULL,
	"discard" jsonb NOT NULL,
	"current_suit" text,
	"winner" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "card_rooms_code_unique" UNIQUE("code")
);


CREATE TABLE "game_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"player_name" text NOT NULL,
	"game" text NOT NULL,
	"score" integer NOT NULL,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);


CREATE TABLE "room_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"user_id" integer,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"seat" integer NOT NULL,
	"is_cpu" boolean DEFAULT false NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"online" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_seen" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "room_players_token_unique" UNIQUE("token")
);


CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"game" text NOT NULL,
	"max_players" integer DEFAULT 2 NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"turn" integer DEFAULT -1 NOT NULL,
	"round" integer DEFAULT 0 NOT NULL,
	"state" jsonb NOT NULL,
	"host_seat" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_code_unique" UNIQUE("code")
);


CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);


CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"username_key" text NOT NULL,
	"salt" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"blocked" boolean DEFAULT false NOT NULL,
	"blocked_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_username_key_unique" UNIQUE("username_key")
);


ALTER TABLE "card_players" ADD CONSTRAINT "card_players_room_id_card_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."card_rooms"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "card_players" ADD CONSTRAINT "card_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "room_players" ADD CONSTRAINT "room_players_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "room_players" ADD CONSTRAINT "room_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

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
