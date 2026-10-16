import { PACK_GAMES } from './pack/catalog';
// Central registry. Home page ("ls"), leaderboard and the rooms API read this.
// Add a game here and it appears everywhere.
export type GameKind = "multi" | "levels" | "classic";
export type Mode = "solo" | "local" | "cpu" | "online";

export type GameInfo = {
  id: string; // also the `game` value stored in game_scores
  name: string;
  kind: GameKind;
  modes: Mode[]; // how it can be played
  minPlayers: number;
  maxPlayers: number; // online/local seat cap (up to 10)
  desc: string;
};

export const GAMES: GameInfo[] = [
  // --- dedicated multiplayer card game ---
  { id: "crazy8", name: "crazy-eights", kind: "multi", modes: ["online", "cpu"], minPlayers: 2, maxPlayers: 10, desc: "card game. share a room code, empty your hand first." },

  // --- replayable generated levels (bounded sizes; patterns may recur) ---
  { id: "matrix", name: "memory-matrix", kind: "levels", modes: ["solo"], minPlayers: 1, maxPlayers: 1, desc: "remember lit cells. grid + count grow every level." },
  { id: "numbers", name: "number-memory", kind: "levels", modes: ["solo"], minPlayers: 1, maxPlayers: 1, desc: "memorize fresh digit strings, growing up to 32 digits." },
  { id: "memory", name: "memory-pairs", kind: "levels", modes: ["solo", "local", "online"], minPlayers: 1, maxPlayers: 10, desc: "flip & match symbol pairs. solo levels or versus up to 10." },
  { id: "sequence", name: "key-sequence", kind: "levels", modes: ["solo"], minPlayers: 1, maxPlayers: 1, desc: "repeat fresh key sequences, growing up to 32 keys." },
  { id: "scramble", name: "word-scramble", kind: "levels", modes: ["solo"], minPlayers: 1, maxPlayers: 1, desc: "unscramble words. longer words each level." },
  { id: "odd", name: "odd-one-out", kind: "levels", modes: ["solo"], minPlayers: 1, maxPlayers: 1, desc: "find the different character. bigger + trickier grids." },
  { id: "maze", name: "ascii-maze", kind: "levels", modes: ["solo"], minPlayers: 1, maxPlayers: 1, desc: "new random maze every level. fog of war later." },
  { id: "slide", name: "slide-puzzle", kind: "levels", modes: ["solo"], minPlayers: 1, maxPlayers: 1, desc: "sort the tiles. board grows, shuffle deepens." },
  { id: "lights", name: "lights-out", kind: "levels", modes: ["solo"], minPlayers: 1, maxPlayers: 1, desc: "turn every light off. always solvable, always new." },
  { id: "math", name: "math-sprint", kind: "levels", modes: ["solo", "local", "online"], minPlayers: 1, maxPlayers: 10, desc: "beat the clock, or race up to 10 players on the same sums." },
  { id: "codebreaker", name: "code-breaker", kind: "levels", modes: ["solo"], minPlayers: 1, maxPlayers: 1, desc: "crack the hidden code. one fixed code per level." },
  { id: "typing", name: "type-rush", kind: "levels", modes: ["solo", "local", "online"], minPlayers: 1, maxPlayers: 10, desc: "type random words in time, or race the room." },
  { id: "snake", name: "snake", kind: "levels", modes: ["solo"], minPlayers: 1, maxPlayers: 1, desc: "eat, grow. new random walls + speed each level." },
  { id: "minesweeper", name: "minesweeper", kind: "levels", modes: ["solo", "local"], minPlayers: 1, maxPlayers: 10, desc: "clear the field. more mines each level." },

  // --- classics ---
  { id: "tictactoe", name: "xox", kind: "classic", modes: ["local", "cpu", "online"], minPlayers: 2, maxPlayers: 2, desc: "tic-tac-toe. friend, cpu, or online room." },
  { id: "connect4", name: "connect-four", kind: "classic", modes: ["local", "cpu", "online"], minPlayers: 2, maxPlayers: 2, desc: "drop pieces, connect four in a row." },
  { id: "2048", name: "2048", kind: "classic", modes: ["solo"], minPlayers: 1, maxPlayers: 1, desc: "slide and merge numbers to 2048." },
  { id: "pong", name: "pong", kind: "classic", modes: ["cpu"], minPlayers: 1, maxPlayers: 2, desc: "ascii paddle game, first to 7." },
  ...PACK_GAMES.map(g => ({id:g.id,name:g.name,kind:(g.modes.includes("online")?"multi":"levels") as GameKind,modes:g.modes,minPlayers:g.min,maxPlayers:g.max,desc:g.desc})),
];

export const KIND_LABEL: Record<GameKind, string> = {
  multi: "MULTIPLAYER",
  levels: "ENDLESS LEVELS (procedural)",
  classic: "CLASSICS",
};

export const MODE_LABEL: Record<Mode, string> = {
  solo: "solo",
  local: "same device",
  cpu: "vs cpu",
  online: "online room",
};

export function gameById(id: string) {
  return GAMES.find((g) => g.id === id);
}
export function gameName(id: string) {
  return gameById(id)?.name ?? id;
}
