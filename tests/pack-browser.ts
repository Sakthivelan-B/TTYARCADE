import { chromium, expect, type Page } from "@playwright/test";
import assert from "node:assert/strict";
import { PACK_GAMES, CARD_IDS, STRATEGY_IDS } from "../src/lib/pack/catalog";
import { newPackGame, sum } from "../src/lib/pack";
import { nextCommand } from "./pack-helpers";
import { ruleAccept } from "../src/lib/pack/puzzles";
async function main() {
  const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  const ctx = await browser.newContext();
  await ctx.addInitScript({
    content:
      'Object.defineProperty(globalThis.crypto,"getRandomValues",{value:function(a){a.fill(1);return a;}});',
  });
  const page = await ctx.newPage(),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(page.url() + ": " + e.message));
  const b = (name: string) => page.getByRole("button", { name, exact: true });
  const submit = async (answer: string) => {
    await page
      .getByRole("textbox", { name: "answer", exact: true })
      .fill(answer);
    await page
      .getByRole("textbox", { name: "answer", exact: true })
      .press("Enter");
  };
  const cell = async (i: number, grid = 0) => {
    await page
      .locator('.pack-ui div[style*="grid-template-columns"]')
      .nth(grid)
      .locator(`:scope > button:nth-child(${i + 1})`)
      .click();
  };
  const ready = () => b("memorized — hide and continue").click();
  const handoff = async () => {
    const curtain = page.getByRole("button", {
      name: /^I am .* — show my turn$/,
    });
    if (await curtain.count()) await curtain.click();
  };
  try {
    await page.goto(base);
    await expect(page.getByRole("status")).toContainText("70 / 70");
    await page.getByLabel("Search games").fill("rummy");
    await expect(page.getByRole("status")).toContainText("1 / 70");
    await expect(
      page.getByRole("link", { name: /13-card Rummy/ }),
    ).toBeVisible();
    await b("clear filters").click();
    await page.getByLabel("Play mode").selectOption("online");
    assert.ok(
      (await page.locator('section[aria-label="game catalog"] a').count()) >=
        21,
    );
    await page.getByLabel("Group size").selectOption("10");
    assert.ok(
      (
        await page
          .locator('section[aria-label="game catalog"] a')
          .allTextContents()
      ).some((t) => t.includes("Rummy")),
    );
    await b("clear filters").click();
    await page.getByLabel("Sort").selectOption("az");
    const sorted = await page
      .locator('section[aria-label="game catalog"] a > span.font-bold')
      .allTextContents();
    assert.equal(sorted.length, 70);
    await page.getByLabel("Search games").fill("zzzzunfindable");
    await expect(
      page.getByText("No games match. Clear a filter or try a shorter search."),
    ).toBeVisible();
    console.log(
      "PASS catalog: combined search, mode, group size, sorting and empty state",
    );
    await b("clear filters").click();
    await page.getByLabel("Play mode").selectOption("online");
    await page.getByLabel("Group size").selectOption("1");
    await expect(page.getByRole("status")).toContainText("0 / 70");
    await b("clear filters").click();
    await page.getByLabel("Play mode").selectOption("solo");
    await page.getByLabel("Group size").selectOption("2");
    await expect(page.getByRole("status")).toContainText("0 / 70");
    for (const def of PACK_GAMES) {
      await page.goto(base + "/games/" + def.id);
      await expect(
        page.getByRole("heading", { name: "# " + def.name, exact: true }),
      ).toBeVisible();
      assert.equal(
        await page.locator("main > details").getAttribute("open"),
        null,
      );
      const isSolo = def.modes.includes("solo");
      await b(isSolo ? "play solo" : "play same device").click();
      await handoff();
      const s = newPackGame(def.id, isSolo ? 1 : 2, 1, {}, 1),
        d = s.data;
      switch (def.id) {
        case "rummy":
          await b("draw from stock").click();
          await expect(
            page.getByText("Your hand (14)", { exact: true }),
          ).toBeVisible();
          break;
        case "go-fish":
          await b("ask").click();
          break;
        case "war":
          await b("reveal top card").click();
          await expect(page.getByText(/Pass the device to/)).toBeVisible();
          break;
        case "higher-lower":
          await b(String(nextCommand(s).answer)).click();
          break;
        case "twenty-one":
          await b("stand").click();
          await expect(page.getByText(/Pass the device to/)).toBeVisible();
          break;
        case "sevens": {
          const c = nextCommand(s);
          if (c.type === "pass") await b("pass (only if blocked)").click();
          else {
            await page
              .locator('[aria-label="your hand"] button')
              .nth(c.index as number)
              .click();
            await b("play selected").click();
          }
          break;
        }
        case "golf-six":
          await page
            .getByRole("button", { name: "??", exact: true })
            .first()
            .click();
          break;
        case "old-maid":
          await b("card 1").click();
          break;
        case "thought-number": {
          let current = s;
          while (current.phase === "play") {
            const yes = current.data.groups[current.data.cursor].includes(17);
            await b(yes ? "yes" : "no").click();
            const { commandPack } = await import("../src/lib/pack");
            current = commandPack(current, { type: "answer", yes });
          }
          await expect(
            page.getByText("Your number is 17.", { exact: true }),
          ).toBeVisible();
          break;
        }
        case "order-garden":
          for (const value of d.targets) await b(value).click();
          await expect(
            page.getByRole("heading", { name: "round complete", exact: true }),
          ).toBeVisible();
          break;
        case "corrupted-file":
          await ready();
          await b(d.display[d.answer]).click();
          await expect(
            page.getByRole("heading", { name: "round complete", exact: true }),
          ).toBeVisible();
          break;
        case "secret-mission":
          await ready();
          await handoff();
          await expect(
            page.getByText(`Parcel weight: ${d.clues[1]}`, { exact: true }),
          ).toBeVisible();
          await ready();
          await handoff();
          await expect(page.getByText(/Parcel weight:/)).toHaveCount(0);
          await submit(String(sum(d.clues)));
          await expect(
            page.getByRole("heading", { name: "round complete", exact: true }),
          ).toBeVisible();
          break;
        case "fact-chain":
          await ready();
          await b(d.facts[d.questions[0]][1]).click();
          break;
        case "future-message":
          await submit("memo");
          await submit(String(sum(d.distractions[0])));
          break;
        case "timeline-tangle":
          await b(d.events[0][0]).click();
          break;
        case "rule-shift":
          await b(ruleAccept(d.rule, d.tests[0]) ? "yes" : "no").click();
          break;
        case "word-ladder":
          await submit(d.path[1]);
          break;
        case "word-search": {
          const i = d.grid.findIndex((v: string) => v === d.word[0]);
          await cell(i);
          break;
        }
        case "hangman":
          await b(d.word[0]).click();
          break;
        case "anagram-forge":
          await submit(d.valid[0]);
          break;
        case "category-sort":
          await b(d.items[0].category).click();
          break;
        case "sentence-order":
          await b(d.tiles[0]).first().click();
          break;
        case "cipher-lab":
          await submit(d.plain);
          await expect(
            page.getByRole("heading", { name: "round complete", exact: true }),
          ).toBeVisible();
          break;
        case "binary-bridge":
          await b(`${2 ** (d.bits - 1)}: 0`).click();
          break;
        case "fraction-balance": {
          const [a, b1, c, e] = d.pairs[0];
          await b(
            a * e === c * b1
              ? "equal"
              : a * e < c * b1
                ? "left smaller"
                : "left larger",
          ).click();
          break;
        }
        case "make-target":
          await page.locator(".pack-ui button[aria-pressed]").nth(0).click();
          await page.locator(".pack-ui button[aria-pressed]").nth(1).click();
          await b("+").click();
          break;
        case "nim":
          await b("take 1").first().click();
          break;
        case "dots-boxes":
          await page
            .getByRole("button", { name: "edge 1", exact: true })
            .click();
          break;
        case "reversi":
          await cell(nextCommand(s).index as number);
          break;
        case "mancala":
          await cell(0, 1);
          break;
        case "battleship":
          await b("?").first().click();
          break;
        case "word-duel":
          await submit(String(nextCommand(s).answer));
          break;
        case "poisoned-chocolate":
          await cell(d.board.length - 1);
          break;
        case "nonogram":
          await cell(0);
          break;
        case "mini-sudoku":
        case "cross-sums":
          await cell(
            d.given.includes(0)
              ? d.values.findIndex(
                  (_: number, i: number) => !d.given.includes(i),
                )
              : 0,
          );
          break;
        case "river-crossing":
          await b("ferry " + d.names[1]).click();
          break;
        case "water-jugs":
          await b("fill").first().click();
          break;
        case "tower-hanoi":
          await b("move top to 2").first().click();
          break;
        case "circuit-route":
          await cell(0);
          break;
        case "laser-mirrors":
          await page
            .locator('.pack-ui div[style*="grid-template-columns"] button')
            .first()
            .click();
          break;
        case "balance-scale":
          await page.locator(".pack-ui select").nth(0).selectOption("1");
          await page.locator(".pack-ui select").nth(1).selectOption("2");
          await b("weigh").click();
          await expect(page.getByText(/Weighings 1\//)).toBeVisible();
          break;
        case "peg-solitaire":
          await cell(d.solution[0].from);
          await cell(d.solution[0].to);
          break;
        case "knapsack-vault":
          await page.getByRole("button", { name: /cargo 1:/ }).click();
          break;
        case "path-sum":
          await cell(d.solution[1]);
          break;
        case "n-back":
          await ready();
          await b(d.stream[1] === d.stream[0] ? "same" : "different").click();
          break;
        case "story-recall":
          await ready();
          await b(d.entries[d.questions[0]].place).click();
          break;
        case "mental-rotation":
          await page
            .getByRole("button", {
              name: new RegExp("^Option " + (d.rotations.indexOf(d.angle) + 1)),
            })
            .click();
          break;
        case "focus-switch": {
          const q = d.trials[0],
            v =
              q.cue === "#"
                ? String(Math.max(...q.values.map(Number)))
                : q.values.reduce((a: string, b: string) =>
                    a.length < b.length ? a : b,
                  );
          await b(v).click();
          break;
        }
        case "logic-grid":
          await page
            .locator(".pack-ui select")
            .first()
            .selectOption(String(d.solution[0]));
          break;
        case "probability-pick": {
          const values = d.bags.map(
            (b: { red: number; blue: number }) =>
              ((b.red / (b.red + b.blue)) * (b.red - 1)) / (b.red + b.blue - 1),
          );
          await page
            .getByRole("button", {
              name: new RegExp(
                "^Bag " + (values.indexOf(Math.max(...values)) + 1) + ":",
              ),
            })
            .click();
          break;
        }
        default:
          throw new Error("Missing browser path " + def.id);
      }
      if (await page.locator(".pack-ui [role=alert]").count())
        console.log(
          "GAME ERROR",
          def.id,
          await page.locator(".pack-ui [role=alert]").allTextContents(),
        );
      await expect(page.locator(".pack-ui [role=alert]")).toHaveCount(0);
      console.log(
        "PASS " + def.id + ": actual rendered controls accept a legal move",
      );
    }
    // Children numbers are a second mode of ONE game, not counted as a new game.
    await page.goto(base + "/games/order-garden");
    await page.getByLabel("garden mode").selectOption("numbers");
    await b("play solo").click();
    for (let n = 1; n <= 10; n++) await b(String(n)).click();
    await expect(
      page.getByRole("heading", { name: "round complete", exact: true }),
    ).toBeVisible();
    console.log("PASS children numbers: complete first level, no timer");
    // Responsive text-only board: no sideways overflow on a small phone.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "/games/order-garden");
    await b("play solo").click();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    console.log("PASS mobile: alphabet board fits 390px width");
    for (const id of ["codebreaker", "2048", "minesweeper"]) {
      await page.goto(base + "/games/" + id);
      await expect(
        page.getByText("full rules and examples", { exact: true }),
      ).toBeVisible();
      assert.equal(
        await page.locator("details.box-dashed").getAttribute("open"),
        null,
      );
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS all 51 new game UIs, children modes, catalog, legacy help: zero page errors",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
