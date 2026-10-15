import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

/* ---------------- accounts ---------------- */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  // lowercase username for clash detection
  usernameKey: text("username_key").notNull().unique(),
  salt: text("salt").notNull(),
  passwordHash: text("password_hash").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  blocked: boolean("blocked").notNull().default(false),
  blockedReason: text("blocked_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

/* ---------------- scores ---------------- */

export const gameScores = pgTable("game_scores", {
  id: serial("id").primaryKey(),
  // null for guests; set when the player is logged in
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  playerName: text("player_name").notNull(),
  game: text("game").notNull(),
  score: integer("score").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ---------------- crazy eights (dedicated rooms) ---------------- */

export const cardRooms = pgTable("card_rooms", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  hostName: text("host_name").notNull(),
  status: text("status").notNull().default("waiting"),
  turn: integer("turn").notNull().default(0),
  direction: integer("direction").notNull().default(1),
  topSuit: text("top_suit"),
  topRank: text("top_rank"),
  deck: jsonb("deck").notNull().$type<string[]>(),
  discard: jsonb("discard").notNull().$type<string[]>(),
  currentSuit: text("current_suit"),
  winner: text("winner"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cardPlayers = pgTable("card_players", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id")
    .notNull()
    .references(() => cardRooms.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  hand: jsonb("hand").notNull().$type<string[]>(),
  position: integer("position").notNull(),
  isCpu: boolean("is_cpu").notNull().default(false),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  hasCalledDraw: integer("has_called_draw").notNull().default(0),
});

/* ---------------- generic multiplayer rooms ----------------
   Used by xox, connect4, memory-versus, math-race, type-race.
   `state` is a jsonb blob the game defines; `turn` is the seat index
   whose move it is (or -1 for simultaneous/race games).            */

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  game: text("game").notNull(),
  maxPlayers: integer("max_players").notNull().default(2),
  status: text("status").notNull().default("waiting"),
  turn: integer("turn").notNull().default(-1),
  round: integer("round").notNull().default(0),
  state: jsonb("state").notNull().$type<Record<string, unknown>>(),
  hostSeat: integer("host_seat").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const roomPlayers = pgTable("room_players", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  seat: integer("seat").notNull(),
  isCpu: boolean("is_cpu").notNull().default(false),
  score: integer("score").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  online: boolean("online").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
});
