import { test } from "node:test";
import assert from "node:assert/strict";
import { PACK_GAMES, CARD_IDS, STRATEGY_IDS } from "../src/lib/pack/catalog";
import { GAMES } from "../src/lib/games";
import {
  newPackGame,
  commandPack,
  projectPack,
  type PackState,
  type Command,
  clone,
  random,
  int,
  sum,
} from "../src/lib/pack";
import {
  cardConservation,
  rummyGroups,
  groupKind,
  sevensLegal,
  twentyTotal,
  type PackCard,
} from "../src/lib/pack/card-games";
import { ruleAccept, pipeSolved, laserSolved, rotatedShape } from "../src/lib/pack/puzzles";
import { reversiMoves } from "../src/lib/pack/strategy";
import { ALL_WORDS } from "../src/lib/words";
function apply(s: PackState, c: Command, actor = s.turn) {
  const before = JSON.stringify(s),
    next = commandPack(s, c, actor);
  assert.equal(JSON.stringify(s), before, "pure reducer mutated input");
  // Audit intermediate public views, not merely eventual round completion.
  for(let viewer=0;viewer<next.players;viewer++) {
    const shown=projectPack(next,viewer).data,d=next.data;
    for(const field of ['board','pits','piles','values','selection','path','guessed','tiles','cursor','runs','sealed','found','rods','bank','keeper','mirrors','sides','weighs','result','edges','boxes'])
      if(Object.hasOwn(shown,field)&&Object.hasOwn(d,field))assert.deepEqual(shown[field],d[field],`${next.game}: stale ${field}`);
    if(CARD_IDS.includes(next.game)) {
      assert.equal(shown.deck,undefined);assert.equal(shown.hands,undefined);
      if(!['war','golf-six'].includes(next.game))assert.deepEqual(shown.handCards,d.hands[viewer].map((id:number)=>d.cards[id]));
      if(next.game==='war') {
        const ids=d.revealed.some((id:number|null)=>id!==null)?d.revealed:d.lastBattle??d.revealed;
        assert.deepEqual(shown.faces,ids.map((id:number|null)=>id===null?null:d.cards[id]),'War must reveal the CURRENT card immediately');
      }
      if(next.game==='golf-six') for(let p=0;p<next.players;p++) for(let i=0;i<6;i++) assert.deepEqual(shown.grids[p][i],['won','lost'].includes(next.phase)||d.revealed[p][i]?d.cards[d.hands[p][i]]:null);
    }
    if(next.game==='secret-mission')assert.equal(shown.clue,next.phase==='observe'&&viewer===next.turn?d.clues[viewer]:undefined);
    if(next.game==='battleship'){assert.deepEqual(shown.shots,d.shots[viewer]);assert.deepEqual(shown.incoming,d.shots[1-viewer]);}
  }
  return next;
}
function bfs(
  s: PackState,
  commands: (s: PackState) => Command[],
  key: (s: PackState) => string,
) {
  const queue = [s],
    seen = new Set<string>();
  for (let i = 0; i < queue.length && i < 10000; i++) {
    const current = queue[i];
    if (current.phase === "won") return current;
    for (const c of commands(current)) {
      try {
        const next = apply(current, c);
        const k = key(next);
        if (!seen.has(k)) {
          seen.add(k);
          queue.push(next);
        }
      } catch {
        /* invalid branch */
      }
    }
  }
  throw new Error("No solution found for " + s.game);
}
function solvePuzzle(state: PackState) {
  let s = state;
  const d = s.data,
    go = (c: Command) => {
      s = apply(s, c, 0);
    };
  switch (s.game) {
    case "thought-number": {
      const target = Math.min(d.range, 17);
      while (s.phase === "play")
        go({
          type: "answer",
          yes: s.data.groups[s.data.cursor].includes(target),
        });
      assert.match(s.message, new RegExp(String(target)));
      break;
    }
    case "order-garden":
      for (const target of d.targets)
        go({ type: "choose", index: d.tiles.indexOf(target) });
      break;
    case "corrupted-file":
      go({ type: "ready" });
      go({ type: "choose", index: d.answer });
      break;
    case "fact-chain":
      go({ type: "ready" });
      while (s.phase === "play")
        go({ type: "answer", answer: d.facts[d.questions[s.data.cursor]][1] });
      break;
    case "future-message": {
      const answer = String(d.values[d.answerIndex]);
      go({ type: "ready", answer: "remember" });
      go({ type: "answer", answer: String(sum(d.distractions[0])) });
      go({ type: "answer", answer: String(sum(d.distractions[1])) });
      go({ type: "answer", answer });
      break;
    }
    case "timeline-tangle":
      for (const i of d.events
        .map((_: unknown, i: number) => i)
        .sort((a: number, b: number) => d.events[a][1] - d.events[b][1]))
        go({ type: "choose", index: i });
      go({ type: "check" });
      break;
    case "rule-shift":
      while (s.phase === "play")
        go({ type: "answer", yes: ruleAccept(d.rule, d.tests[s.data.cursor]) });
      break;
    case "word-ladder":
      for (const answer of d.path.slice(1)) go({ type: "answer", answer });
      break;
    case "word-search": {
      let route: number[] = [];
      for (let i = 0; i < d.grid.length && !route.length; i++)
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
          const path: number[] = [];
          for (let n = 0; n < d.word.length; n++) {
            const r = Math.floor(i / d.n) + dr * n,
              c = (i % d.n) + dc * n;
            if (r < 0 || r >= d.n || c < 0 || c >= d.n) break;
            path.push(r * d.n + c);
          }
          if (
            path.length === d.word.length &&
            path.map((j) => d.grid[j]).join("") === d.word
          ) {
            route = path;
            break;
          }
        }
      assert.ok(route.length);
      for (const index of route) go({ type: "choose", index });
      break;
    }
    case "hangman":
      for (const answer of new Set<string>(d.word))
        go({ type: "answer", answer });
      break;
    case "anagram-forge":
      for (const answer of d.valid.slice(0, d.goal))
        go({ type: "answer", answer });
      break;
    case "category-sort":
      for (const item of d.items) go({ type: "answer", answer: item.category });
      break;
    case "sentence-order": {
      const used: number[] = [];
      for (const word of d.sentence.split(" ")) {
        const index = d.tiles.findIndex(
          (v: string, i: number) => v === word && !used.includes(i),
        );
        used.push(index);
        go({ type: "choose", index });
      }
      go({ type: "check" });
      break;
    }
    case "cipher-lab":
      go({ type: "answer", answer: d.plain });
      break;
    case "binary-bridge":
      for (let i = 0; i < d.bits; i++)
        if (d.target & (1 << (d.bits - 1 - i)))
          go({ type: "choose", index: i });
      go({ type: "check" });
      break;
    case "fraction-balance":
      for (const [a, b, c, e] of d.pairs)
        go({
          type: "answer",
          answer:
            a * e === c * b
              ? "equal"
              : a * e < c * b
                ? "left smaller"
                : "left larger",
        });
      break;
    case "make-target":
      for (const step of d.recipe)
        go({
          type: "combine",
          first: s.data.values.findIndex(
            (v: { id: number }) => v.id === step.first,
          ),
          second: s.data.values.findIndex(
            (v: { id: number }) => v.id === step.second,
          ),
          op: step.op,
        });
      break;
    case "nonogram":
      for (let i = 0; i < d.solution.length; i++)
        if (d.solution[i]) go({ type: "choose", index: i });
      go({ type: "check" });
      break;
    case "mini-sudoku":
    case "cross-sums":
      for (let i = 0; i < d.solution.length; i++)
        if (!d.given.includes(i))
          go({ type: "set", index: i, value: d.solution[i] });
      go({ type: "check" });
      break;
    case "river-crossing":
      return bfs(
        s,
        () => [-1, 0, 1, 2].map((index) => ({ type: "cross", index })),
        (s) => JSON.stringify([s.data.bank, s.data.keeper]),
      );
    case "water-jugs":
      return bfs(
        s,
        () =>
          ["fill", "empty", "pour"].flatMap((type) =>
            [0, 1].map((index) => ({ type, index })),
          ),
        (s) => s.data.values.join(","),
      );
    case "tower-hanoi": {
      const move = (n: number, a: number, b: number, c: number) => {
        if (!n) return;
        move(n - 1, a, c, b);
        go({ type: "move", from: a, to: b });
        move(n - 1, c, b, a);
      };
      move(d.n, 0, d.target, 3 - d.target);
      break;
    }
    case "circuit-route":
      for (let i = 0; i < d.tiles.length; i++)
        for (
          let turns = 0;
          s.data.tiles[i] !== d.solution[i] && turns < 4;
          turns++
        )
          go({ type: "choose", index: i });
      assert.ok(pipeSolved(s.data));
      go({ type: "check" });
      break;
    case "laser-mirrors": {
      let mask = -1;
      for (let m = 0; m < 4; m++) {
        const candidate = clone(d);
        for (let i = 0; i < 2; i++)
          if (m & (1 << i))
            candidate.mirrors[i].char =
              candidate.mirrors[i].char === "/" ? "\\" : "/";
        if (laserSolved(candidate)) {
          mask = m;
          break;
        }
      }
      assert.ok(mask >= 0);
      for (let i = 0; i < 2; i++)
        if (mask & (1 << i)) go({ type: "choose", index: i });
      go({ type: "check" });
      break;
    }
    case "balance-scale":
      go({ type: "accuse", index: d.heavy });
      break;
    case "peg-solitaire":
      for (const step of d.solution) go({ type: "jump", ...step });
      break;
    case "knapsack-vault": {
      let found = false;
      for (let mask = 0; mask < 2 ** d.items.length && !found; mask++) {
        const ids = d.items.flatMap((_: unknown, i: number) =>
          mask & (1 << i) ? [i] : [],
        );
        if (
          sum(ids.map((i: number) => d.items[i].weight)) <= d.capacity &&
          sum(ids.map((i: number) => d.items[i].value)) === d.target
        ) {
          for (const index of ids) go({ type: "choose", index });
          found = true;
        }
      }
      assert.ok(found);
      go({ type: "check" });
      break;
    }
    case "path-sum":
      for (const index of d.solution.slice(1)) go({ type: "choose", index });
      break;
    case "n-back":
      while (s.phase === "observe") go({ type: "ready" });
      while (s.phase === "play")
        go({
          type: "answer",
          yes: d.stream[s.data.cursor] === d.stream[s.data.cursor - d.n],
        });
      break;
    case "story-recall":
      go({ type: "ready" });
      while (s.phase === "play")
        go({
          type: "answer",
          answer: d.entries[d.questions[s.data.cursor]].place,
        });
      break;
    case "mental-rotation":
      go({ type: "choose", index: d.rotations.indexOf(d.angle) });
      break;
    case "focus-switch":
      while (s.phase === "play") {
        const trial = d.trials[s.data.cursor];
        go({
          type: "choose",
          index:
            trial.cue === "#"
              ? trial.values.findIndex(
                  (v: string) =>
                    Number(v) === Math.max(...trial.values.map(Number)),
                )
              : trial.values.findIndex(
                  (v: string) =>
                    v.length ===
                    Math.min(...trial.values.map((x: string) => x.length)),
                ),
        });
      }
      break;
    case "logic-grid":
      for (let i = 0; i < d.n; i++)
        go({ type: "assign", index: i, value: d.solution[i] });
      go({ type: "check" });
      break;
    case "probability-pick": {
      const probabilities = d.bags.map(
        (b: { red: number; blue: number }) =>
          ((b.red / (b.red + b.blue)) * (b.red - 1)) / (b.red + b.blue - 1),
      );
      go({
        type: "choose",
        index: probabilities.indexOf(Math.max(...probabilities)),
      });
      break;
    }
    default:
      throw new Error("Missing solver " + s.game);
  }
  return s;
}
function simulate(s: PackState, seed = 1) {
  const rng = random(seed);
  for (
    let move = 0;
    move < 6000 && ["play", "observe"].includes(s.phase);
    move++
  ) {
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
        c = moves.length
          ? { type: "choose", index: moves[0] }
          : { type: "pass" };
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
        c = {
          type: "choose",
          index: d.shots[p].findIndex((v: number) => v < 0),
        };
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
    s = apply(s, c);
    if (CARD_IDS.includes(s.game))
      assert.ok(cardConservation(s), s.game + " lost a card");
  }
  assert.ok(
    s.phase === "won" || s.phase === "lost",
    s.game + " did not finish",
  );
  return s;
}

