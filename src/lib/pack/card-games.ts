import {
  type PackState,
  type Random,
  type Bag,
  type Command,
  base,
  shuffle,
  random,
  int,
  check,
  index,
  text,
  finish,
  nextTurn,
  sum,
} from "./core";
export type PackCard = { id: number; rank: number; suit: string };
export function deckOf(decks = 1, jokers = false): PackCard[] {
  const out: PackCard[] = [];
  for (let n = 0; n < decks; n++) {
    for (const suit of ["S", "H", "D", "C"])
      for (let rank = 1; rank <= 13; rank++)
        out.push({ id: out.length, rank, suit });
    if (jokers)
      for (let j = 0; j < 2; j++)
        out.push({ id: out.length, rank: 0, suit: "J" });
  }
  return out;
}
export const cardText = (c: PackCard) =>
  c.rank === 0
    ? "JOKER"
    : ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"][
        c.rank
      ] + ({ S: "♠", H: "♡", D: "♢", C: "♣" }[c.suit] ?? "");
export const rummyDecks = (players: number) =>
  players <= 2 ? 1 : players <= 5 ? 2 : players <= 8 ? 3 : 4;
export function groupKind(cards: PackCard[]): "pure" | "run" | "set" | null {
  if (cards.length !== 3 && cards.length !== 4) return null;
  const natural = cards.filter((c) => c.rank > 0),
    jokers = cards.length - natural.length;
  if (natural.length < 2) return null;
  if (
    natural.every((c) => c.rank === natural[0].rank) &&
    new Set(natural.map((c) => c.suit)).size === natural.length
  )
    return "set";
  if (
    natural.some((c) => c.suit !== natural[0].suit) ||
    new Set(natural.map((c) => c.rank)).size !== natural.length
  )
    return null;
  for (let start = 1; start <= 15 - cards.length; start++) {
    const run = Array.from({ length: cards.length }, (_, i) => start + i);
    if (
      natural.every(
        (c) => run.includes(c.rank) || (c.rank === 1 && run.includes(14)),
      )
    )
      return jokers ? "run" : "pure";
  }
  return null;
}
export function rummyGroups(cards: PackCard[]): number[][] | null {
  if (cards.length !== 13 || new Set(cards.map((c) => c.id)).size !== 13)
    return null;
  const masks: {
    mask: number;
    len: number;
    pure: boolean;
    indices: number[];
  }[] = [];
  for (let mask = 0; mask < 1 << 13; mask++) {
    const indices: number[] = [];
    for (let i = 0; i < 13; i++) if (mask & (1 << i)) indices.push(i);
    if (indices.length !== 3 && indices.length !== 4) continue;
    const kind = groupKind(indices.map((i) => cards[i]));
    if (kind)
      masks.push({ mask, len: indices.length, pure: kind === "pure", indices });
  }
  const failed = new Set<string>();
  function visit(
    used: number,
    three: number,
    four: number,
    pure: boolean,
  ): number[][] | null {
    if (used === 8191) return three === 3 && four === 1 && pure ? [] : null;
    const key = [used, three, four, pure].join(":");
    if (failed.has(key)) return null;
    let first = 0;
    while (used & (1 << first)) first++;
    for (const g of masks) {
      if (
        !(g.mask & (1 << first)) ||
        g.mask & used ||
        (g.len === 3 && three >= 3) ||
        (g.len === 4 && four >= 1)
      )
        continue;
      const tail = visit(
        used | g.mask,
        three + (g.len === 3 ? 1 : 0),
        four + (g.len === 4 ? 1 : 0),
        pure || g.pure,
      );
      if (tail) return [g.indices, ...tail];
    }
    failed.add(key);
    return null;
  }
  return visit(0, 0, 0, false);
}
export function twentyTotal(cards: PackCard[]) {
  let n = sum(cards.map((c) => (c.rank === 1 ? 11 : Math.min(c.rank, 10)))),
    aces = cards.filter((c) => c.rank === 1).length;
  while (n > 21 && aces-- > 0) n -= 10;
  return n;
}
function card(d: Bag, id: number): PackCard {
  return d.cards[id];
}
function recycle(d: Bag) {
  if (!d.deck.length && d.discard.length > 1) {
    const top = d.discard.pop();
    d.deck = shuffle(random(d.recycleSeed++), d.discard);
    d.discard = [top];
  }
}
function draw(d: Bag) {
  recycle(d);
  check(d.deck.length, "No stock cards remain.");
  return d.deck.shift() as number;
}
function onlyWinner(s: PackState, actor: number, label: string) {
  finish(
    s,
    s.scores.map((_, i) => (i === actor ? 1 : 0)),
    label,
  );
}
function removeBooks(s: PackState, p: number) {
  const d = s.data;
  for (let rank = 1; rank <= 13; rank++) {
    const ids = d.hands[p].filter((id: number) => card(d, id).rank === rank);
    if (ids.length === 4) {
      d.hands[p] = d.hands[p].filter((id: number) => card(d, id).rank !== rank);
      d.books[p].push(ids);
    }
  }
}
function removePairs(s: PackState, p: number) {
  const d = s.data;
  for (let rank = 1; rank <= 13; rank++) {
    const ids: number[] = d.hands[p].filter(
      (id: number) => card(d, id).rank === rank,
    );
    while (ids.length >= 2) {
      const a = ids.pop()!,
        b = ids.pop()!;
      d.hands[p] = d.hands[p].filter((id: number) => id !== a && id !== b);
      d.pairs.push([a, b]);
    }
  }
}
function nextWithCards(s: PackState, from: number) {
  for (let i = 1; i <= s.players; i++) {
    const p = (from + i) % s.players;
    if (s.data.hands[p].length) return p;
  }
  return from;
}
export function makeCardGame(
  game: string,
  level: number,
  players: number,
  rng: Random,
  options: Bag = {},
): PackState {
  const s = base(game, level, players, options),
    d = s.data;
  const decks =
    game === "rummy"
      ? rummyDecks(players)
      : game === "golf-six" && players > 4
        ? 2
        : 1;
  d.cards = deckOf(decks, game === "rummy" && options.jokers === true);
  d.recycleSeed = int(rng, 4294967296);
  d.deck = shuffle(
    rng,
    d.cards.map((c: PackCard) => c.id),
  );
  d.hands = Array.from({ length: players }, () => []);
  d.discard = [];
  const deal = (count: number) => {
    for (let c = 0; c < count; c++)
      for (let p = 0; p < players; p++) d.hands[p].push(d.deck.shift());
  };
  switch (game) {
    case "rummy":
      deal(13);
      d.discard.push(d.deck.shift());
      d.drawn = false;
      break;
    case "go-fish":
      deal(5);
      d.books = Array.from({ length: players }, () => []);
      for (let p = 0; p < players; p++) removeBooks(s, p);
      break;
    case "war":
      while (d.deck.length)
        for (let p = 0; p < 2; p++) d.hands[p].push(d.deck.shift());
      d.pot = [];
      d.revealed = [null, null];
      d.battles = 0;
      break;
    case "higher-lower":
      d.current = d.deck.shift();
      d.streak = 0;
      d.goal = Math.min(12, 3 + Math.floor(level / 2));
      break;
    case "twenty-one":
      deal(2);
      d.dealer = [d.deck.shift(), d.deck.shift()];
      d.stood = Array(players).fill(false);
      break;
    case "sevens":
      while (d.deck.length)
        for (let p = 0; p < players && d.deck.length; p++)
          d.hands[p].push(d.deck.shift());
      d.runs = { S: [], H: [], D: [], C: [] };
      break;
    case "golf-six":
      deal(6);
      d.revealed = Array.from({ length: players }, () => Array(6).fill(false));
      d.setup = true;
      d.held = null;
      d.final = 0;
      d.trigger = -1;
      d.discard.push(d.deck.shift());
      break;
    case "old-maid": {
      const removed = d.cards.find(
        (c: PackCard) => c.rank === 12 && c.suit === "C",
      );
      d.removed = [removed.id];
      d.deck = d.deck.filter((id: number) => id !== removed.id);
      while (d.deck.length)
        for (let p = 0; p < players && d.deck.length; p++)
          d.hands[p].push(d.deck.shift());
      d.pairs = [];
      for (let p = 0; p < players; p++) removePairs(s, p);
      if (!d.hands[0].length) s.turn = nextWithCards(s, 0);
      break;
    }
    default:
      throw new Error("Unknown card game.");
  }
  return s;
}
export function sevensLegal(d: Bag, id: number) {
  const c = card(d, id),
    run: number[] = d.runs[c.suit];
  return !run.length
    ? c.rank === 7
    : c.rank === Math.min(...run) - 1 || c.rank === Math.max(...run) + 1;
}
export function cardCommand(s: PackState, c: Command, actor: number) {
  const d = s.data,
    t = c.type;
  check(s.phase === "play", "Round is over.");
  check(s.turn === actor, "Wait for your turn.");
  const hand: number[] = d.hands[actor];
  switch (s.game) {
    case "rummy": {
      const declare = (ids: number[]) => {
        const groups = rummyGroups(ids.map((id) => card(d, id)));
        check(groups, "Not a valid 3+3+3+4 partition with a pure sequence.");
        d.winningGroups = groups.map((g) => g.map((i) => ids[i]));
        onlyWinner(
          s,
          actor,
          `Player ${actor + 1} declares a valid Rummy hand.`,
        );
      };
      if (t === "declare") {
        check(
          !d.drawn && hand.length === 13,
          "Declare with 13 cards before drawing, or discard-and-declare with 14.",
        );
        declare(hand);
      } else if (t === "draw") {
        check(!d.drawn, "Discard before drawing again.");
        const source = text(c.source, 16);
        check(
          source === "stock" || source === "discard",
          "Choose a draw source.",
        );
        if (source === "discard") {
          check(d.discard.length, "Discard pile is empty.");
          hand.push(d.discard.pop());
        } else hand.push(draw(d));
        d.drawn = true;
      } else {
        check(t === "discard" && d.drawn, "Draw first, then discard.");
        const at = index(c.index, hand.length),
          remaining = hand.filter((_, i) => i !== at);
        if (c.declare === true) {
          const groups = rummyGroups(remaining.map((id) => card(d, id)));
          check(
            groups,
            "Not a valid declaration; choose another discard or just discard.",
          );
        }
        d.discard.push(hand.splice(at, 1)[0]);
        d.drawn = false;
        if (c.declare === true) declare(hand);
        else nextTurn(s);
      }
      break;
    }
    case "go-fish": {
      check(t === "ask", "Choose an opponent and rank.");
      const target = index(c.player, s.players),
        rank = c.rank;
      check(
        target !== actor &&
          typeof rank === "number" &&
          Number.isInteger(rank) &&
          rank >= 1 &&
          rank <= 13,
        "Choose another player and a rank.",
      );
      check(
        hand.some((id) => card(d, id).rank === rank),
        "You must hold that rank.",
      );
      check(d.hands[target].length, "That player has no cards.");
      const matches: number[] = d.hands[target].filter(
        (id: number) => card(d, id).rank === rank,
      );
      d.lastAsk = { player: actor, target, rank, matches: matches.length };
      let again = false;
      if (matches.length) {
        hand.push(...matches);
        d.hands[target] = d.hands[target].filter(
          (id: number) => card(d, id).rank !== rank,
        );
        again = true;
        s.message = `Received ${matches.length} card(s).`;
      } else if (d.deck.length) {
        const id = draw(d);
        hand.push(id);
        again = card(d, id).rank === rank;
        s.message = "Go fish: drew one card.";
      } else s.message = "Go fish: stock is empty.";
      removeBooks(s, actor);
      if (!hand.length && d.deck.length) hand.push(draw(d));
      for (let p = 0; p < s.players; p++)
        if (!d.hands[p].length && d.deck.length) d.hands[p].push(draw(d));
      const active = d.hands.filter((h: number[]) => h.length);
      if (!active.length) {
        const totals = d.books.map((b: number[][]) => b.length);
        finish(s, totals, `Books: ${totals.join(" / ")}. Highest total wins.`);
      } else if (!again || !d.hands[actor].length)
        s.turn = nextWithCards(s, actor);
      break;
    }
    case "war": {
      check(t === "reveal", "Reveal the top card.");
      if (!hand.length) {
        onlyWinner(s, 1 - actor, `Player ${2 - actor} has all battle cards.`);
        break;
      }
      const id = hand.shift()!;
      d.revealed[actor] = id;
      d.pot.push(id);
      if (d.revealed[1 - actor] === null) {
        s.turn = 1 - actor;
        break;
      }
      const rank = (id: number) =>
          card(d, id).rank === 1 ? 14 : card(d, id).rank,
        a = rank(d.revealed[0]),
        b = rank(d.revealed[1]);
      d.lastBattle = [...d.revealed];
      d.revealed = [null, null];
      d.battles++;
      if (a !== b) {
        const winner = a > b ? 0 : 1;
        d.hands[winner].push(...d.pot);
        d.pot = [];
        s.message = `Player ${winner + 1} takes the pot.`;
      } else {
        for (let p = 0; p < 2; p++) {
          if (!d.hands[p].length) {
            onlyWinner(s, 1 - p, `Player ${2 - p} wins the war.`);
            return;
          }
          const count = Math.min(3, d.hands[p].length - 1);
          for (let n = 0; n < count; n++) d.pot.push(d.hands[p].shift());
        }
        s.message = "WAR: reveal again after the facedown cards.";
      }
      if (!d.hands[0].length || !d.hands[1].length)
        onlyWinner(
          s,
          d.hands[0].length ? 0 : 1,
          "One player has no cards left.",
        );
      else if (d.battles >= 200) {
        const a = d.hands[0].length,
          b = d.hands[1].length;
        finish(
          s,
          a === b ? [0, 0] : a > b ? [1, 0] : [0, 1],
          "200-battle limit: larger pile wins; equal piles draw.",
        );
      } else s.turn = 0;
      break;
    }
    case "higher-lower": {
      check(t === "answer", "Choose higher or lower.");
      const prediction = text(c.answer, 16);
      check(
        prediction === "higher" || prediction === "lower",
        "Choose higher or lower.",
      );
      const id = draw(d),
        rank = (id: number) => (card(d, id).rank === 1 ? 14 : card(d, id).rank),
        a = rank(d.current),
        b = rank(id);
      d.discard.push(d.current);
      d.current = id;
      if (a === b) {
        s.message = "Tie: push. Streak stays.";
        break;
      }
      if (
        (b > a && prediction === "higher") ||
        (b < a && prediction === "lower")
      ) {
        d.streak++;
        if (d.streak >= d.goal)
          finish(s, [s.level], "Prediction streak complete.");
      } else {
        s.phase = "lost";
        s.message = `Wrong prediction. Streak: ${d.streak}.`;
      }
      break;
    }
    case "twenty-one": {
      check(t === "hit" || t === "stand", "Choose hit or stand.");
      if (t === "hit") hand.push(draw(d));
      if (t === "stand" || twentyTotal(hand.map((id) => card(d, id))) >= 21) {
        d.stood[actor] = true;
        if (actor < s.players - 1) nextTurn(s);
        else {
          while (twentyTotal(d.dealer.map((id: number) => card(d, id))) < 17)
            d.dealer.push(draw(d));
          const dealer = twentyTotal(d.dealer.map((id: number) => card(d, id)));
          d.totals = d.hands.map((h: number[]) =>
            twentyTotal(h.map((id) => card(d, id))),
          );
          const scores = d.totals.map((v: number) =>
            v <= 21 && (dealer > 21 || v > dealer) ? 1 : 0,
          );
          d.outcomes = d.totals.map((v: number) =>
            v > 21
              ? "bust"
              : dealer > 21 || v > dealer
                ? "win"
                : v === dealer
                  ? "push"
                  : "dealer wins",
          );
          finish(s, scores, `Dealer: ${dealer}. ${d.outcomes.join(" / ")}.`);
        }
      }
      break;
    }
    case "sevens": {
      if (t === "pass") {
        check(!hand.some((id) => sevensLegal(d, id)), "You have a legal card.");
        nextTurn(s);
      } else {
        check(t === "play", "Choose a legal card.");
        const at = index(c.index, hand.length),
          id = hand[at];
        check(sevensLegal(d, id), "Play a seven or extend an open suit.");
        hand.splice(at, 1);
        d.runs[card(d, id).suit].push(card(d, id).rank);
        d.discard.push(id);
        if (!hand.length)
          onlyWinner(s, actor, `Player ${actor + 1} empties their hand.`);
        else nextTurn(s);
      }
      break;
    }
    case "golf-six": {
      if (d.setup) {
        check(t === "choose", "Reveal two of your grid cards.");
        const at = index(c.index, 6);
        check(!d.revealed[actor][at], "Already revealed.");
        d.revealed[actor][at] = true;
        if (d.revealed[actor].filter(Boolean).length === 2) {
          nextTurn(s);
          if (s.turn === 0) d.setup = false;
        }
        break;
      }
      if (t === "draw") {
        check(d.held === null, "Place or discard the drawn card first.");
        const source = text(c.source, 16);
        check(source === "stock" || source === "discard", "Choose a source.");
        if (source === "discard") {
          check(d.discard.length, "Discard is empty.");
          d.held = d.discard.pop();
        } else d.held = draw(d);
        break;
      }
      check(d.held !== null, "Draw first.");
      const at = index(c.index, 6);
      if (t === "replace") {
        d.discard.push(hand[at]);
        hand[at] = d.held;
        d.revealed[actor][at] = true;
      } else {
        check(
          t === "flip-discard",
          "Replace a card, or discard and reveal a hidden card.",
        );
        check(!d.revealed[actor][at], "Choose a hidden card to reveal.");
        d.discard.push(d.held);
        d.revealed[actor][at] = true;
      }
      d.held = null;
      if (d.trigger < 0 && d.revealed[actor].every(Boolean)) {
        d.trigger = actor;
        d.final = s.players - 1;
      } else if (d.trigger >= 0) d.final--;
      if (d.trigger >= 0 && d.final === 0) {
        d.points = d.hands.map((h: number[]) => {
          let points = 0;
          for (let col = 0; col < 3; col++) {
            const a = card(d, h[col]),
              b = card(d, h[col + 3]);
            if (a.rank !== b.rank)
              points +=
                (a.rank === 13 ? 0 : Math.min(a.rank, 10)) +
                (b.rank === 13 ? 0 : Math.min(b.rank, 10));
          }
          return points;
        });
        const low = Math.min(...d.points);
        finish(
          s,
          d.points.map((p: number) => (p === low ? 1 : 0)),
          `Golf points: ${d.points.join(" / ")}. Lowest wins.`,
        );
      } else nextTurn(s);
      break;
    }
    case "old-maid": {
      check(t === "choose", "Choose a facedown card.");
      const target = nextWithCards(s, actor);
      if (target === actor) {
        finish(
          s,
          s.scores.map((_, i) => (i === actor ? 0 : 1)),
          `Player ${actor + 1} holds the Old Maid.`,
        );
        break;
      }
      const at = index(c.index, d.hands[target].length);
      hand.push(d.hands[target].splice(at, 1)[0]);
      removePairs(s, actor);
      const alive = d.hands.flatMap((h: number[], i: number) =>
        h.length ? [i] : [],
      );
      if (alive.length <= 1) {
        const loser = alive[0];
        finish(
          s,
          s.scores.map((_, i) => (i === loser ? 0 : 1)),
          `Player ${loser + 1} holds the Old Maid.`,
        );
      } else s.turn = nextWithCards(s, actor);
      break;
    }
    default:
      throw new Error("Unknown card command.");
  }
}
export function cardConservation(s: PackState): boolean {
  const d = s.data,
    ids: number[] = [
      ...d.deck,
      ...d.discard,
      ...d.hands.flat(),
      ...(d.pot ?? []),
      ...(d.dealer ?? []),
      ...(d.books ?? []).flat(2),
      ...(d.pairs ?? []).flat(),
      ...(d.removed ?? []),
    ];
  if (d.held !== null && d.held !== undefined) ids.push(d.held);
  if (d.current !== undefined) ids.push(d.current);
  return (
    ids.length === d.cards.length &&
    new Set(ids).size === ids.length &&
    ids.every((i) => Number.isInteger(i) && i >= 0 && i < d.cards.length)
  );
}
