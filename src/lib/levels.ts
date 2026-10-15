"use client";
// Procedural level engine shared by all level-based games.
//  - rand*(): crypto-backed randomness (falls back to Math.random)
//  - freshPattern(): generates a level and guarantees it was never served
//    before on this browser (pattern hashes kept in localStorage).
//  - useBest(): per-game best score in localStorage
//  - submitScore(): posts score to /api/scores (leaderboard)
import { useCallback, useEffect, useState } from "react";
import { getPlayerName } from "./player";

export function rand(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 4294967296;
  }
  return Math.random();
}

export function randInt(maxExclusive: number): number {
  return Math.floor(rand() * maxExclusive);
}

export function pick<T>(arr: readonly T[]): T {
  return arr[randInt(arr.length)];
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

const SEEN_CAP = 800;

/**
 * Generate a level pattern that has never been seen before for this game.
 * Retries up to `tries` times; with the level sizes used here collisions are
 * practically impossible, but small early levels can collide, so we check.
 */
export function freshPattern<T>(
  game: string,
  gen: () => T,
  key: (t: T) => string = (t) => JSON.stringify(t),
  tries = 60,
): T {
  const storeKey = `ttyarcade-seen:${game}`;
  let seen: string[] = [];
  try {
    seen = JSON.parse(localStorage.getItem(storeKey) || "[]");
  } catch {
    seen = [];
  }
  const set = new Set(seen);
  let out = gen();
  let h = hash(key(out));
  for (let i = 0; i < tries && set.has(h); i++) {
    out = gen();
    h = hash(key(out));
  }
  seen.push(h);
  if (seen.length > SEEN_CAP) seen = seen.slice(-SEEN_CAP);
  try {
    localStorage.setItem(storeKey, JSON.stringify(seen));
  } catch {
    /* storage full / disabled - ignore */
  }
  return out;
}

export function useBest(game: string) {
  const [best, setBest] = useState(0);
  useEffect(() => {
    const v = parseInt(localStorage.getItem(`ttyarcade-best:${game}`) || "0", 10);
    if (!Number.isNaN(v)) setBest(v);
  }, [game]);
  const report = useCallback(
    (score: number) => {
      setBest((b) => {
        if (score > b) {
          localStorage.setItem(`ttyarcade-best:${game}`, String(score));
          return score;
        }
        return b;
      });
    },
    [game],
  );
  return [best, report] as const;
}

export function submitScore(
  game: string,
  score: number,
  meta?: Record<string, unknown>,
  playerName?: string,
) {
  fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      playerName: playerName ?? getPlayerName(),
      game,
      score,
      meta: meta ?? null,
    }),
  }).catch(() => {});
}
