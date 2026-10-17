import { ALL_WORDS } from "../words";
import {
  type PackState,
  type Random,
  type Command,
  base,
  int,
  pick,
  shuffle,
  check,
  index,
  text,
  finish,
  nextTurn,
  sum,
} from "./core";
export function reversiFlips(
  board: number[],
  at: number,
  who: number,
): number[] {
  if (board[at]) return [];
  const out: number[] = [];
  for (const [dr, dc] of [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ]) {
    let r = Math.floor(at / 8) + dr,
      c = (at % 8) + dc;
    const line: number[] = [];
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const i = r * 8 + c;
      if (board[i] === 3 - who) line.push(i);
      else {
        if (board[i] === who && line.length) out.push(...line);
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return out;
}
export const reversiMoves = (board: number[], who: number) =>
  board.flatMap((_, i) => (reversiFlips(board, i, who).length ? [i] : []));
export function makeStrategy(
  game: string,
  level: number,
  players: number,
  rng: Random,
): PackState {
  const s = base(game, level, players),
    d = s.data;
  switch (game) {
    case "nim":
      d.piles = Array.from(
        { length: Math.min(5, 3 + Math.floor(level / 5)) },
        () => 1 + int(rng, 9),
      );
      break;
    case "dots-boxes": {
      d.n = Math.min(5, 3 + Math.floor(level / 5));
      d.edges = [];
      for (let r = 0; r < d.n; r++)
        for (let c = 0; c < d.n; c++) {
          if (c + 1 < d.n)
            d.edges.push({ r1: r, c1: c, r2: r, c2: c + 1, owner: -1 });
          if (r + 1 < d.n)
            d.edges.push({ r1: r, c1: c, r2: r + 1, c2: c, owner: -1 });
        }
      d.boxes = [];
      for (let r = 0; r < d.n - 1; r++)
        for (let c = 0; c < d.n - 1; c++) {
          const edges = d.edges.flatMap((e: any, i: number) =>
            (e.r1 === r && e.r2 === r && e.c1 === c) ||
            (e.r1 === r + 1 && e.r2 === r + 1 && e.c1 === c) ||
            (e.c1 === c && e.c2 === c && e.r1 === r) ||
            (e.c1 === c + 1 && e.c2 === c + 1 && e.r1 === r)
              ? [i]
              : [],
          );
          d.boxes.push({ r, c, edges, owner: -1 });
        }
      break;
    }
    case "reversi":
      d.board = Array(64).fill(0);
      d.board[27] = d.board[36] = 2;
      d.board[28] = d.board[35] = 1;
      break;
    case "mancala":
      d.pits = Array.from({ length: 14 }, (_, i) =>
        i === 6 || i === 13 ? 0 : 4,
      );
      break;
    case "battleship": {
      d.boards = Array.from({ length: 2 }, () => {
        const board = Array(25).fill(0);
        for (const length of [3, 2]) {
          let placed = false;
          for (let attempt = 0; attempt < 200 && !placed; attempt++) {
            const horizontal = !!int(rng, 2),
              r = int(rng, horizontal ? 5 : 6 - length),
              c = int(rng, horizontal ? 6 - length : 5);
            const positions = Array.from(
              { length },
              (_, i) =>
                (r + (horizontal ? 0 : i)) * 5 + c + (horizontal ? i : 0),
            );
            if (positions.every((i) => !board[i])) {
              for (const i of positions) board[i] = 1;
              placed = true;
            }
          }
          check(placed, "Could not place ships.");
        }
        return board;
      });
      d.shots = [Array(25).fill(-1), Array(25).fill(-1)];
      break;
    }
    case "word-duel":
      d.words = [];
      d.letter = pick(rng, ["a", "b", "c", "d", "m", "s", "t"]);
      d.totals = [0, 0];
      break;
    case "poisoned-chocolate":
      d.rows = Math.min(6, 3 + Math.floor(level / 4));
      d.cols = Math.min(8, 4 + Math.floor(level / 4));
      d.board = Array(d.rows * d.cols).fill(1);
      break;
    case "secret-mission":
      d.clues = Array.from(
        { length: players },
        () => 1 + int(rng, Math.min(99, 9 + level * 2)),
      );
      d.sealed = Array(players).fill(false);
      s.phase = "observe";
      break;
    default:
      throw new Error("Unknown strategy game.");
  }
  return s;
}
function result(s: PackState, a: number, b: number, label: string) {
  finish(
    s,
    a === b ? [0, 0] : a > b ? [1, 0] : [0, 1],
    a === b
      ? `${label}: draw.`
      : `Player ${a > b ? 1 : 2} wins. ${label}: ${a}–${b}.`,
  );
}
export function strategyCommand(s: PackState, c: Command, actor: number) {
  const d = s.data,
    t = c.type;
  check(
    actor === s.turn || (s.game === "secret-mission" && s.phase === "play"),
    "Wait for your turn.",
  );
  if (s.game === "secret-mission") {
    if (t === "ready" && s.phase === "observe") {
      d.sealed[actor] = true;
      nextTurn(s);
      if (d.sealed.every(Boolean)) s.phase = "play";
      return;
    }
    check(
      s.phase === "play" && t === "answer",
      "Memorize and seal each briefing first.",
    );
    const answer = text(c.answer, 16);
    if (answer !== "" && Number(answer) === sum(d.clues)) {
      finish(
        s,
        Array(s.players).fill(s.level),
        "Mission complete. The team remembered every parcel.",
      );
    } else {
      s.lives--;
      s.message = "The team total is different. Discuss and try again.";
      if (s.lives <= 0) {
        s.phase = "lost";
        s.message = `Mission ended. Total was ${sum(d.clues)}.`;
      }
    }
    return;
  }
  check(s.phase === "play", "Round is over.");
  switch (s.game) {
    case "nim": {
      check(t === "take", "Choose a pile and amount.");
      const i = index(c.index, d.piles.length),
        amount = c.amount;
      check(
        typeof amount === "number" &&
          Number.isInteger(amount) &&
          amount >= 1 &&
          amount <= d.piles[i],
        "Take a valid amount from one pile.",
      );
      d.piles[i] -= amount;
      if (sum(d.piles) === 0)
        finish(
          s,
          s.scores.map((_, i) => (i === actor ? 1 : 0)),
          `Player ${actor + 1} takes the final counter.`,
        );
      else nextTurn(s);
      break;
    }
    case "dots-boxes": {
      check(t === "choose", "Choose an edge.");
      const e = d.edges[index(c.index, d.edges.length)];
      check(e.owner < 0, "That edge is taken.");
      e.owner = actor;
      let made = 0;
      for (const box of d.boxes)
        if (
          box.owner < 0 &&
          box.edges.every((i: number) => d.edges[i].owner >= 0)
        ) {
          box.owner = actor;
          made++;
        }
      if (d.boxes.every((b: any) => b.owner >= 0))
        result(
          s,
          d.boxes.filter((b: any) => b.owner === 0).length,
          d.boxes.filter((b: any) => b.owner === 1).length,
          "Boxes",
        );
      else if (!made) nextTurn(s);
      break;
    }
    case "reversi": {
      if (t === "pass") {
        check(
          reversiMoves(d.board, actor + 1).length === 0,
          "You have a legal move.",
        );
        nextTurn(s);
      } else {
        check(t === "choose", "Choose a legal square.");
        const at = index(c.index, 64),
          flips = reversiFlips(d.board, at, actor + 1);
        check(flips.length, "That square brackets no disks.");
        d.board[at] = actor + 1;
        for (const i of flips) d.board[i] = actor + 1;
        nextTurn(s);
      }
      if (!reversiMoves(d.board, 1).length && !reversiMoves(d.board, 2).length)
        result(
          s,
          d.board.filter((v: number) => v === 1).length,
          d.board.filter((v: number) => v === 2).length,
          "Disks",
        );
      break;
    }
    case "mancala": {
      check(t === "choose", "Choose one of your pits.");
      let at = index(c.index, 14);
      check(
        at >= actor * 7 && at < actor * 7 + 6 && d.pits[at] > 0,
        "Choose a non-empty pit on your side.",
      );
      let stones = d.pits[at];
      d.pits[at] = 0;
      while (stones) {
        at = (at + 1) % 14;
        if (at === (1 - actor) * 7 + 6) continue;
        d.pits[at]++;
        stones--;
      }
      const store = actor * 7 + 6;
      if (
        at >= actor * 7 &&
        at < actor * 7 + 6 &&
        d.pits[at] === 1 &&
        d.pits[12 - at] > 0
      ) {
        d.pits[store] += d.pits[12 - at] + 1;
        d.pits[12 - at] = d.pits[at] = 0;
      }
      if (
        d.pits.slice(0, 6).every((n: number) => !n) ||
        d.pits.slice(7, 13).every((n: number) => !n)
      ) {
        for (const side of [0, 1])
          for (let i = side * 7; i < side * 7 + 6; i++) {
            d.pits[side * 7 + 6] += d.pits[i];
            d.pits[i] = 0;
          }
        result(s, d.pits[6], d.pits[13], "Stones");
      } else if (at !== store) nextTurn(s);
      break;
    }
    case "battleship": {
      check(t === "choose", "Choose a target square.");
      const at = index(c.index, 25);
      check(d.shots[actor][at] === -1, "Already targeted.");
      d.shots[actor][at] = d.boards[1 - actor][at];
      s.message = d.shots[actor][at] ? "Hit." : "Miss.";
      if (
        d.boards[1 - actor].every(
          (v: number, i: number) => !v || d.shots[actor][i] === 1,
        )
      )
        finish(
          s,
          actor === 0 ? [1, 0] : [0, 1],
          `Player ${actor + 1} sinks the fleet.`,
        );
      else nextTurn(s);
      break;
    }
    case "word-duel": {
      const available = ALL_WORDS.filter(
        (w) => w.startsWith(d.letter) && !d.words.includes(w),
      );
      if (t === "pass") {
        check(!available.length, "There is still a legal word in the bank.");
        finish(
          s,
          actor === 0 ? [0, 1] : [1, 0],
          `Player ${2 - actor} wins the chain.`,
        );
      } else {
        check(t === "answer", "Enter a word.");
        const word = text(c.answer, 16).toLowerCase();
        check(
          available.includes(word),
          "Use an unused bank word starting with the required letter.",
        );
        d.words.push(word);
        d.totals[actor] += word.length;
        d.letter = word.at(-1);
        if (d.words.length >= 20)
          result(s, d.totals[0], d.totals[1], "Letters");
        else nextTurn(s);
      }
      break;
    }
    case "poisoned-chocolate": {
      check(t === "choose", "Choose a square.");
      const at = index(c.index, d.board.length);
      check(d.board[at], "That chocolate is gone.");
      const r = Math.floor(at / d.cols),
        col = at % d.cols;
      for (let y = r; y < d.rows; y++)
        for (let x = col; x < d.cols; x++) d.board[y * d.cols + x] = 0;
      if (at === 0)
        finish(
          s,
          actor === 0 ? [0, 1] : [1, 0],
          `Player ${actor + 1} ate the poisoned corner and loses.`,
        );
      else nextTurn(s);
      break;
    }
    default:
      throw new Error("Unknown strategy command.");
  }
}