test("70 distinct routes; 51 new identities; modes and caps are honest", () => {
  assert.equal(PACK_GAMES.length, 51);
  assert.equal(GAMES.length, 70);
  assert.equal(new Set(GAMES.map((g) => g.id)).size, 70);
  assert.equal(PACK_GAMES.filter((g) => g.modes.includes("online")).length, 15);
  for (const g of PACK_GAMES) {
    assert.ok(g.rules.length > 50);
    assert.ok(g.endless);
    assert.ok(g.min >= 1 && g.max <= 10);
  }
});
for (const g of PACK_GAMES.filter(
  (g) => !CARD_IDS.includes(g.id) && !STRATEGY_IDS.includes(g.id),
))
  test(`${g.id}: solve generated levels without mutation`, () => {
    for (const level of [1, 2, 8, 50, 1000000])
      for (const seed of [1, 17, 99]) {
        const s = newPackGame(g.id, 1, level, {}, seed),
          p = projectPack(s, 0);
        assert.equal(p.game, g.id);
        assert.equal(solvePuzzle(s).phase, "won");
      }
    if (g.id === "order-garden")
      assert.equal(
        solvePuzzle(newPackGame(g.id, 1, 5, { garden: "numbers" }, 3)).phase,
        "won",
      );
  });
for (const id of [...CARD_IDS.filter((id) => id !== "rummy"), ...STRATEGY_IDS])
  test(`${id}: full legal round at all supported seat counts`, () => {
    const def = PACK_GAMES.find((g) => g.id === id)!;
    for (const players of new Set([def.min, def.max]))
      for (const seed of [1, 17, 99]) {
        const s = newPackGame(id, players, 8, {}, seed);
        assert.ok(simulate(s, seed));
      }
  });
