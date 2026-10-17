import { writeFileSync } from "node:fs";
import { GAMES, MODE_LABEL } from "../src/lib/games";
import { PACK_GAMES, packGame } from "../src/lib/pack/catalog";
let out =
  "# TTYARCADE — 70-game guide\n\n19 retained games + 51 new games. Alphabet/numbers are two modes of ONE children’s game; they are not counted separately. No real-money betting. Rules are hidden by default inside the app.\n\nGenerated from the registries with `npm run docs:games`.\n\n## Catalog\n\n| Game / route | Play modes | Maximum players | New? |\n|---|---|---:|---|\n";
for (const g of GAMES)
  out += `| ${g.name} · \`/games/${g.id}\` | ${g.modes.map((m) => MODE_LABEL[m]).join(", ")} | ${g.maxPlayers} | ${packGame(g.id) ? "yes" : "retained"} |\n`;
out +=
  "\n## Same-device play\n\nNew card/strategy games are live turn-based matches. New puzzles with same-device mode are round relays: each named player takes one fresh board at the same level before everyone moves up. They are not simultaneous shared-board races. A handoff curtain precedes each new player’s turn. Match totals stay in memory on that device. Reload/mode menu resets local matches. Higher or Lower, Guess My Thought and the children’s garden are solo-only.\n\n## Progression\n\nThere is no final numbered level. Sizes and workload are capped; after difficulty caps, puzzles keep regenerating within the cap. Standard cards/boards have fresh rematches, not infinitely growing boards. Curated words/facts/events are finite and may recur. Random patterns can repeat; no mathematical uniqueness or intelligence/medical benefit is promised.\n\n## All 51 new rule sets\n\n";
for (const g of PACK_GAMES)
  out += `### ${g.name}\n\n\`/games/${g.id}\` · ${g.category} · ${g.modes.map((m) => MODE_LABEL[m]).join(", ")}\n\n${g.rules}\n\n`;
out +=
  "## Learning references\n\nFact Chain includes reference links in its optional study sources. Its question/answer/explanation bank and links live in `src/lib/pack/puzzles.ts`. Timeline Tangle uses a small chronological bank, not a complete history. Web chronology reference: [2](https://home.cern/science/computing/the-birth-of-the-web/short-history-web/). Gutenberg Bible’s approximate completion year: [Britannica](https://www.britannica.com/topic/Gutenberg-Bible). Hubble overview: [NASA](https://science.nasa.gov/mission/hubble/overview/about-hubble/). Keep dates and sources reviewed when extending the bank; there is no live news feed.\n";
writeFileSync("GAMES.md", out);
console.log(
  `Wrote GAMES.md: ${GAMES.length} games, ${PACK_GAMES.length} new rule sets.`,
);
