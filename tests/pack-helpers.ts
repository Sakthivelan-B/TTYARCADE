import {
  type PackState,
  type Command,
  random,
  int,
  sum,
} from "../src/lib/pack";
import {
  type PackCard,
  twentyTotal,
  sevensLegal,
} from "../src/lib/pack/card-games";
import { reversiMoves } from "../src/lib/pack/strategy";
import { ALL_WORDS } from "../src/lib/words";
import assert from "node:assert/strict";
export function nextCommand(s: PackState, seed = 1): Command {
  const rng = random(seed);
  const d = s.data,
    p = s.turn,
    h: number[] = d.hands?.[p] ?? [],
    cards: PackCard[] = h.map((i) => d.cards[i]);
  let c: Command;
  switch (s.game) {
    case "war":
      c = { type: "reveal" };
      break;
    case "go-fish": {
      const targets = d.hands.flatMap((a: number[], i: number) =>
        i !== p && a.length ? [i] : [],
      );
      assert.ok(targets.length);
      c = {
        type: "ask",
        rank: cards[int(rng, cards.length)].rank,
        player: targets[int(rng, targets.length)],
      };
      break;
    }
    case "higher-lower": {
      const a = d.cards[d.current].rank || 0,
        b = d.cards[d.deck[0]].rank;
      const rank = (v: number) => (v === 1 ? 14 : v);
      c = { type: "answer", answer: rank(b) > rank(a) ? "higher" : "lower" };
      break;
    }
    case "twenty-one":
      c = { type: twentyTotal(cards) < 17 ? "hit" : "stand" };
      break;
    case "sevens": {
      const at = h.findIndex((id) => sevensLegal(d, id));
      c = at < 0 ? { type: "pass" } : { type: "play", index: at };
      break;
    }
    case "golf-six": {
      const hidden = d.revealed[p].findIndex((v: boolean) => !v);
      c = d.setup
        ? { type: "choose", index: hidden }
        : d.held === null
          ? { type: "draw", source: "stock" }
          : { type: "replace", index: hidden < 0 ? 0 : hidden };
      break;
    }
    case "old-maid": {
      let target = p;
      for (let n = 1; n <= s.players; n++) {
        const q = (p + n) % s.players;
        if (d.hands[q].length) {
          target = q;
          break;
        }
      }
      c = { type: "choose", index: int(rng, d.hands[target].length) };
      break;
    }
    case "nim":
      c = {
        type: "take",
        index: d.piles.findIndex((v: number) => v > 0),
        amount: 1,
      };
      break;
    case "dots-boxes":
      c = {
        type: "choose",
        index: d.edges.findIndex((e: { owner: number }) => e.owner < 0),
      };
      break;
    case "reversi": {
      const moves = reversiMoves(d.board, p + 1);
      c = moves.length ? { type: "choose", index: moves[0] } : { type: "pass" };
      break;
    }
    case "mancala":
      c = {
        type: "choose",
        index: d.pits.findIndex(
          (v: number, i: number) => i >= p * 7 && i < p * 7 + 6 && v > 0,
        ),
      };
      assert.equal(sum(d.pits), 48);
      break;
    case "battleship":
      c = { type: "choose", index: d.shots[p].findIndex((v: number) => v < 0) };
      break;
    case "word-duel": {
      const word = ALL_WORDS.find(
        (w) => w.startsWith(d.letter) && !d.words.includes(w),
      );
      c = word ? { type: "answer", answer: word } : { type: "pass" };
      break;
    }
    case "poisoned-chocolate":
      c = { type: "choose", index: d.board.lastIndexOf(1) };
      break;
    case "secret-mission":
      c =
        s.phase === "observe"
          ? { type: "ready" }
          : { type: "answer", answer: String(sum(d.clues)) };
      break;
    default:
      throw new Error("No simulation " + s.game);
  }
  return c;
}
