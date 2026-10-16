import { packGame, CARD_IDS, STRATEGY_IDS } from "./catalog";
import {
  type PackState,
  type Bag,
  type Command,
  random,
  seedNow,
  clone,
  check,
} from "./core";
import { makePuzzle, puzzleCommand } from "./puzzles";
import { makeStrategy, strategyCommand } from "./strategy";
import {
  makeCardGame,
  cardCommand,
  cardConservation,
  type PackCard,
} from "./card-games";
export * from "./core";
export { packGame } from "./catalog";
export function newPackGame(
  game: string,
  players = 1,
  level = 1,
  options: Bag = {},
  seed = seedNow(),
): PackState {
  const def = packGame(game);
  check(def, "Unknown expansion game.");
  check(
    Number.isInteger(players) && players >= def.min && players <= def.max,
    "Invalid player count.",
  );
  const safeOptions = {
      jokers: options.jokers === true,
      garden: options.garden === "numbers" ? "numbers" : "alphabet",
    },
    rng = random(seed);
  if (CARD_IDS.includes(game))
    return makeCardGame(game, level, players, rng, safeOptions);
  if (STRATEGY_IDS.includes(game))
    return makeStrategy(game, level, players, rng);
  check(players === 1, "Puzzle relays use one active player per board.");
  return makePuzzle(game, level, rng, safeOptions);
}
export function commandPack(
  previous: PackState,
  command: unknown,
  actor = 0,
): PackState {
  check(
    previous?.v === 1 && packGame(previous.game),
    "Unsupported game-state version.",
  );
  check(
    previous.phase === "play" || previous.phase === "observe",
    "Round is over.",
  );
  check(
    command && typeof command === "object" && !Array.isArray(command),
    "Invalid command.",
  );
  const c = command as Command;
  check(
    typeof c.type === "string" && c.type.length <= 32,
    "Invalid command type.",
  );
  check(
    Number.isInteger(actor) && actor >= 0 && actor < previous.players,
    "Invalid player.",
  );
  const s = clone(previous);
  s.message = "";
  if (CARD_IDS.includes(s.game)) {
    cardCommand(s, c, actor);
    check(cardConservation(s), "Card conservation check failed.");
  } else if (STRATEGY_IDS.includes(s.game)) strategyCommand(s, c, actor);
  else {
    check(actor === 0, "This puzzle has one active solver.");
    puzzleCommand(s, c);
  }
  return s;
}
// Whitelist projections, not blacklists: private cards/answers never enter
// unauthenticated room lists, other seats' snapshots or error responses.
export function projectPack(state: PackState, viewer?: number): PackState {
  if (state?.v !== 1 || !packGame(state.game)) return state;
  const s = {
      v: state.v,
      game: state.game,
      level: state.level,
      players: state.players,
      turn: state.turn,
      phase: state.phase,
      scores: [...state.scores],
      lives: state.lives,
      message: state.message,
      options: {
        jokers: state.options?.jokers === true,
        garden: state.options?.garden ?? "alphabet",
      },
      data: {},
    } as PackState,
    d = state.data,
    out = s.data;
  const copy = (keys: string[]) => {
    for (const key of keys) if (d[key] !== undefined) out[key] = clone(d[key]);
  };
  const done = state.phase === "won" || state.phase === "lost";
  if (CARD_IDS.includes(state.game)) {
    copy([
      "drawn",
      "lastAsk",
      "streak",
      "goal",
      "battles",
      "runs",
      "setup",
      "trigger",
      "final",
      "points",
      "outcomes",
      "totals",
    ]);
    out.deckCount = d.deck.length;
    out.handCounts = d.hands.map((h: number[]) => h.length);
    out.discardTop = d.discard.length ? d.cards[d.discard.at(-1)] : null;
    out.discardCount = d.discard.length;
    out.handCards =
      viewer !== undefined && state.game !== "war" && state.game !== "golf-six"
        ? (d.hands[viewer]?.map((id: number) => d.cards[id]) ?? [])
        : [];
    if (state.game === "go-fish")
      out.books = d.books.map((b: number[][]) => b.length);
    if (state.game === "higher-lower") out.current = d.cards[d.current];
    if (state.game === "war") {
      out.potCount = d.pot.length;
      out.faces = (d.lastBattle ?? d.revealed).map((id: number | null) =>
        id === null ? null : d.cards[id],
      );
    }
    if (state.game === "twenty-one")
      out.dealer = d.dealer.map((id: number, i: number) =>
        done || i === 0 ? d.cards[id] : null,
      );
    if (state.game === "golf-six") {
      out.grids = d.hands.map((h: number[], p: number) =>
        h.map((id: number, i: number) =>
          done || d.revealed[p][i] ? d.cards[id] : null,
        ),
      );
      out.revealed = clone(d.revealed);
      out.held =
        viewer === state.turn && d.held !== null ? d.cards[d.held] : null;
    }
    if (d.winningGroups)
      out.winningGroups = d.winningGroups.map((g: number[]) =>
        g.map((id) => d.cards[id] as PackCard),
      );
    return s;
  }
  const fields: Record<string, string[]> = {
    "thought-number": ["range", "cursor", "total"],
    "order-garden": ["alphabet", "targets", "tiles", "cursor"],
    "corrupted-file": ["display"],
    "fact-chain": ["cursor"],
    "future-message": ["reminder", "cursor", "answerIndex"],
    "timeline-tangle": ["selection"],
    "rule-shift": ["accept", "reject", "cursor"],
    "word-ladder": ["history", "target", "bank"],
    "word-search": ["word", "n", "grid", "selection"],
    hangman: ["guessed"],
    "anagram-forge": ["rack", "goal", "found"],
    "category-sort": ["categories", "cursor"],
    "sentence-order": ["tiles", "selection"],
    "cipher-lab": ["shift", "cipher"],
    "binary-bridge": ["bits", "target", "values"],
    "fraction-balance": ["cursor"],
    "make-target": ["values", "target"],
    nim: ["piles"],
    "dots-boxes": ["n", "edges", "boxes"],
    reversi: ["board"],
    mancala: ["pits"],
    battleship: [],
    "word-duel": ["words", "letter", "totals"],
    "poisoned-chocolate": ["rows", "cols", "board"],
    nonogram: ["n", "rows", "cols", "values"],
    "mini-sudoku": ["values", "given"],
    "cross-sums": ["values", "given", "rows", "cols"],
    "river-crossing": ["names", "conflicts", "bank", "keeper"],
    "water-jugs": ["caps", "target", "values"],
    "tower-hanoi": ["n", "rods", "target", "moves"],
    "circuit-route": ["n", "tiles"],
    "laser-mirrors": ["n", "entry", "exit", "mirrors"],
    "balance-scale": ["n", "sides", "weighs", "limit", "result"],
    "peg-solitaire": ["n", "holes", "values"],
    "knapsack-vault": ["items", "capacity", "target", "selected"],
    "path-sum": ["n", "grid", "target", "path"],
    "n-back": ["n", "cursor", "correct"],
    "story-recall": ["cursor"],
    "mental-rotation": ["shape", "rotations", "angle"],
    "focus-switch": ["cursor"],
    "logic-grid": ["n", "names", "objects", "clues", "values"],
    "probability-pick": ["bags"],
    "secret-mission": ["sealed"],
  };
  copy(fields[state.game] ?? []);
  switch (state.game) {
    case "thought-number":
      out.question = d.groups[d.cursor] ?? [];
      out.questionCount = d.groups.length;
      break;
    case "corrupted-file":
      if (state.phase === "observe") out.original = clone(d.original);
      if (done) out.answer = d.answer;
      break;
    case "fact-chain":
      if (state.phase === "observe") out.facts = clone(d.facts);
      else if (!done) {
        const q = d.facts[d.questions[d.cursor]];
        out.question = q[0];
        out.answers = d.facts.map((f: string[]) => f[1]);
      }
      break;
    case "future-message":
      if (state.phase === "observe") out.values = clone(d.values);
      else if (d.cursor < 2) out.distraction = clone(d.distractions[d.cursor]);
      break;
    case "timeline-tangle":
      out.events = d.events.map(([label, date]: [string, number]) =>
        done ? [label, date] : [label, null],
      );
      break;
    case "rule-shift":
      out.test = d.tests[d.cursor];
      break;
    case "hangman":
      out.mask = [...d.word]
        .map((ch) => (done || d.guessed.includes(ch) ? ch : "_"))
        .join(" ");
      break;
    case "anagram-forge":
      out.bank = clone(d.valid);
      break;
    case "category-sort":
      out.item = d.items[d.cursor]?.word;
      break;
    case "battleship":
      out.ownBoard = viewer === undefined ? [] : clone(d.boards[viewer]);
      out.shots =
        viewer === undefined ? Array(25).fill(-1) : clone(d.shots[viewer]);
      out.incoming =
        viewer === undefined ? Array(25).fill(-1) : clone(d.shots[1 - viewer]);
      break;
    case "fraction-balance":
      out.pair = d.pairs[d.cursor] ?? null;
      break;
    case "n-back":
      out.current = d.stream[d.cursor];
      out.questionCount = 8;
      break;
    case "story-recall":
      if (state.phase === "observe") out.entries = clone(d.entries);
      else if (!done) {
        const q = d.entries[d.questions[d.cursor]];
        out.question = `Where did ${q.name} put the ${q.object}?`;
        out.answers = d.entries.map((e: Bag) => e.place);
      }
      break;
    case "focus-switch":
      out.trial = d.trials[d.cursor] ?? null;
      break;
    case "secret-mission":
      if (state.phase === "observe" && viewer === state.turn)
        out.clue = d.clues[viewer];
      if (done) out.teamTotal = sumSafe(d.clues);
      break;
  }
  return s;
}
const sumSafe = (values: number[]) => values.reduce((a, b) => a + b, 0);