test("Rummy scales decks for 2–10; stock/draw/discard conserve every physical card", () => {
  for (let players = 2; players <= 10; players++)
    for (const jokers of [false, true]) {
      let s = newPackGame("rummy", players, 1, { jokers }, players);
      assert.equal(
        s.data.cards.length,
        (players <= 2 ? 1 : players <= 5 ? 2 : players <= 8 ? 3 : 4) *
          (jokers ? 54 : 52),
      );
      for (let n = 0; n < 140; n++) {
        s = apply(s, { type: "draw", source: "stock" });
        s = apply(s, { type: "discard", index: n % 14 });
        assert.ok(cardConservation(s));
      }
      assert.throws(() => apply(s, { type: "draw", source: "illegal" }));
    }
});
const C = (rank: number, suit = "S", id = rank): PackCard => ({
  id,
  rank,
  suit,
});
test("Rummy meld rules: pure, jokers, Ace high/low, duplicate suits, no wrap", () => {
  assert.equal(groupKind([C(1), C(2), C(3)]), "pure");
  assert.equal(groupKind([C(12), C(13), C(1)]), "pure");
  assert.equal(groupKind([C(13), C(1), C(2)]), null);
  assert.equal(groupKind([C(3), C(5), C(0, "J")]), "run");
  assert.equal(groupKind([C(3), C(0, "J"), C(0, "J", 99)]), null);
  assert.equal(groupKind([C(7, "S"), C(7, "H"), C(7, "D")]), "set");
  assert.equal(groupKind([C(7, "S"), C(7, "S", 80), C(7, "D")]), null);
});
test("Rummy declaration partitions exactly 3+3+3+4, requires pure run, and is atomic", () => {
  let s = newPackGame("rummy", 2, 1, {}, 10);
  const specs: [[number, string], ...[number, string][]] = [
    [1, "S"],
    [2, "S"],
    [3, "S"],
    [6, "H"],
    [7, "H"],
    [8, "H"],
    [10, "S"],
    [10, "H"],
    [10, "D"],
    [13, "S"],
    [13, "H"],
    [13, "D"],
    [13, "C"],
  ];
  const hand = specs.map(
    ([rank, suit]) =>
      s.data.cards.find((c: PackCard) => c.rank === rank && c.suit === suit).id,
  );
  const remaining = s.data.cards
    .map((c: PackCard) => c.id)
    .filter((id: number) => !hand.includes(id));
  s.data.hands = [hand, remaining.splice(0, 13)];
  s.data.discard = [remaining.shift()];
  s.data.deck = remaining;
  assert.ok(rummyGroups(hand.map((id) => s.data.cards[id])));
  assert.equal(apply(s, { type: "declare" }).phase, "won");
  s = apply(s, { type: "draw", source: "stock" });
  const before = JSON.stringify(s);
  const wrong = s.data.hands[0].findIndex((id: number) => id === hand[0]);
  assert.throws(() =>
    apply(s, { type: "discard", index: wrong, declare: true }),
  );
  assert.equal(JSON.stringify(s), before);
  assert.equal(
    apply(s, { type: "discard", index: 13, declare: true }).phase,
    "won",
  );
  const noPure = [
    C(1, "S", 1),
    C(1, "H", 2),
    C(1, "D", 3),
    C(2, "S", 4),
    C(2, "H", 5),
    C(2, "D", 6),
    C(3, "S", 7),
    C(3, "H", 8),
    C(3, "D", 9),
    C(4, "S", 10),
    C(4, "H", 11),
    C(4, "D", 12),
    C(4, "C", 13),
  ];
  /* other partitions can make runs, so use far-apart ranks */ for (const c of noPure)
    c.rank = [1, 5, 9, 13][Math.floor((c.id - 1) / 3)] ?? 13;
  assert.equal(rummyGroups(noPure), null);
});
test("Private projections exclude decks, opponent hands, fleets and sealed clues", () => {
  for (const id of CARD_IDS) {
    const def = PACK_GAMES.find((g) => g.id === id)!;
    const s = newPackGame(id, def.min, 1, {}, 2);
    for (const viewer of [undefined, 0, Math.min(1, s.players - 1)]) {
      const p = projectPack(s, viewer);
      assert.equal(p.data.cards, undefined);
      assert.equal(p.data.deck, undefined);
      assert.equal(p.data.hands, undefined);
      assert.equal(p.data.recycleSeed, undefined);
      if (viewer === undefined) assert.deepEqual(p.data.handCards, []);
      if (id === "golf-six")
        assert.ok(p.data.grids.flat().every((c: unknown) => c === null));
    }
    assert.equal(JSON.stringify(s), JSON.stringify(clone(s)));
  }
  const b = newPackGame("battleship", 2, 1, {}, 1);
  assert.deepEqual(projectPack(b).data.ownBoard, []);
  assert.equal(projectPack(b, 0).data.boards, undefined);
  assert.deepEqual(projectPack(b, 0).data.ownBoard, b.data.boards[0]);
  let m = newPackGame("secret-mission", 3, 1, {}, 4);
  assert.equal(projectPack(m, 1).data.clue, undefined);
  assert.equal(projectPack(m).data.clue, undefined);
  assert.equal(projectPack(m, 0).data.clue, m.data.clues[0]);
  assert.equal(projectPack(m, 0).data.clues, undefined);
  while (m.phase === "observe") m = apply(m, { type: "ready" });
  assert.equal(projectPack(m, 0).data.clue, undefined);
  assert.equal(projectPack(m, 0).data.clues, undefined);
});
test("Puzzle projections hide solutions and previous observations", () => {
  const keys = [
    "solution",
    "recipe",
    "plain",
    "heavy",
    "rule",
    "path",
    "stream",
    "word",
    "original",
    "facts",
    "entries",
    "values",
  ];
  for (const id of [
    "corrupted-file",
    "fact-chain",
    "story-recall",
    "future-message",
  ]) {
    let s = newPackGame(id, 1, 1, {}, 11);
    s = apply(s, { type: "ready", answer: "" });
    const p = projectPack(s, 0);
    for (const key of keys)
      assert.equal(p.data[key], undefined, `${id} leaked ${key}`);
  }
  for (const id of [
    "nonogram",
    "mini-sudoku",
    "cross-sums",
    "logic-grid",
    "make-target",
    "cipher-lab",
    "balance-scale",
    "n-back",
    "hangman",
  ]) {
    const p = projectPack(newPackGame(id, 1, 1, {}, 9), 0);
    for (const key of [
      "solution",
      "recipe",
      "plain",
      "heavy",
      "stream",
      "word",
    ])
      assert.equal(p.data[key], undefined, `${id} leaked ${key}`);
  }
});
test("All thought numbers 1–20 resolve; inconsistent range answers do not invent a result", () => {
  for (let n = 1; n <= 20; n++) {
    let s = newPackGame("thought-number", 1, 1, {}, n);
    while (s.phase === "play")
      s = apply(s, {
        type: "answer",
        yes: s.data.groups[s.data.cursor].includes(n),
      });
    assert.equal(s.message, `Your number is ${n}.`);
  }
  let s = newPackGame("thought-number", 1, 1, {}, 1);
  while (s.phase === "play") s = apply(s, { type: "answer", yes: false });
  assert.equal(s.phase, "lost");
});
test("Wrong actors, malformed commands, repeated actions and invalid indices do not mutate state", () => {
  for (const g of PACK_GAMES) {
    const s = newPackGame(g.id, g.min, 1, {}, 71),
      before = JSON.stringify(s);
    assert.throws(() =>
      commandPack(s, { type: "__replace-state", state: { phase: "won" } }, 0),
    );
    assert.throws(() =>
      commandPack(s, { type: "choose", index: -1 }, s.players),
    );
    assert.throws(() => commandPack(s, { type: "choose", index: Infinity }, 0));
    assert.equal(JSON.stringify(s), before);
    if (s.players > 1 && g.id !== "secret-mission")
      assert.throws(() => commandPack(s, { type: "choose", index: 0 }, 1));
  }
  const s = solvePuzzle(newPackGame("binary-bridge", 1, 1, {}, 1));
  assert.throws(() => apply(s, { type: "check" }));
});
test("Constraint puzzles accept alternative valid solutions, not only hidden generator answers", () => {
  let s = newPackGame("mini-sudoku", 1, 1, {}, 5);
  s.data.given = [];
  s.data.values = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
  assert.equal(apply(s, { type: "check" }).phase, "won");
  s = newPackGame("cross-sums", 1, 1, {}, 5);
  s.data.given = [];
  s.data.values = [1, 2, 3, 2, 3, 1, 3, 1, 2];
  s.data.rows = [6, 6, 6];
  s.data.cols = [6, 6, 6];
  assert.equal(apply(s, { type: "check" }).phase, "won");
});
test("Children mistakes never consume lives; memory mismatch closes at three misses", () => {
  let s = newPackGame("order-garden", 1, 1, {}, 3);
  for (let i = 0; i < 30; i++)
    s = apply(s, { type: "choose", index: s.data.tiles.indexOf("Z") });
  assert.equal(s.lives, 3);
  assert.equal(s.data.cursor, 0);
  s = newPackGame("corrupted-file", 1, 1, {}, 2);
  s = apply(s, { type: "ready" });
  for (let i = 0; i < 3; i++)
    s = apply(s, {
      type: "choose",
      index: (s.data.answer + 1) % s.data.display.length,
    });
  assert.equal(s.phase, "lost");
});

