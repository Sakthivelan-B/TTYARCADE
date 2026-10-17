import { ALL_WORDS } from "../words";
import {
  type PackState,
  type Bag,
  type Command,
  type Random,
  base,
  int,
  pick,
  shuffle,
  check,
  index,
  text,
  win,
  fail,
  sum,
  runs,
  permutations,
  compare,
  clone,
} from "./core";
export const FACT_SOURCES = [
  "https://science.nasa.gov/mercury/facts/",
  "https://www.britannica.com/science/photosynthesis",
  "https://periodic-table.rsc.org/element/79/gold",
  "https://www.britannica.com/science/polygon",
  "https://www.nhlbi.nih.gov/health/heart",
  "https://www.noaa.gov/education/resource-collections/ocean-coasts/ocean",
  "https://spaceplace.nasa.gov/what-is-gravity/en/",
  "https://www.britannica.com/science/water",
  "https://www.bipm.org/en/measurement-units/si-base-units",
  "https://science.nasa.gov/sun/facts/",
  "https://www.britannica.com/science/angle",
  "https://www.usgs.gov/special-topics/water-science-school/science/evaporation-and-water-cycle",
  "https://periodic-table.rsc.org/element/8/oxygen",
  "https://www.britannica.com/place/Sahara-desert-Africa",
  "https://www.bipm.org/en/measurement-units/derived-units",
  "https://my.clevelandclinic.org/health/body/21088-skeletal-system",
  "https://www.britannica.com/technology/thermometer",
  "https://www.britannica.com/science/Mohs-hardness",
];
export const FACTS = [
  [
    "Which planet is closest to the Sun?",
    "Mercury",
    "Mercury is the innermost planet.",
  ],
  [
    "What gas do plants take in for photosynthesis?",
    "carbon dioxide",
    "Plants use carbon dioxide and water to produce sugars.",
  ],
  [
    "What is the chemical symbol for gold?",
    "Au",
    "Au comes from the Latin aurum.",
  ],
  ["How many sides does a hexagon have?", "six", "Hexa means six."],
  [
    "Which organ pumps blood?",
    "heart",
    "The heart pumps blood through the circulatory system.",
  ],
  [
    "What is the largest ocean?",
    "Pacific",
    "The Pacific is Earth’s largest ocean.",
  ],
  [
    "What force pulls objects toward Earth?",
    "gravity",
    "Gravity is the attraction between masses.",
  ],
  [
    "What is H2O commonly called?",
    "water",
    "A water molecule contains two hydrogen atoms and one oxygen atom.",
  ],
  [
    "What is the basic unit of electrical current?",
    "ampere",
    "The SI unit of current is the ampere.",
  ],
  [
    "What is the closest star to Earth?",
    "Sun",
    "The Sun is a star at the centre of our solar system.",
  ],
  [
    "How many degrees are in a right angle?",
    "90",
    "A right angle is one quarter of a full turn.",
  ],
  [
    "What is the process of liquid becoming gas?",
    "evaporation",
    "Evaporation occurs at the surface of a liquid.",
  ],
  [
    "What is the chemical symbol for oxygen?",
    "O",
    "O is the element oxygen; O2 is its common molecular form.",
  ],
  [
    "Which continent contains the Sahara?",
    "Africa",
    "The Sahara is in northern Africa.",
  ],
  [
    "What is the SI unit of force?",
    "newton",
    "Force is measured in newtons, symbol N.",
  ],
  [
    "How many bones are usually in an adult human body?",
    "206",
    "The conventional adult count is 206; individual variation exists.",
  ],
  [
    "Which instrument measures temperature?",
    "thermometer",
    "A thermometer measures temperature.",
  ],
  [
    "What is the hardest natural mineral on the Mohs scale?",
    "diamond",
    "Diamond is rated 10 on the Mohs hardness scale.",
  ],
];
FACTS.forEach((fact, i) => fact.push(FACT_SOURCES[i]));

