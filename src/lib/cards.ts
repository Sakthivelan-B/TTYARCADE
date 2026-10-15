// Card game engine for "Crazy Eights" multiplayer game
// Cards are encoded as "<suit><rank>" where suit is H/D/C/S and rank is 1-13

export type Card = string; // e.g. "H7", "S12" (Q), "D1" (A), "C13" (K)

export const SUITS = ["H", "D", "C", "S"] as const;
export const RANKS = [
  "1", // Ace
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11", // Jack
  "12", // Queen
  "13", // King
] as const;

export const SUIT_SYMBOL: Record<string, string> = {
  H: "♥",
  D: "♦",
  C: "♣",
  S: "♠",
};

export const SUIT_COLOR: Record<string, "red" | "black"> = {
  H: "red",
  D: "red",
  C: "black",
  S: "black",
};

export function cardSuit(card: Card): string {
  return card.slice(0, -1);
}

export function cardRank(card: Card): string {
  return card.slice(-1) === "0" && card.length > 2
    ? card.slice(-2) // handle "10"
    : card.slice(-1);
}

// "10" has two digits — handle it specifically
export function getRank(card: Card): string {
  if (card.startsWith("10")) return "10";
  return card.slice(1);
}

export function getSuit(card: Card): string {
  if (card.startsWith("10")) return card.slice(0, 2);
  return card[0];
}

export function isRed(card: Card): boolean {
  const s = getSuit(card);
  return s === "H" || s === "D";
}

/** One 52-card deck, or `copies` of them shuffled together (2 decks = 5-10 players). */
export function buildDeck(copies = 1): Card[] {
  const deck: Card[] = [];
  for (let n = 0; n < copies; n++) {
    for (const s of SUITS) {
      for (const r of RANKS) {
        deck.push(`${s}${r}`);
      }
    }
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function rankLabel(rank: string): string {
  const map: Record<string, string> = {
    "1": "A",
    "11": "J",
    "12": "Q",
    "13": "K",
  };
  return map[rank] ?? rank;
}

// Can card A be played on top card B given the current suit override (when 8 is on top)?
export function canPlay(
  card: Card,
  top: Card,
  currentSuit: string | null,
): boolean {
  const r = getRank(card);
  if (r === "8") return true; // eights are always playable
  const effectiveSuit = currentSuit ?? getSuit(top);
  return getSuit(card) === effectiveSuit || getRank(card) === getRank(top);
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Random token for player session
export function generateToken(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}
