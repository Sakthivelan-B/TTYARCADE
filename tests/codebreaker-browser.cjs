const { createRequire } = require("node:module");
const req = createRequire(require("node:path").resolve("package.json"));
const assert = require("node:assert/strict"),
  fs = require("node:fs");
const { chromium, expect } = req("@playwright/test"),
  ts = req("typescript");
const source = fs.readFileSync("src/app/games/codebreaker/page.tsx", "utf8");
const block = source
  .slice(
    source.indexOf("function score("),
    source.indexOf("export default function"),
  )
  .replace("function score(", "export function score(");
const mod = { exports: {} };
new Function(
  "exports",
  "module",
  ts.transpileModule(block, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
)(mod.exports, mod);
const score = mod.exports.score;
const all = Array.from({ length: 125 }, (_, i) =>
  [Math.floor(i / 25), Math.floor(i / 5) % 5, i % 5].join(""),
);
for (const secret of all)
  for (const guess of all) {
    let exact = 0,
      total = 0;
    for (let i = 0; i < 3; i++) exact += secret[i] === guess[i];
    for (const d of "01234")
      total += Math.min(
        [...secret].filter((x) => x === d).length,
        [...guess].filter((x) => x === d).length,
      );
    assert.deepEqual(score(secret, guess), { exact, near: total - exact });
  }
console.log(
  "PASS: all 15,625 level-one secret/guess combinations match independent duplicate-aware scoring.",
);
const screenshot = [
  ["012", 1, 0],
  ["034", 0, 1],
  ["043", 1, 0],
  ["032", 1, 0],
  ["014", 0, 1],
];
assert.deepEqual(
  all.filter((s) =>
    screenshot.every(
      ([g, exact, near]) =>
        JSON.stringify(score(s, g)) === JSON.stringify({ exact, near }),
    ),
  ),
  ["242", "442"],
);
console.log(
  "PASS: screenshot feedback consistently allows fixed secrets 242 or 442.",
);
const secondScreenshot = [
  ["012", 0, 1],
  ["304", 0, 2],
  ["430", 0, 2],
  ["043", 2, 0],
  ["041", 1, 0],
  ["023", 1, 1],
  ["031", 0, 1],
];
assert.deepEqual(
  all.filter((s) =>
    secondScreenshot.every(
      ([g, exact, near]) =>
        JSON.stringify(score(s, g)) === JSON.stringify({ exact, near }),
    ),
  ),
  ["243"],
);
console.log("PASS: second screenshot has unique solution 243.");
(async () => {
  const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox"],
    }),
    page = await browser.newPage(),
    errors = [];
  let recorded = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/scores", (route) => {
    recorded++;
    return route.fulfill({
      contentType: "application/json",
      body: '{"ok":true}',
    });
  });
  await page.route("**/api/activity", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.addInitScript(() => {
    const native = crypto.getRandomValues.bind(crypto);
    const values = [
      0.45, 0.85, 0.45, 0.05, 0.05, 0.75, 0.85, 0.85, 0.85, 0.25, 0.25, 0.25,
    ];
    window.__codeDraws = 0;
    crypto.getRandomValues = function (a) {
      if (a instanceof Uint32Array && a.length === 1 && values.length) {
        a[0] = Math.floor(values.shift() * 4294967296);
        window.__codeDraws++;
        return a;
      }
      return native(a);
    };
  });
  await page.goto(
    (process.env.TEST_BASE_URL || "http://127.0.0.1:3000") +
      "/games/codebreaker",
  );
  await page.getByRole("button", { name: "start", exact: true }).click();
  const input = page.getByLabel("code guess"),
    history = page.locator("pre.screen");
  const attempts = page
    .getByText("guesses=", { exact: true })
    .locator("..")
    .locator("b");
  await expect(attempts).toHaveText("0/10");
  assert.equal(await page.evaluate(() => window.__codeDraws), 3);
  for (const [i, [guess, exact, near]] of screenshot.entries()) {
    await input.fill(guess);
    await input.press("Enter");
    await expect(attempts).toHaveText(i + 1 + "/10");
    await expect(input).toHaveValue("");
    const rows = (await history.textContent())
      .split("\n")
      .filter((x) => /^\s*\d+\s/.test(x));
    assert.equal(rows.length, i + 1);
    const last = rows.at(-1).trim().split(/\s+/);
    assert.deepEqual(last.slice(-3).map(Number), [
      exact,
      near,
      3 - exact - near,
    ]);
    assert.equal(await page.evaluate(() => window.__codeDraws), 3);
  }
  console.log(
    "PASS: screenshot guesses retain every history row, expected counts and the same three initial random draws.",
  );
  await input.fill("012");
  await input.press("Enter");
  await expect(page.getByRole("status")).toContainText("already tried");
  await expect(attempts).toHaveText("5/10");
  await input.fill("9a2");
  await expect(input).toHaveValue("2");
  await page.getByRole("button", { name: "clear", exact: true }).click();
  await expect(input).toHaveValue("");
  await expect(attempts).toHaveText("5/10");
  await input.fill("242");
  await input.press("Enter");
  await expect(page.getByText(/>> cracked in 6\/10/)).toBeVisible();
  await expect(
    page.getByText("the code was 242", { exact: true }),
  ).toBeVisible();
  await expect.poll(() => recorded).toBe(1);
  assert.equal(await page.evaluate(() => window.__codeDraws), 3);
  await page.getByRole("button", { name: "next level", exact: true }).click();
  await expect(attempts).toHaveText("0/10");
  assert.equal(await page.evaluate(() => window.__codeDraws), 6);
  await input.fill("004");
  await input.press("Enter");
  await expect(
    page.getByText("the code was 004", { exact: true }),
  ).toBeVisible();
  await expect.poll(() => recorded).toBe(2);
  console.log(
    "PASS: exact screenshot solution wins; duplicate guesses use no attempts; next level creates a new code; leading-zero/repeated-digit solution works.",
  );
  await page
    .getByRole("button", { name: "restart from level 1", exact: true })
    .click();
  await expect(attempts).toHaveText("0/10");
  await input.fill("000");
  await input.evaluate((el) => {
    el.form.requestSubmit();
    el.form.requestSubmit();
  });
  await expect(attempts).toHaveText("1/10");
  console.log("PASS: synchronous duplicate form events count once.");
  const misses = [
    "001",
    "002",
    "003",
    "004",
    "010",
    "011",
    "012",
    "013",
    "014",
  ];
  for (const [i, g] of misses.entries()) {
    await input.fill(g);
    if (i % 2) await input.press("Enter");
    else await page.getByRole("button", { name: "guess", exact: true }).click();
    await expect(attempts).toHaveText(i + 2 + "/10");
  }
  await expect(page.getByText(">> locked out", { exact: true })).toBeVisible();
  await expect(
    page.getByText("the code was 444", { exact: true }),
  ).toBeVisible();
  await expect.poll(() => recorded).toBe(3);
  await page.getByRole("button", { name: "retry level", exact: true }).click();
  await expect(attempts).toHaveText("0/10");
  await input.fill("111");
  await input.press("Enter");
  await expect(
    page.getByText("the code was 111", { exact: true }),
  ).toBeVisible();
  await expect.poll(() => recorded).toBe(4);
  console.log(
    "PASS: exactly ten misses lock out, loss reveals the unchanged secret, retry resets history and creates a different code; mouse/Enter both work.",
  );

  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "PASS: zero browser page errors. Lint, types and production build also passed.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