export const EVENTS: [string, number][] = [
  ["Gutenberg’s 42-line Bible completion (approximate year)", 1455],
  ["Newcomen’s atmospheric steam engine", 1712],
  ["First successful powered Wright flight", 1903],
  ["First artificial satellite Sputnik 1", 1957],
  ["First human spaceflight, Yuri Gagarin", 1961],
  ["Apollo 11 Moon landing", 1969],
  ["First World Wide Web proposal at CERN", 1989],
  ["First public World Wide Web website", 1991],
  ["Launch of the Hubble Space Telescope", 1990],
  ["First successful Mars rover Sojourner", 1997],
  ["First crewed International Space Station expedition", 2000],
  ["Launch of the James Webb Space Telescope", 2021],
];
export const LADDERS = [
  ["cat", "cot", "cog", "dog"],
  ["cold", "cord", "card", "ward", "warm"],
  ["head", "heal", "teal", "tell", "tall", "tail"],
  ["hit", "hot", "dot", "dog"],
  ["pin", "pan", "pat", "cat"],
  ["book", "boot", "soot", "shot", "shop"],
];
export const LADDER_BANK = [...new Set(LADDERS.flat())];
const words = ALL_WORDS.filter((w) => w.length >= 3 && w.length <= 8);
const norm = (x: string) => x.toLowerCase().trim().replace(/\s+/g, " ");
const names = ["Ada", "Ben", "Cy", "Dee", "Eli", "Fay"];
const objects = ["key", "book", "bell", "coin", "map", "cup", "ring", "hat"];
const places = [
  "oak box",
  "desk drawer",
  "blue bag",
  "stone shelf",
  "small chest",
  "tall jar",
  "red basket",
  "side table",
];
export function makePuzzle(
  game: string,
  level: number,
  rng: Random,
  options: Bag = {},
): PackState {
  const s = base(game, level, 1, options),
    d = s.data,
    L = s.level;
  switch (game) {
    case "thought-number": {
      d.range = Math.min(1023, 20 + Math.floor((L - 1) / 2) * 4);
      const bits = Math.ceil(Math.log2(d.range + 1));
      d.order = shuffle(
        rng,
        Array.from({ length: bits }, (_, i) => i),
      );
      d.groups = d.order.map((bit: number) =>
        shuffle(
          rng,
          Array.from({ length: d.range }, (_, i) => i + 1).filter(
            (n) => (n & (1 << bit)) !== 0,
          ),
        ),
      );
      d.cursor = 0;
      d.total = 0;
      break;
    }
    case "order-garden": {
      d.alphabet = options.garden !== "numbers";
      d.targets = Array.from(
        { length: d.alphabet ? 26 : Math.min(60, 8 + L * 2) },
        (_, i) => (d.alphabet ? String.fromCharCode(65 + i) : String(i + 1)),
      );
      d.tiles = shuffle(rng, d.targets);
      d.cursor = 0;
      break;
    }
    case "corrupted-file": {
      d.original = Array.from(
        { length: Math.min(9, 4 + Math.floor(L / 3)) },
        (_, i) =>
          `${["TRAIN", "GATE", "LOCK", "SHELF", "FILE", "ROOM", "DESK", "BOX", "PATH"][i]}: ${10 + int(rng, 90)}`,
      );
      d.answer = int(rng, d.original.length);
      d.display = [...d.original];
      const value = d.original[d.answer].split(": ")[1];
      d.display[d.answer] =
        d.original[d.answer].split(": ")[0] +
        ": " +
        String(Number(value) + 1 + int(rng, 9));
      s.phase = "observe";
      break;
    }
    case "fact-chain": {
      d.facts = shuffle(rng, FACTS).slice(
        0,
        Math.min(6, 3 + Math.floor(L / 4)),
      );
      d.questions = shuffle(
        rng,
        d.facts.map((_: unknown, i: number) => i),
      );
      d.cursor = 0;
      s.phase = "observe";
      break;
    }
    case "future-message": {
      d.values = Array.from(
        { length: Math.min(8, 3 + Math.floor(L / 3)) },
        () => 10 + int(rng, 90),
      );
      d.answerIndex = int(rng, d.values.length);
      d.distractions = Array.from({ length: 2 }, () => [
        2 + int(rng, 8),
        2 + int(rng, 8),
      ]);
      d.cursor = 0;
      d.reminder = "";
      s.phase = "observe";
      break;
    }
    case "timeline-tangle": {
      d.events = shuffle(rng, EVENTS).slice(
        0,
        Math.min(8, 3 + Math.floor(L / 2)),
      );
      d.selection = [];
      break;
    }
    case "rule-shift": {
      d.rule = int(rng, 5);
      const accept = (n: number) => ruleAccept(d.rule, n);
      const nums = shuffle(
        rng,
        Array.from({ length: 60 }, (_, i) => i + 1),
      );
      d.accept = nums.filter(accept).slice(0, 5);
      d.reject = nums.filter((n) => !accept(n)).slice(0, 5);
      for (let other = 0; other < 5; other++) {
        if (other === d.rule) continue;
        const agrees = (n: number) => ruleAccept(other, n) === accept(n);
        if (d.accept.every(agrees) && d.reject.every(agrees)) {
          const witness = nums.find((n) => !agrees(n))!;
          const group = accept(witness) ? d.accept : d.reject;
          if (!group.includes(witness)) group.push(witness);
        }
      }
      d.tests = shuffle(rng, nums).slice(0, 8);
      d.cursor = 0;
      break;
    }
    case "word-ladder": {
      d.path = [...pick(rng, LADDERS)];
      if (int(rng, 2)) d.path.reverse();
      d.history = [d.path[0]];
      d.target = d.path.at(-1);
      d.bank = LADDER_BANK.filter((w) => w.length === d.target.length);
      break;
    }
    case "word-search": {
      d.word = pick(
        rng,
        words.filter((w) => w.length <= Math.min(7, 4 + Math.floor(L / 3))),
      ).toUpperCase();
      d.n = Math.max(6, d.word.length + 1);
      d.grid = Array.from({ length: d.n * d.n }, () =>
        String.fromCharCode(65 + int(rng, 26)),
      );
      const horizontal = !!int(rng, 2),
        reverse = !!int(rng, 2),
        a = int(rng, d.n),
        b = int(rng, d.n - d.word.length + 1);
      d.word.split("").forEach((c: string, i: number) => {
        const j = reverse ? d.word.length - 1 - i : i;
        d.grid[horizontal ? a * d.n + b + j : (b + j) * d.n + a] = c;
      });
      d.selection = [];
      break;
    }
    case "hangman": {
      d.word = pick(
        rng,
        words.filter((w) => w.length <= Math.min(8, 4 + Math.floor(L / 3))),
      );
      d.guessed = [];
      s.lives = 6;
      break;
    }
    case "anagram-forge": {
      const racks = [
        "stream",
        "planet",
        "master",
        "listen",
        "stone",
        "triangle",
        "reactor",
      ];
      const rack = pick(rng, racks);
      const candidates = words.filter((w) => canBuild(w, rack));
      d.rack = shuffle(rng, rack.split("")).join("");
      d.valid = [...new Set([...candidates, rack])];
      d.goal = Math.min(d.valid.length, 2 + Math.floor(L / 3));
      d.found = [];
      break;
    }
    case "category-sort": {
      const groups: Record<string, string[]> = {
        mammal: ["whale", "tiger", "bat", "dolphin", "elephant"],
        bird: ["sparrow", "penguin", "ostrich", "eagle", "owl"],
        insect: ["ant", "beetle", "butterfly", "bee", "mosquito"],
      };
      d.categories = Object.keys(groups);
      d.items = shuffle(
        rng,
        Object.entries(groups).flatMap(([category, items]) =>
          items.map((word) => ({ word, category })),
        ),
      ).slice(0, Math.min(12, 5 + Math.floor(L / 3)));
      d.cursor = 0;
      break;
    }
    case "sentence-order": {
      const sentences = [
        "The small bird built a nest",
        "A curious child opened the box",
        "Our friends planted trees near school",
        "The bright moon lit the quiet road",
        "A gentle breeze moved the leaves",
        "The careful baker measured the flour",
        "We solved the puzzle before lunch",
        "The old clock chimed at noon",
      ];
      d.sentence = pick(rng, sentences);
      d.tiles = shuffle(rng, d.sentence.split(" "));
      d.selection = [];
      break;
    }
    case "cipher-lab": {
      d.plain = pick(rng, [
        "KEEP YOUR MIND OPEN",
        "PRACTICE MAKES PROGRESS",
        "READ THINK AND TRY",
        "SMALL STEPS MATTER",
        "FRIENDS LEARN TOGETHER",
        "LOOK BEFORE YOU LEAP",
      ]);
      d.shift = 1 + int(rng, 25);
      d.cipher = d.plain.replace(/[A-Z]/g, (c: string) =>
        String.fromCharCode(((c.charCodeAt(0) - 65 + d.shift) % 26) + 65),
      );
      break;
    }
    case "binary-bridge": {
      d.bits = Math.min(10, 4 + Math.floor(L / 3));
      d.target = 1 + int(rng, 2 ** d.bits - 1);
      d.values = Array(d.bits).fill(0);
      break;
    }
    case "fraction-balance": {
      d.pairs = Array.from({ length: 5 }, () => [
        1 + int(rng, 20),
        2 + int(rng, 24),
        1 + int(rng, 20),
        2 + int(rng, 24),
      ]);
      d.cursor = 0;
      break;
    }
    case "make-target": {
      d.initial = Array.from({ length: 4 }, (_, i) => ({
        id: i,
        value: 1 + int(rng, 9),
      }));
      let a = clone(d.initial) as { id: number; value: number }[];
      d.recipe = [];
      let serial = 4;
      while (a.length > 1) {
        const first = int(rng, a.length),
          second = (first + 1 + int(rng, a.length - 1)) % a.length,
          op = pick(rng, ["+", "-", "*"]);
        const value = calculate(a[first].value, a[second].value, op);
        d.recipe.push({ first: a[first].id, second: a[second].id, op });
        a = a.filter((_, i) => i !== first && i !== second);
        a.push({ id: serial++, value });
      }
      d.target = a[0].value;
      d.values = clone(d.initial);
      d.history = [];
      d.serial = 4;
      break;
    }
    case "nonogram": {
      d.n = 5;
      d.solution = Array.from({ length: 25 }, () => int(rng, 2));
      d.rows = Array.from({ length: 5 }, (_, r) =>
        runs(d.solution.slice(r * 5, r * 5 + 5)),
      );
      d.cols = Array.from({ length: 5 }, (_, c) =>
        runs(Array.from({ length: 5 }, (_, r) => d.solution[r * 5 + c])),
      );
      d.values = Array(25).fill(0);
      break;
    }
    case "mini-sudoku": {
      const symbols = shuffle(rng, [1, 2, 3, 4]),
        baseGrid = [0, 1, 2, 3, 2, 3, 0, 1, 1, 2, 3, 0, 3, 0, 1, 2];
      d.solution = baseGrid.map((i) => symbols[i]);
      d.given = shuffle(
        rng,
        Array.from({ length: 16 }, (_, i) => i),
      ).slice(0, Math.max(4, 9 - Math.floor(L / 3)));
      d.values = d.solution.map((v: number, i: number) =>
        d.given.includes(i) ? v : 0,
      );
      break;
    }
    case "cross-sums": {
      const digit = shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
      d.solution = digit;
      d.rows = Array.from({ length: 3 }, (_, r) =>
        sum(digit.slice(r * 3, r * 3 + 3)),
      );
      d.cols = Array.from({ length: 3 }, (_, c) =>
        sum([digit[c], digit[c + 3], digit[c + 6]]),
      );
      d.given = shuffle(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 2);
      d.values = digit.map((v, i) => (d.given.includes(i) ? v : 0));
      break;
    }
    case "river-crossing": {
      const chain = pick(rng, [["fox", "hen", "grain"], ["wolf", "goat", "cabbage"], ["cat", "mouse", "cheese"]]);
      d.names = shuffle(rng, chain);
      d.conflicts = [[chain[0], chain[1]], [chain[1], chain[2]]];
      d.bank = [0, 0, 0];
      d.keeper = 0;
      d.start = 0;
      break;
    }
    case "water-jugs": {
      d.caps = pick(rng, [
        [3, 5],
        [4, 7],
        [5, 8],
        [7, 9],
        [4, 9],
      ]);
      d.target = 1 + int(rng, Math.max(...d.caps) - 1);
      d.values = [0, 0];
      break;
    }
    case "tower-hanoi": {
      d.n = Math.min(6, 3 + Math.floor((L - 1) / 3));
      d.rods = [Array.from({ length: d.n }, (_, i) => d.n - i), [], []];
      d.target = 1 + int(rng, 2);
      d.moves = 0;
      break;
    }
    case "circuit-route": {
      d.n = Math.min(6, 4 + Math.floor(L / 5));
      d.tiles = Array.from({ length: d.n * d.n }, () =>
        pick(rng, [3, 6, 12, 9, 5, 10]),
      );
      for (let c = 0; c < d.n; c++) d.tiles[c] = c === d.n - 1 ? 12 : 10;
      for (let r = 1; r < d.n; r++) d.tiles[r * d.n + d.n - 1] = 5;
      d.solution = [...d.tiles];
      d.tiles = d.tiles.map((v: number) => rotateBits(v, int(rng, 4)));
      if (pipeSolved(d)) d.tiles[0] = rotateBits(d.tiles[0], 1);
      break;
    }
    case "laser-mirrors": {
      d.n = 5;
      d.entry = int(rng, 5);
      d.exit = (d.entry + 1 + int(rng, 4)) % 5;
      const col = 1 + int(rng, 3);
      d.mirrors = [
        { r: d.entry, c: col, char: pick(rng, ["/", "\\"]) },
        { r: d.exit, c: col, char: pick(rng, ["/", "\\"]) },
      ];
      if (laserSolved(d))
        d.mirrors[0].char = d.mirrors[0].char === "/" ? "\\" : "/";
      break;
    }
    case "balance-scale": {
      d.n = 3 ** Math.min(3, 1 + Math.floor((L - 1) / 3));
      d.heavy = int(rng, d.n);
      d.sides = Array(d.n).fill(0);
      d.weighs = 0;
      d.limit = Math.round(Math.log(d.n) / Math.log(3));
      d.result = "No weighing yet.";
      break;
    }
    case "peg-solitaire": {
      d.n = 5;
      d.holes = Array.from(
        { length: 25 },
        (_, i) =>
          Math.floor(i / 5) === 2 ||
          i % 5 === 2 ||
          [6, 7, 8, 11, 13, 16, 17, 18].includes(i),
      );
      d.values = Array(25).fill(0);
      d.values[12] = 1;
      d.solution = [];
      for (let t = 0; t < Math.min(18, 4 + L); t++) {
        const choices: { from: number; to: number; mid: number }[] = [];
        for (let i = 0; i < 25; i++)
          if (d.values[i])
            for (const delta of [-10, 10, -2, 2]) {
              const to = i + delta,
                mid = i + delta / 2;
              if (
                to >= 0 &&
                to < 25 &&
                d.holes[to] &&
                d.holes[mid] &&
                !d.values[to] &&
                !d.values[mid] &&
                (Math.abs(delta) === 10 ||
                  Math.floor(i / 5) === Math.floor(to / 5))
              )
                choices.push({ from: i, to, mid });
            }
        if (!choices.length) break;
        const move = pick(rng, choices);
        d.values[move.from] = 0;
        d.values[move.to] = d.values[move.mid] = 1;
        d.solution.unshift({ from: move.to, to: move.from });
      }
      break;
    }
    case "knapsack-vault": {
      d.items = Array.from(
        { length: Math.min(10, 5 + Math.floor(L / 2)) },
        (_, i) => ({
          name: `cargo ${i + 1}`,
          weight: 1 + int(rng, 9),
          value: 2 + int(rng, 25),
        }),
      );
      d.capacity = 10 + int(rng, 16);
      const dp = Array(d.capacity + 1).fill(0);
      for (const item of d.items)
        for (let c = d.capacity; c >= item.weight; c--)
          dp[c] = Math.max(dp[c], dp[c - item.weight] + item.value);
      d.target = dp[d.capacity];
      d.selected = [];
      break;
    }
    case "path-sum": {
      d.n = Math.min(6, 3 + Math.floor(L / 4));
      d.grid = Array.from({ length: d.n * d.n }, () => 1 + int(rng, 9));
      let at = 0;
      d.solution = [0];
      while (at < d.n * d.n - 1) {
        const r = Math.floor(at / d.n),
          c = at % d.n;
        at += r === d.n - 1 ? 1 : c === d.n - 1 ? d.n : int(rng, 2) ? 1 : d.n;
        d.solution.push(at);
      }
      d.target = sum(d.solution.map((i: number) => d.grid[i]));
      d.path = [0];
      break;
    }
    case "n-back": {
      d.n = Math.min(3, 1 + Math.floor((L - 1) / 4));
      d.stream = Array.from({ length: d.n + 8 }, () =>
        pick(rng, ["A", "B", "C", "D"]),
      );
      d.cursor = 0;
      d.correct = 0;
      s.phase = "observe";
      break;
    }
    case "story-recall": {
      const ns = shuffle(rng, names).slice(
          0,
          Math.min(5, 3 + Math.floor(L / 5)),
        ),
        obs = shuffle(rng, objects),
        ps = shuffle(rng, places);
      d.entries = ns.map((name, i) => ({ name, object: obs[i], place: ps[i] }));
      d.questions = shuffle(
        rng,
        ns.map((_, i) => i),
      ).slice(0, 3);
      d.cursor = 0;
      s.phase = "observe";
      break;
    }
    case "mental-rotation": {
      d.shape = pick(rng, [
        [
          [0, 0],
          [1, 0],
          [2, 0],
          [2, 1],
        ],
        [
          [0, 0],
          [0, 1],
          [1, 1],
          [2, 1],
          [2, 2],
          [1, 2],
        ],
      ]);
      d.rotations = shuffle(rng, [0, 1, 2, 3]);
      d.angle = 1 + int(rng, 3);
      break;
    }
    case "focus-switch": {
      d.trials = Array.from({ length: 5 }, () => {
        const cue = pick(rng, ["#", "@"]);
        const values =
          cue === "#"
            ? shuffle(rng, [
                2 + int(rng, 9),
                20 + int(rng, 9),
                40 + int(rng, 9),
                70 + int(rng, 9),
              ]).map(String)
            : shuffle(rng, ["ant", "bird", "stone", "planet"]);
        return { cue, values };
      });
      d.cursor = 0;
      break;
    }
    case "logic-grid": {
      d.n = Math.min(4, 3 + Math.floor(L / 6));
      d.names = names.slice(0, d.n);
      d.objects = shuffle(rng, objects).slice(0, d.n);
      d.solution = shuffle(
        rng,
        Array.from({ length: d.n }, (_, i) => i),
      );
      d.clues = [];
      let possibilities = permutations(
        Array.from({ length: d.n }, (_, i) => i),
      );
      const candidates = shuffle<{ person: number; item: number }>(
        rng,
        d.solution.flatMap((own: number, i: number) =>
          Array.from({ length: d.n }, (_, j) => ({
            person: i,
            item: j,
          })).filter((c) => c.item !== own),
        ),
      );
      for (const clue of candidates) {
        if (possibilities.length <= 1) break;
        d.clues.push(clue);
        possibilities = possibilities.filter(
          (p) => p[clue.person] !== clue.item,
        );
      }
      d.values = Array(d.n).fill(-1);
      break;
    }
    case "probability-pick": {
      d.bags = Array.from({ length: 3 }, () => ({
        red: 2 + int(rng, 7),
        blue: 1 + int(rng, 7),
      }));
      break;
    }
    default:
      throw new Error("Unknown puzzle.");
  }
  return s;
}
export function ruleAccept(rule: number, n: number) {
  return [
    () => n % 2 === 0,
    () => n % 3 === 0,
    () => n >= 30,
    () => String(n).includes("2"),
    () => [1, 4, 9, 16, 25, 36, 49].includes(n),
  ][rule]();
}
export function canBuild(word: string, rack: string) {
  const a = rack.split("");
  for (const c of word) {
    const i = a.indexOf(c);
    if (i < 0) return false;
    a.splice(i, 1);
  }
  return true;
}
export function calculate(a: number, b: number, op: string) {
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "*") return a * b;
  check(
    op === "/" && b !== 0 && a % b === 0,
    "Division must produce a whole number.",
  );
  return a / b;
}
export function rotateBits(v: number, n = 1) {
  for (let i = 0; i < n; i++) v = ((v << 1) & 15) | (v >> 3);
  return v;
}
export function pipeSolved(d: Bag) {
  let at = 0,
    entry = 8;
  const seen = new Set<string>();
  for (let t = 0; t < d.n * d.n * 4; t++) {
    const key = at + ":" + entry;
    if (seen.has(key)) return false;
    seen.add(key);
    const tile = d.tiles[at];
    if (!(tile & entry)) return false;
    const exits = [1, 2, 4, 8].filter((x) => tile & x && x !== entry);
    if (exits.length !== 1) return false;
    const exit = exits[0],
      r = Math.floor(at / d.n),
      c = at % d.n;
    if (r === d.n - 1 && c === d.n - 1 && exit === 4) return true;
    if (exit === 1) {
      if (!r) return false;
      at -= d.n;
      entry = 4;
    } else if (exit === 2) {
      if (c === d.n - 1) return false;
      at++;
      entry = 8;
    } else if (exit === 4) {
      if (r === d.n - 1) return false;
      at += d.n;
      entry = 1;
    } else {
      if (!c) return false;
      at--;
      entry = 2;
    }
  }
  return false;
}
export function laserSolved(d: Bag) {
  let r = d.entry,
    c = -1,
    dr = 0,
    dc = 1;
  const visited = new Set<string>();
  for (let t = 0; t < d.n * d.n * 4; t++) {
    r += dr;
    c += dc;
    if (c === d.n) return r === d.exit;
    if (r < 0 || r >= d.n || c < 0) return false;
    const key = [r, c, dr, dc].join();
    if (visited.has(key)) return false;
    visited.add(key);
    const m = d.mirrors.find((m: Bag) => m.r === r && m.c === c);
    if (m) {
      if (m.char === "/") [dr, dc] = [-dc, -dr];
      else [dr, dc] = [dc, dr];
    }
  }
  return false;
}
export function rotatedShape(shape: number[][], turns: number) {
  let a = shape.map((p) => [...p]);
  for (let i = 0; i < turns; i++) a = a.map(([r, c]) => [c, -r]);
  const mr = Math.min(...a.map((p) => p[0])),
    mc = Math.min(...a.map((p) => p[1]));
  return a.map(([r, c]) => [r - mr, c - mc]);
}
function quiz(
  s: PackState,
  correct: boolean,
  count: number,
  explanation = "Correct.",
) {
  if (!correct) {
    fail(s);
    return;
  }
  s.message = explanation;
  s.data.cursor++;
  if (s.data.cursor >= count) win(s, 0, explanation + " Level complete.");
}
export function puzzleCommand(s: PackState, c: Command) {
  const d = s.data,
    t = c.type;
  if (t === "ready" && s.phase === "observe") {
    if (s.game === "future-message") d.reminder = text(c.answer ?? "", 12);
    if (s.game === "n-back") {
      d.cursor++;
      if (d.cursor < d.n) return;
    }
    s.phase = "play";
    return;
  }
  check(s.phase === "play", "This round is not accepting moves.");
  switch (s.game) {
    case "thought-number": {
      check(t === "answer" && typeof c.yes === "boolean", "Choose yes or no.");
      if (c.yes) d.total += 1 << d.order[d.cursor];
      d.cursor++;
      if (d.cursor === d.groups.length) {
        if (d.total < 1 || d.total > d.range) {
          s.phase = "lost";
          s.message =
            "Those answers do not match any number in this range. Try again with one fixed number.";
        } else win(s, 0, `Your number is ${d.total}.`);
      }
      break;
    }
    case "order-garden": {
      check(t === "choose", "Choose the next tile.");
      const i = index(c.index, d.tiles.length);
      if (d.tiles[i] !== d.targets[d.cursor]) {
        s.message = `Try ${d.targets[d.cursor]} next. No life lost.`;
        return;
      }
      d.cursor++;
      s.message = "";
      if (d.cursor === d.targets.length) win(s);
      break;
    }
    case "corrupted-file": {
      check(t === "choose", "Choose a line.");
      if (index(c.index, d.display.length) === d.answer) win(s);
      else fail(s);
      break;
    }
    case "fact-chain": {
      check(t === "answer", "Choose an answer.");
      const q = d.facts[d.questions[d.cursor]];
      quiz(s, norm(text(c.answer)) === norm(q[1]), d.questions.length, q[2]);
      break;
    }
    case "future-message": {
      check(t === "answer", "Enter an answer.");
      const answer = text(c.answer);
      if (d.cursor < 2)
        quiz(
          s,
          Number(answer) === sum(d.distractions[d.cursor]) && answer !== "",
          3,
          "Distraction complete.",
        );
      else if (answer === String(d.values[d.answerIndex])) win(s);
      else fail(s);
      break;
    }
    case "timeline-tangle": {
      if (t === "choose") {
        const i = index(c.index, d.events.length);
        check(!d.selection.includes(i), "Already selected.");
        d.selection.push(i);
      } else if (t === "reset") d.selection = [];
      else {
        check(t === "check", "Choose an event or check.");
        check(d.selection.length === d.events.length, "Select every event.");
        const dates = d.selection.map((i: number) => d.events[i][1]);
        if (dates.every((v: number, i: number) => !i || v >= dates[i - 1]))
          win(s);
        else fail(s, "That order is not chronological. Reset and try again.");
      }
      break;
    }
    case "rule-shift": {
      check(t === "answer" && typeof c.yes === "boolean", "Choose yes or no.");
      quiz(s, c.yes === ruleAccept(d.rule, d.tests[d.cursor]), 5);
      break;
    }
    case "word-ladder": {
      check(t === "answer", "Enter a word.");
      const word = norm(text(c.answer, 16)),
        last = d.history.at(-1);
      check(d.bank.includes(word), "Use a word in this puzzle’s bank.");
      check(
        [...word].filter((ch, i) => ch !== last[i]).length === 1,
        "Change exactly one letter.",
      );
      check(!d.history.includes(word), "You already used that word.");
      d.history.push(word);
      if (word === d.target) win(s);
      else if (d.history.length > 20) {
        s.phase = "lost";
        s.message = "Move limit reached.";
      }
      break;
    }
    case "word-search": {
      if (t === "reset") d.selection = [];
      else if (t === "choose") {
        const i = index(c.index, d.grid.length);
        check(!d.selection.includes(i), "Already selected.");
        if (d.selection.length) {
          const previous = d.selection.at(-1),
            dr = Math.floor(i / d.n) - Math.floor(previous / d.n),
            dc = (i % d.n) - (previous % d.n);
          check(
            Math.max(Math.abs(dr), Math.abs(dc)) === 1,
            "Trace adjacent letters.",
          );
          if (d.selection.length > 1) {
            const first = d.selection[0],
              second = d.selection[1];
            check(
              dr === Math.floor(second / d.n) - Math.floor(first / d.n) &&
                dc === (second % d.n) - (first % d.n),
              "Keep one straight direction.",
            );
          }
        }
        d.selection.push(i);
        if (d.selection.length === d.word.length) {
          if (d.selection.map((i: number) => d.grid[i]).join("") === d.word)
            win(s);
          else {
            s.message = "That spells a different word. Clear to try again.";
          }
        }
      } else throw new Error("Choose letters or clear.");
      break;
    }
    case "hangman": {
      check(t === "answer", "Choose a letter.");
      const letter = norm(text(c.answer, 1));
      check(/^[a-z]$/.test(letter), "Choose one letter.");
      check(!d.guessed.includes(letter), "Already tried.");
      d.guessed.push(letter);
      if (!d.word.includes(letter)) fail(s, "That letter is absent.");
      if ([...d.word].every((ch) => d.guessed.includes(ch))) win(s);
      break;
    }
    case "anagram-forge": {
      check(t === "answer", "Enter a word.");
      const word = norm(text(c.answer, 16));
      check(
        d.valid.includes(word) && canBuild(word, d.rack),
        "Use a word from the rack’s accepted bank.",
      );
      check(!d.found.includes(word), "Already found.");
      d.found.push(word);
      if (d.found.length >= d.goal) win(s);
      break;
    }
    case "category-sort": {
      check(t === "answer", "Choose a category.");
      const item = d.items[d.cursor];
      quiz(
        s,
        text(c.answer) === item.category,
        d.items.length,
        `${item.word}: ${item.category}.`,
      );
      break;
    }
    case "sentence-order": {
      if (t === "reset") d.selection = [];
      else if (t === "choose") {
        const i = index(c.index, d.tiles.length);
        check(!d.selection.includes(i), "Already selected.");
        d.selection.push(i);
      } else {
        check(t === "check", "Choose tiles or check.");
        if (d.selection.map((i: number) => d.tiles[i]).join(" ") === d.sentence)
          win(s);
        else fail(s);
      }
      break;
    }
    case "cipher-lab": {
      check(t === "answer", "Enter the decoded sentence.");
      if (norm(text(c.answer)) === norm(d.plain)) win(s);
      else fail(s);
      break;
    }
    case "binary-bridge": {
      if (t === "choose") {
        const i = index(c.index, d.bits);
        d.values[i] = 1 - d.values[i];
      } else {
        check(t === "check", "Toggle bits or check.");
        if (
          sum(
            d.values.map((v: number, i: number) => v * 2 ** (d.bits - 1 - i)),
          ) === d.target
        )
          win(s);
        else fail(s);
      }
      break;
    }
    case "fraction-balance": {
      check(t === "answer", "Choose a comparison.");
      const [a, b, c1, e] = d.pairs[d.cursor],
        correct =
          a * e === c1 * b
            ? "equal"
            : a * e < c1 * b
              ? "left smaller"
              : "left larger";
      quiz(
        s,
        text(c.answer) === correct,
        5,
        `${a}/${b} is ${correct.replace("left ", "")} than/to ${c1}/${e}.`,
      );
      break;
    }
    case "make-target": {
      if (t === "reset") {
        d.values = clone(d.initial);
        d.history = [];
        d.serial = 4;
      } else if (t === "undo") {
        check(d.history.length, "No move to undo.");
        const prev = d.history.pop();
        d.values = prev.values;
        d.serial = prev.serial;
      } else {
        check(t === "combine", "Choose two tiles and an operation.");
        const a = index(c.first, d.values.length),
          b = index(c.second, d.values.length);
        check(a !== b, "Choose two different tiles.");
        const op = text(c.op, 1),
          value = calculate(d.values[a].value, d.values[b].value, op);
        check(
          Number.isSafeInteger(value) && Math.abs(value) <= 1000000,
          "Result is too large.",
        );
        d.history.push({ values: clone(d.values), serial: d.serial });
        d.values = d.values.filter(
          (_: unknown, i: number) => i !== a && i !== b,
        );
        d.values.push({ id: d.serial++, value });
        if (d.values.length === 1) {
          if (value === d.target) win(s);
          else s.message = "Different total. Undo or reset the same puzzle.";
        }
      }
      break;
    }
    case "nonogram": {
      if (t === "choose") {
        const i = index(c.index, d.values.length);
        d.values[i] = d.values[i] === 0 ? 1 : d.values[i] === 1 ? -1 : 0;
      } else {
        check(t === "check", "Fill cells or check.");
        const n = d.n,
          ok =
            d.rows.every((r: number[], i: number) =>
              compare(r, runs(d.values.slice(i * n, i * n + n))),
            ) &&
            d.cols.every((r: number[], c: number) =>
              compare(
                r,
                runs(Array.from({ length: n }, (_, i) => d.values[i * n + c])),
              ),
            );
        if (ok) win(s);
        else fail(s, "The filled runs do not match all clues.");
      }
      break;
    }
    case "mini-sudoku":
    case "cross-sums": {
      if (t === "choose" || t === "set") {
        const i = index(c.index, d.values.length);
        check(!d.given.includes(i), "That cell is fixed.");
        const max = s.game === "mini-sudoku" ? 4 : 9;
        d.values[i] =
          t === "set" ? index(c.value, max + 1) : (d.values[i] + 1) % (max + 1);
      } else {
        check(t === "check", "Fill cells or check.");
        const n = s.game === "mini-sudoku" ? 4 : 3;
        let ok = d.values.every((v: number) => v > 0);
        for (let i = 0; i < n; i++) {
          const row = d.values.slice(i * n, i * n + n),
            col = Array.from({ length: n }, (_, r) => d.values[r * n + i]);
          ok = ok && new Set(row).size === n && new Set(col).size === n;
          if (s.game === "cross-sums")
            ok = ok && sum(row) === d.rows[i] && sum(col) === d.cols[i];
        }
        if (n === 4)
          for (const r of [0, 2])
            for (const c1 of [0, 2])
              ok =
                ok &&
                new Set([
                  d.values[r * 4 + c1],
                  d.values[r * 4 + c1 + 1],
                  d.values[(r + 1) * 4 + c1],
                  d.values[(r + 1) * 4 + c1 + 1],
                ]).size === 4;
        if (ok) win(s);
        else fail(s, "Some constraints are not satisfied yet.");
      }
      break;
    }
    case "river-crossing": {
      check(t === "cross", "Choose what to ferry.");
      const i = c.index === -1 ? -1 : index(c.index, 3);
      check(
        i === -1 || d.bank[i] === d.keeper,
        "That item is on the other bank.",
      );
      const next = 1 - d.keeper,
        bank = [...d.bank];
      if (i !== -1) bank[i] = next;
      const unsafe = d.conflicts.some(([a, b]: string[]) => {
        const x = d.names.indexOf(a),
          y = d.names.indexOf(b);
        return bank[x] === bank[y] && bank[x] !== next;
      });
      check(!unsafe, "That would leave a forbidden pair unattended.");
      d.bank = bank;
      d.keeper = next;
      if (bank.every((v: number) => v === 1)) win(s);
      break;
    }
    case "water-jugs": {
      const i = index(c.index, 2),
        j = 1 - i;
      if (t === "fill") d.values[i] = d.caps[i];
      else if (t === "empty") d.values[i] = 0;
      else {
        check(t === "pour", "Choose fill, empty or pour.");
        const amount = Math.min(d.values[i], d.caps[j] - d.values[j]);
        d.values[i] -= amount;
        d.values[j] += amount;
      }
      if (d.values.includes(d.target)) win(s);
      break;
    }
    case "tower-hanoi": {
      check(t === "move", "Choose a source and destination.");
      const a = index(c.from, 3),
        b = index(c.to, 3);
      check(
        a !== b && d.rods[a].length,
        "Choose a non-empty source and different destination.",
      );
      const disk = d.rods[a].at(-1);
      check(
        !d.rods[b].length || d.rods[b].at(-1) > disk,
        "A larger disk cannot sit on a smaller one.",
      );
      d.rods[a].pop();
      d.rods[b].push(disk);
      d.moves++;
      if (d.rods[d.target].length === d.n) win(s);
      break;
    }
    case "circuit-route": {
      if (t === "choose") {
        const i = index(c.index, d.tiles.length);
        d.tiles[i] = rotateBits(d.tiles[i]);
      } else {
        check(t === "check", "Rotate tiles or check.");
        if (pipeSolved(d)) win(s);
        else fail(s, "The route does not connect the two ports.");
      }
      break;
    }
    case "laser-mirrors": {
      if (t === "choose") {
        const i = index(c.index, d.mirrors.length);
        d.mirrors[i].char = d.mirrors[i].char === "/" ? "\\" : "/";
      } else {
        check(t === "check", "Turn mirrors or check.");
        if (laserSolved(d)) win(s);
        else fail(s, "The ray exits somewhere else or loops.");
      }
      break;
    }
    case "balance-scale": {
      if (t === "place") {
        const i = index(c.index, d.n);
        d.sides[i] = index(c.side, 3);
      } else if (t === "weigh") {
        check(d.weighs < d.limit, "No weighings left: accuse a coin.");
        const left = d.sides
            .map((v: number, i: number) => (v === 1 ? i : -1))
            .filter((i: number) => i >= 0),
          right = d.sides
            .map((v: number, i: number) => (v === 2 ? i : -1))
            .filter((i: number) => i >= 0);
        check(
          left.length && left.length === right.length,
          "Put equal non-zero counts on both pans.",
        );
        d.weighs++;
        d.result = left.includes(d.heavy)
          ? "LEFT is heavier"
          : right.includes(d.heavy)
            ? "RIGHT is heavier"
            : "BALANCED";
      } else {
        check(t === "accuse", "Place coins, weigh, or accuse.");
        if (index(c.index, d.n) === d.heavy) win(s);
        else {
          s.phase = "lost";
          s.message = `Coin ${d.heavy + 1} was heavier.`;
        }
      }
      break;
    }
    case "peg-solitaire": {
      check(t === "jump", "Choose a peg and empty destination.");
      const a = index(c.from, 25),
        b = index(c.to, 25),
        delta = b - a,
        mid = a + delta / 2;
      check(
        d.holes[a] &&
          d.holes[b] &&
          d.values[a] === 1 &&
          !d.values[b] &&
          ([-10, 10].includes(delta) ||
            ([-2, 2].includes(delta) &&
              Math.floor(a / 5) === Math.floor(b / 5))) &&
          d.values[mid] === 1,
        "Not a legal jump.",
      );
      d.values[a] = d.values[mid] = 0;
      d.values[b] = 1;
      if (sum(d.values) === 1) win(s);
      break;
    }
    case "knapsack-vault": {
      if (t === "choose") {
        const i = index(c.index, d.items.length);
        d.selected = d.selected.includes(i)
          ? d.selected.filter((x: number) => x !== i)
          : [...d.selected, i];
      } else if (t === "reset") d.selected = [];
      else {
        check(t === "check", "Choose cargo or check.");
        const weight = sum(d.selected.map((i: number) => d.items[i].weight)),
          value = sum(d.selected.map((i: number) => d.items[i].value));
        if (weight <= d.capacity && value >= d.target) win(s);
        else fail(s, "Check weight and value.");
      }
      break;
    }
    case "path-sum": {
      if (t === "reset") d.path = [0];
      else {
        check(t === "choose", "Choose an adjacent cell.");
        const i = index(c.index, d.grid.length),
          last = d.path.at(-1);
        check(
          (i === last + 1 && Math.floor(i / d.n) === Math.floor(last / d.n)) ||
            i === last + d.n,
          "Move only one step right or down.",
        );
        d.path.push(i);
        if (i === d.grid.length - 1) {
          if (sum(d.path.map((i: number) => d.grid[i])) === d.target) win(s);
          else
            s.message =
              "Wrong sum. Reset this same board and find another route.";
        }
      }
      break;
    }
    case "n-back": {
      check(
        t === "answer" && typeof c.yes === "boolean",
        "Choose same or different.",
      );
      const correct =
        c.yes === (d.stream[d.cursor] === d.stream[d.cursor - d.n]);
      if (correct) d.correct++;
      else s.lives--;
      d.cursor++;
      if (s.lives <= 0) {
        s.phase = "lost";
        s.message = "Three mismatches. Try a new stream.";
      } else if (d.cursor === d.stream.length) {
        if (d.correct >= 6) win(s);
        else {
          s.phase = "lost";
          s.message = "Need six correct comparisons.";
        }
      }
      break;
    }
    case "story-recall": {
      check(t === "answer", "Choose a place.");
      const q = d.entries[d.questions[d.cursor]];
      quiz(
        s,
        text(c.answer) === q.place,
        d.questions.length,
        `${q.name} put the ${q.object} in the ${q.place}.`,
      );
      break;
    }
    case "mental-rotation": {
      check(t === "choose", "Choose a rotated shape.");
      const shapeKey = (turns:number) => rotatedShape(d.shape,turns).map(p=>p.join(',')).sort().join(';');
      // Grade visible geometry, including any older saved symmetric puzzle.
      if (shapeKey(d.rotations[index(c.index, 4)]) === shapeKey(d.angle)) win(s);
      else fail(s);
      break;
    }
    case "focus-switch": {
      check(t === "choose", "Choose one item.");
      const trial = d.trials[d.cursor],
        value = trial.values[index(c.index, 4)],
        correct =
          trial.cue === "#"
            ? Number(value) === Math.max(...trial.values.map(Number))
            : value.length ===
              Math.min(...trial.values.map((v: string) => v.length));
      quiz(s, correct, 5);
      break;
    }
    case "logic-grid": {
      if (t === "assign") {
        d.values[index(c.index, d.n)] = index(c.value, d.n);
      } else {
        check(t === "check", "Assign objects or check.");
        if (
          d.values.every((v: number) => v >= 0) &&
          new Set(d.values).size === d.n &&
          d.clues.every((c: Bag) => d.values[c.person] !== c.item)
        )
          win(s);
        else fail(s, "The assignments violate a clue or repeat an object.");
      }
      break;
    }
    case "probability-pick": {
      check(t === "choose", "Choose a bag.");
      const i = index(c.index, 3),
        a = d.bags[i],
        num = a.red * (a.red - 1),
        den = (a.red + a.blue) * (a.red + a.blue - 1);
      const ok = d.bags.every(
        (b: Bag) =>
          num * (b.red + b.blue) * (b.red + b.blue - 1) >=
          b.red * (b.red - 1) * den,
      );
      if (ok)
        win(
          s,
          0,
          `Best probability: ${a.red}/${a.red + a.blue} × ${a.red - 1}/${a.red + a.blue - 1}.`,
        );
      else fail(s);
      break;
    }
    default:
      throw new Error("Unknown puzzle command.");
  }
}