test("Rule Shift samples uniquely distinguish its five documented rules across 500 seeds", () => {
  for (let seed = 0; seed < 500; seed++) {
    const d = newPackGame("rule-shift", 1, 1, {}, seed).data;
    const possible = [0, 1, 2, 3, 4].filter(
      (rule) =>
        d.accept.every((n: number) => ruleAccept(rule, n)) &&
        d.reject.every((n: number) => !ruleAccept(rule, n)),
    );
    assert.deepEqual(possible, [d.rule]);
  }
});
test("Dots boxes has four exact edges per box and completion grants an extra turn", () => {
  let s = newPackGame("dots-boxes", 2, 1, {}, 1);
  const box = s.data.boxes[0];
  for (const b of s.data.boxes) assert.equal(b.edges.length, 4);
  for (const index of box.edges.slice(0, 3))
    s = apply(s, { type: "choose", index });
  const actor = s.turn;
  s = apply(s, { type: "choose", index: box.edges[3] });
  assert.equal(s.data.boxes[0].owner, actor);
  assert.equal(s.turn, actor);
  assert.throws(() => apply(s, { type: "choose", index: box.edges[3] }));
});
test("Reversi brackets/flips, legal-move requirement and mandatory pass are enforced", () => {
  const s = newPackGame("reversi", 2, 1, {}, 1);
  assert.equal(reversiMoves(s.data.board, 1).length, 4);
  assert.throws(() => apply(s, { type: "pass" }));
  const next = apply(s, {
    type: "choose",
    index: reversiMoves(s.data.board, 1)[0],
  });
  assert.equal(next.data.board.filter((n: number) => n === 1).length, 4);
  assert.equal(next.data.board.filter((n: number) => n === 2).length, 1);
  assert.throws(() => apply(s, { type: "choose", index: 0 }));
});
test("Mancala captures opposite stones, skips the opponent store and preserves 48 stones", () => {
  let s = newPackGame("mancala", 2, 1, {}, 1);
  s.data.pits = [0, 1, 0, 1, 1, 1, 0, 4, 4, 4, 4, 4, 4, 20];
  const before = sum(s.data.pits);
  s = apply(s, { type: "choose", index: 1 });
  assert.equal(s.data.pits[6], 5);
  assert.equal(s.data.pits[10], 0);
  assert.equal(sum(s.data.pits), before);
  assert.equal(sum(s.data.pits), 48);
});
test("Twenty One soft aces; Sevens blocked passes; Golf matching columns cancel", () => {
  assert.equal(twentyTotal([C(1), C(1, "H"), C(9)]), 21);
  assert.equal(twentyTotal([C(1), C(13, "H")]), 21);
  assert.equal(twentyTotal([C(13), C(12, "H"), C(2)]), 22);
  const s = newPackGame("sevens", 2, 1, {}, 1);
  assert.ok(s.data.hands[0].some((id: number) => sevensLegal(s.data, id)));
  assert.throws(() => apply(s, { type: "pass" }));
  let g = newPackGame("golf-six", 2, 1, {}, 2);
  g = simulate(g);
  assert.equal(g.data.points.length, 2);
  for (let p = 0; p < 2; p++) {
    let expected = 0;
    for (let col = 0; col < 3; col++) {
      const a = g.data.cards[g.data.hands[p][col]],
        b = g.data.cards[g.data.hands[p][col + 3]];
      if (a.rank !== b.rank)
        expected +=
          (a.rank === 13 ? 0 : Math.min(a.rank, 10)) +
          (b.rank === 13 ? 0 : Math.min(b.rank, 10));
    }
    assert.equal(g.data.points[p], expected);
  }
});
test("Bounded generators keep high levels small and seeded rounds deterministic", () => {
  for (const g of PACK_GAMES) {
    const a = newPackGame(g.id, g.min, Number.MAX_SAFE_INTEGER, {}, 42),
      b = newPackGame(g.id, g.min, Number.MAX_SAFE_INTEGER, {}, 42);
    assert.equal(JSON.stringify(a), JSON.stringify(b));
    assert.ok(
      JSON.stringify(a).length < 30000,
      g.id + " state unexpectedly large",
    );
  }
});


test('War reveals the first card immediately on every battle at levels 1 and 2',()=>{
 for(const level of [1,2])for(const seed of [1,17,99]){let s=newPackGame('war',2,level,{},seed);while(s.phase==='play'){
  const before=s.data.hands[s.turn][0],actor=s.turn;s=apply(s,{type:'reveal'});
  if(s.data.revealed.some((id:number|null)=>id!==null)){const faces=projectPack(s,actor).data.faces;assert.equal(faces[actor].id,before);assert.equal(faces[1-actor],null);assert.equal(projectPack(s).data.revealStage,'revealing');}
 }assert.ok(cardConservation(s));}
});
test('War final equal cards: both exhausted is draw; only one exhausted loses',()=>{
 for(const extra of [-1,0,1]){let s=newPackGame('war',2,1,{},1);const d=s.data,a=d.cards.find((c:PackCard)=>c.rank===5&&c.suit==='S').id,b=d.cards.find((c:PackCard)=>c.rank===5&&c.suit==='H').id;
 d.hands=[[a],[b]];const rest=d.cards.map((c:PackCard)=>c.id).filter((id:number)=>id!==a&&id!==b);if(extra>=0)d.hands[extra].push(rest.shift());d.deck=[];d.discard=rest;
 s=apply(s,{type:'reveal'});s=apply(s,{type:'reveal'});assert.equal(s.phase,'won');assert.deepEqual(s.scores,extra<0?[0,0]:extra===0?[1,0]:[0,1]);assert.ok(cardConservation(s));}
});
test('Mental Rotation has four visibly distinct options and grades geometry, including old symmetric states',()=>{
 const key=(shape:number[][],turns:number)=>rotatedShape(shape,turns).map(p=>p.join(',')).sort().join(';');
 for(let seed=0;seed<250;seed++){const s=newPackGame('mental-rotation',1,1,{},seed),d=s.data;assert.equal(new Set(d.rotations.map((r:number)=>key(d.shape,r))).size,4);for(let i=0;i<4;i++){const next=apply(s,{type:'choose',index:i});assert.equal(next.phase==='won',key(d.shape,d.rotations[i])===key(d.shape,d.angle));}}
 const old=newPackGame('mental-rotation',1,1,{},1);old.data.shape=[[0,0],[0,1],[1,1],[2,1],[2,2]];old.data.rotations=[0,1,2,3];old.data.angle=2;assert.equal(apply(old,{type:'choose',index:0}).phase,'won');
});
test('River Crossing keeps real forbidden food-chain pairs when display order changes',()=>{
 const allowed=new Set(['fox,hen','grain,hen','goat,wolf','cabbage,goat','cat,mouse','cheese,mouse']);for(let seed=0;seed<250;seed++){const d=newPackGame('river-crossing',1,1,{},seed).data;for(const pair of d.conflicts)assert.ok(allowed.has([...pair].sort().join(',')));}
});
