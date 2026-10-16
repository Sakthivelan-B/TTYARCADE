"use client";
import { useState, type ReactNode } from "react";
import type { PackState, Command } from "@/lib/pack";
import { cardText, twentyTotal, type PackCard } from "@/lib/pack/card-games";
import { rotatedShape } from "@/lib/pack/puzzles";
import { ALL_WORDS } from "@/lib/words";
type Props = {
  state: PackState;
  viewer: number;
  names: string[];
  disabled?: boolean;
  send: (c: Command) => void;
};
function Answer({
  label,
  submit,
  disabled = false,
  maxLength = 120,
  button = "submit",
}: {
  label: string;
  submit: (answer: string) => void;
  disabled?: boolean;
  maxLength?: number;
  button?: string;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) {
          submit(value);
          setValue("");
        }
      }}
    >
      <label>
        {label}
        <br />
        <input
          aria-label="answer"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={maxLength}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
        />
      </label>{" "}
      <button disabled={disabled}>{button}</button>
    </form>
  );
}
export function PackBoard({
  state: s,
  viewer,
  names,
  disabled = false,
  send,
}: Props) {
  const [selected, setSelected] = useState<number[]>([]),
    [rank, setRank] = useState(1),
    [target, setTarget] = useState(0),
    [golfMode, setGolfMode] = useState("replace");
  const d = s.data,
    dead = disabled || !(s.phase === "play" || s.phase === "observe"),
    act = (c: Command) => {
      if (!dead) send(c);
    };
  const button = (
    label: ReactNode,
    c: Command,
    extra = false,
    key?: string | number,
  ) => (
    <button key={key} disabled={dead || extra} onClick={() => act(c)}>
      {label}
    </button>
  );
  const choose = (label: ReactNode, i: number, extra = false) =>
    button(label, { type: "choose", index: i }, extra, i);
  const answers = (values: string[], type = "answer") => (
    <div className="row">
      {values.map((answer, i) => button(answer, { type, answer }, false, i))}
    </div>
  );
  const yesNo = (yes = "yes", no = "no") => (
    <div className="row">
      {button(yes, { type: "answer", yes: true })}
      {button(no, { type: "answer", yes: false })}
    </div>
  );
  const input = (
    label: string,
    maxLength = 120,
    type = "answer",
    buttonLabel = "submit",
  ) => (
    <Answer
      label={label}
      submit={(answer) => act({ type, answer })}
      disabled={dead}
      maxLength={maxLength}
      button={buttonLabel}
    />
  );
  const ready = () =>
    button("memorized — hide and continue", { type: "ready" });
  const check = () => button("check", { type: "check" }),
    reset = () => button("clear / reset this board", { type: "reset" });
  const grid = (n: number, cells: ReactNode[], large = false) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${n},minmax(0,1fr))`,
        gap: large ? 8 : 4,
        maxWidth: large ? 850 : 520,
        margin: "12px 0",
      }}
    >
      {cells}
    </div>
  );
  const cell = (label: ReactNode, i: number, extra = false) => (
    <button
      key={i}
      style={{
        minHeight: "2.8rem",
        padding: "6px 2px",
        fontSize: s.game === "order-garden" ? "1.5rem" : undefined,
      }}
      disabled={dead || extra}
      onClick={() => act({ type: "choose", index: i })}
    >
      {label}
    </button>
  );
  const person = (i: number) => names[i] ?? `Player ${i + 1}`;
  const hand: PackCard[] = d.handCards ?? [];
  const showHand = (click = false) => (
    <div className="row" aria-label="your hand">
      {hand.map((c, i) => (
        <button
          key={c.id}
          disabled={dead || !click}
          aria-pressed={selected[0] === i}
          onClick={() => setSelected([i])}
        >
          {selected[0] === i ? "[" : ""}
          {cardText(c)}
          {selected[0] === i ? "]" : ""}
        </button>
      ))}
    </div>
  );
  const cards = (a: (PackCard | null)[]) =>
    a.map((c, i) => (
      <span
        key={i}
        style={{
          border: "1px solid #fff",
          padding: "6px",
          display: "inline-block",
          margin: 3,
        }}
      >
        {c ? cardText(c) : "??"}
      </span>
    ));
  const stock = (
    <p className="small muted">
      Stock: {d.deckCount} ·{" "}
      {d.handCounts
        ?.map((n: number, i: number) => `${person(i)}: ${n}`)
        .join(" / ")}
      {d.discardTop ? ` · Discard: ${cardText(d.discardTop)}` : ""}
    </p>
  );
  const shape = (a: number[][]) => {
    const keys = new Set(a.map((p) => p.join(",")));
    const h = Math.max(...a.map((p) => p[0])) + 1,
      w = Math.max(...a.map((p) => p[1])) + 1;
    return (
      <pre aria-label="shape">
        {Array.from({ length: h }, (_, r) =>
          Array.from({ length: w }, (_, c) =>
            keys.has(`${r},${c}`) ? "[]" : "  ",
          ).join(""),
        ).join("\n")}
      </pre>
    );
  };
  const terminal = () => s.phase === "won" || s.phase === "lost";
  if (terminal())
    return (
      <section>
        <h2>{s.phase === "won" ? "round complete" : "round ended"}</h2>
        <p>{s.message}</p>
        <p>
          {s.scores
            .map((score, i) => `${person(i)}: ${score} point(s)`)
            .join(" · ")}
        </p>
        {d.winningGroups?.map((g: PackCard[], i: number) => (
          <p key={i}>
            Group {i + 1}: {g.map(cardText).join(" · ")}
          </p>
        ))}
        {s.game === "golf-six" &&
          d.grids?.map((g: (PackCard | null)[], p: number) => (
            <p key={p}>
              {person(p)}: {cards(g)} · {d.points?.[p]} points
            </p>
          ))}
        {s.game === "twenty-one" && <p>Dealer: {cards(d.dealer ?? [])}</p>}
        {s.game === "hangman" && <p>{d.mask}</p>}
        {s.game === "higher-lower" && (
          <p>
            Revealed card: {cards([d.current])} · Streak {d.streak}/{d.goal}
          </p>
        )}
        {s.game === "war" && <p>Final battle: {cards(d.faces ?? [])}</p>}
      </section>
    );
  switch (s.game) {
    case "rummy":
      return (
        <>
          {stock}
          <p>Your hand ({hand.length})</p>
          {showHand(d.drawn)}
          <div className="row">
            {!d.drawn ? (
              <>
                {button(
                  "draw from stock",
                  { type: "draw", source: "stock" },
                  !d.deckCount && d.discardCount < 2,
                )}
                {button(
                  "take discard",
                  { type: "draw", source: "discard" },
                  !d.discardTop,
                )}
                {button("declare 13-card hand", { type: "declare" })}
              </>
            ) : (
              <>
                {button(
                  "discard selected",
                  { type: "discard", index: selected[0] },
                  selected[0] === undefined,
                )}
                {button(
                  "discard + declare",
                  { type: "discard", index: selected[0], declare: true },
                  selected[0] === undefined,
                )}
              </>
            )}
          </div>
        </>
      );
    case "go-fish": {
      const ranks = [...new Set(hand.map((c) => c.rank))].sort((a, b) => a - b),
        r = ranks.includes(rank) ? rank : ranks[0],
        p =
          target !== viewer && d.handCounts[target] > 0
            ? target
            : d.handCounts.findIndex(
                (n: number, i: number) => i !== viewer && n > 0,
              );
      return (
        <>
          {stock}
          {d.lastAsk && (
            <p>
              {person(d.lastAsk.player)} asked {person(d.lastAsk.target)} for
              rank {d.lastAsk.rank}:{" "}
              {d.lastAsk.matches ? `received ${d.lastAsk.matches}` : "go fish"}.
            </p>
          )}
          <p>
            Books:{" "}
            {d.books
              ?.map((n: number, i: number) => `${person(i)} ${n}`)
              .join(" / ")}
          </p>
          {showHand()}
          <div className="row">
            <label>
              Ask player{" "}
              <select
                disabled={dead}
                value={p}
                onChange={(e) => setTarget(Number(e.target.value))}
              >
                {d.handCounts.map((n: number, i: number) =>
                  i !== viewer && n > 0 ? (
                    <option key={i} value={i}>
                      {person(i)}
                    </option>
                  ) : null,
                )}
              </select>
            </label>
            <label>
              Rank{" "}
              <select
                disabled={dead}
                value={r}
                onChange={(e) => setRank(Number(e.target.value))}
              >
                {ranks.map((n) => (
                  <option key={n} value={n}>
                    {
                      [
                        "",
                        "A",
                        "2",
                        "3",
                        "4",
                        "5",
                        "6",
                        "7",
                        "8",
                        "9",
                        "10",
                        "J",
                        "Q",
                        "K",
                      ][n]
                    }
                  </option>
                ))}
              </select>
            </label>
            {button(
              "ask",
              { type: "ask", player: p, rank: r },
              p < 0 || r === undefined,
            )}
          </div>
        </>
      );
    }
    case "war":
      return (
        <>
          {stock}
          <p>
            Battle {d.battles}/200 · Pot: {d.potCount}
          </p>
          <div>{cards(d.faces ?? [])}</div>
          {button("reveal top card", { type: "reveal" })}
        </>
      );
    case "higher-lower":
      return (
        <>
          {stock}
          <p>Current: {cards([d.current])}</p>
          <p>
            Streak: {d.streak}/{d.goal} · Aces high; equal rank is a push.
          </p>
          {answers(["higher", "lower"])}
        </>
      );
    case "twenty-one":
      return (
        <>
          {stock}
          <p>Dealer: {cards(d.dealer ?? [])}</p>
          <p>Your total: {twentyTotal(hand)}</p>
          {showHand()}
          {button("hit", { type: "hit" })} {button("stand", { type: "stand" })}
        </>
      );
    case "sevens":
      return (
        <>
          {stock}
          {Object.entries(d.runs ?? {}).map(([suit, run]) => (
            <p key={suit}>
              {suit}:{" "}
              {(run as number[])
                .slice()
                .sort((a, b) => a - b)
                .map((rank) => cardText({ id: 0, rank, suit }))
                .join(" · ") || "—"}
            </p>
          ))}
          {showHand(true)}
          {button(
            "play selected",
            { type: "play", index: selected[0] },
            selected[0] === undefined,
          )}{" "}
          {button("pass (only if blocked)", { type: "pass" })}
        </>
      );
    case "golf-six":
      return (
        <>
          {stock}
          {d.held && <p>Drawn: {cardText(d.held)}</p>}
          {!d.setup && (
            <div className="row">
              {button(
                "draw stock",
                { type: "draw", source: "stock" },
                !!d.held,
              )}
              {button(
                "take discard",
                { type: "draw", source: "discard" },
                !!d.held || !d.discardTop,
              )}
              <label>
                With drawn card{" "}
                <select
                  value={golfMode}
                  disabled={dead || !d.held}
                  onChange={(e) => setGolfMode(e.target.value)}
                >
                  <option value="replace">replace a grid card</option>
                  <option value="flip-discard">
                    discard it + reveal a hidden card
                  </option>
                </select>
              </label>
            </div>
          )}
          {d.grids.map((g: (PackCard | null)[], p: number) => (
            <section key={p}>
              <p>
                {person(p)}
                {p === viewer ? " (you)" : ""}
                {d.setup && p === viewer ? " — reveal two cards" : ""}
              </p>
              {grid(
                3,
                g.map((c, i) => (
                  <button
                    style={{ minHeight: 45 }}
                    key={i}
                    disabled={
                      dead ||
                      p !== viewer ||
                      (!d.setup && !d.held) ||
                      (d.setup && !!c)
                    }
                    onClick={() =>
                      act({ type: d.setup ? "choose" : golfMode, index: i })
                    }
                  >
                    {c ? cardText(c) : "??"}
                  </button>
                )),
              )}
            </section>
          ))}
        </>
      );
    case "old-maid": {
      let p = viewer;
      for (let n = 1; n <= s.players; n++) {
        const candidate = (viewer + n) % s.players;
        if (d.handCounts[candidate]) {
          p = candidate;
          break;
        }
      }
      return (
        <>
          {stock}
          <p>Your unpaired cards</p>
          {showHand()}
          <p>Pick a facedown card from {person(p)}.</p>
          <div className="row">
            {Array.from({ length: d.handCounts[p] ?? 0 }, (_, i) =>
              choose(`card ${i + 1}`, i),
            )}
          </div>
        </>
      );
    }
    case "thought-number":
      return (
        <>
          <p>Keep one number from 1 to {d.range} in mind.</p>
          <p>
            List {d.cursor + 1}/{d.questionCount}: is your number here?
          </p>
          <p style={{ fontSize: "1.25rem", lineHeight: 2 }}>
            {d.question.join(" · ")}
          </p>
          {yesNo()}
        </>
      );
    case "order-garden":
      return (
        <>
          <p style={{ fontSize: "1.5rem" }}>
            Find {d.targets[d.cursor]} · {d.cursor}/{d.targets.length}
          </p>
          {grid(
            d.alphabet ? 6 : Math.min(8, Math.ceil(Math.sqrt(d.tiles.length))),
            d.tiles.map((value: string, i: number) =>
              cell(
                d.targets.indexOf(value) < d.cursor ? "·" : value,
                i,
                d.targets.indexOf(value) < d.cursor,
              ),
            ),
            true,
          )}
        </>
      );
    case "corrupted-file":
      return s.phase === "observe" ? (
        <>
          <pre>{d.original.join("\n")}</pre>
          {ready()}
        </>
      ) : (
        <>
          <p>Which line changed?</p>
          <div className="stack">
            {d.display.map((line: string, i: number) => choose(line, i))}
          </div>
        </>
      );
    case "fact-chain":
      return s.phase === "observe" ? (
        <>
          <div>
            {d.facts.map((f: string[], i: number) => (
              <p key={i}>
                {f[0]} <strong>{f[1]}</strong>
              </p>
            ))}
          </div>
          <details>
            <summary>fact sources (optional reading)</summary>
            {d.facts.map((f: string[], i: number) => (
              <p key={i}>
                <a href={f[3]} target="_blank" rel="noopener noreferrer">
                  {f[0]} — reference
                </a>
              </p>
            ))}
          </details>
          {ready()}
        </>
      ) : (
        <>
          <p>{d.question}</p>
          {answers(d.answers)}
        </>
      );
    case "future-message":
      return s.phase === "observe" ? (
        <>
          <p>Memorize slot {d.answerIndex + 1}.</p>
          <p>
            {d.values
              .map((v: number, i: number) => `[${i + 1}: ${v}]`)
              .join(" ")}
          </p>
          {input(
            "Optional reminder (up to 12 characters)",
            12,
            "ready",
            "save reminder + hide",
          )}
        </>
      ) : (
        <>
          <p>Saved reminder: {d.reminder || "(none)"}</p>
          {d.cursor < 2
            ? input(
                `Distraction ${d.cursor + 1}/2: ${d.distraction[0]} + ${d.distraction[1]} = ?`,
                8,
              )
            : input(`What number was in slot ${d.answerIndex + 1}?`, 8)}
        </>
      );
    case "timeline-tangle":
      return (
        <>
          <p>Choose earliest → latest.</p>
          <div className="row">
            {d.events.map((event: [string, number | null], i: number) =>
              choose(event[0], i, d.selection.includes(i)),
            )}
          </div>
          <ol>
            {d.selection.map((i: number) => (
              <li key={i}>{d.events[i][0]}</li>
            ))}
          </ol>
          <div className="row">
            {reset()}
            {check()}
          </div>
        </>
      );
    case "rule-shift":
      return (
        <>
          <p>Accepted: {d.accept.join(", ")}</p>
          <p>Rejected: {d.reject.join(", ")}</p>
          <p>
            Does {d.test} fit the same rule? ({d.cursor + 1}/5)
          </p>
          {yesNo()}
        </>
      );
    case "word-ladder":
      return (
        <>
          <p>
            {d.history.join(" → ")} → target: {d.target}
          </p>
          {input("Next word (change exactly one letter)", 8)}
          <details>
            <summary>allowed word bank</summary>
            <p>{d.bank.join(", ")}</p>
          </details>
        </>
      );
    case "word-search":
      return (
        <>
          <p>
            Trace {d.word} · Selected:{" "}
            {d.selection.map((i: number) => d.grid[i]).join("")}
          </p>
          {grid(
            d.n,
            d.grid.map((ch: string, i: number) =>
              cell(
                d.selection.includes(i) ? `[${ch}]` : ch,
                i,
                d.selection.includes(i),
              ),
            ),
          )}
          {reset()}
        </>
      );
    case "hangman":
      return (
        <>
          <p style={{ fontSize: "1.5rem" }}>{d.mask}</p>
          <p>Tried: {d.guessed.join(", ") || "none"}</p>
          <div className="row">
            {"abcdefghijklmnopqrstuvwxyz"
              .split("")
              .map((ch, i) =>
                button(
                  ch,
                  { type: "answer", answer: ch },
                  d.guessed.includes(ch),
                  i,
                ),
              )}
          </div>
        </>
      );
    case "anagram-forge":
      return (
        <>
          <p>
            Rack: {d.rack.toUpperCase().split("").join(" ")} · Find {d.goal}{" "}
            words.
          </p>
          <p>Found: {d.found.join(", ") || "none"}</p>
          {input("A word from these letters", 8)}
          <details>
            <summary>accepted bank (help)</summary>
            <p>{d.bank.join(", ")}</p>
          </details>
        </>
      );
    case "category-sort":
      return (
        <>
          <p>
            Classify: <strong>{d.item}</strong>
          </p>
          {answers(d.categories)}
        </>
      );
    case "sentence-order":
      return (
        <>
          <p>
            {d.selection.map((i: number) => d.tiles[i]).join(" ") ||
              "Build the sentence."}
          </p>
          <div className="row">
            {d.tiles.map((w: string, i: number) =>
              choose(w, i, d.selection.includes(i)),
            )}
          </div>
          <div className="row">
            {reset()}
            {check()}
          </div>
        </>
      );
    case "cipher-lab":
      return (
        <>
          <p>Caesar shift: +{d.shift} during encoding. Reverse it to decode.</p>
          <pre style={{ whiteSpace: "pre-wrap" }}>{d.cipher}</pre>
          {input("Decoded sentence")}
        </>
      );
    case "binary-bridge":
      return (
        <>
          <p>
            Build decimal {d.target}. Current:{" "}
            {d.values.reduce(
              (a: number, v: number, i: number) =>
                a + v * 2 ** (d.bits - 1 - i),
              0,
            )}
          </p>
          <div className="row">
            {d.values.map((v: number, i: number) =>
              choose(`${2 ** (d.bits - 1 - i)}: ${v}`, i),
            )}
          </div>
          {check()}
        </>
      );
    case "fraction-balance":
      return (
        <>
          <p>
            {d.pair[0]}/{d.pair[1]} compared with {d.pair[2]}/{d.pair[3]}
          </p>
          {answers(["left smaller", "equal", "left larger"])}
        </>
      );
    case "make-target":
      return (
        <>
          <p>
            Target: {d.target} · Select two different tiles, then an operation.
          </p>
          <div className="row">
            {d.values.map((v: { id: number; value: number }, i: number) => (
              <button
                disabled={dead}
                key={v.id}
                aria-pressed={selected.includes(i)}
                onClick={() =>
                  setSelected((a) =>
                    a.includes(i)
                      ? a.filter((x) => x !== i)
                      : [...a.slice(-1), i],
                  )
                }
              >
                {selected.includes(i) ? `[${v.value}]` : v.value}
              </button>
            ))}
          </div>
          <div className="row">
            {["+", "-", "*", "/"].map((op) => (
              <button
                key={op}
                disabled={dead || selected.length !== 2}
                onClick={() => {
                  act({
                    type: "combine",
                    first: selected[0],
                    second: selected[1],
                    op,
                  });
                  setSelected([]);
                }}
              >
                {op}
              </button>
            ))}
            {button("undo", { type: "undo" })}
            {reset()}
          </div>
        </>
      );
    case "nim":
      return (
        <div>
          {d.piles.map((n: number, i: number) => (
            <section key={i}>
              <p>
                Pile {i + 1}: {"|".repeat(n)} ({n})
              </p>
              <div className="row">
                {Array.from({ length: n }, (_, j) =>
                  button(
                    `take ${j + 1}`,
                    { type: "take", index: i, amount: j + 1 },
                    false,
                    j,
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      );
    case "dots-boxes":
      return grid(
        2 * d.n - 1,
        Array.from({ length: (2 * d.n - 1) ** 2 }, (_, i) => {
          const r = Math.floor(i / (2 * d.n - 1)),
            c = i % (2 * d.n - 1);
          if (r % 2 === 0 && c % 2 === 0)
            return (
              <span
                style={{ alignSelf: "center", textAlign: "center" }}
                key={i}
              >
                +
              </span>
            );
          if (r % 2 && c % 2) {
            const box = d.boxes.find(
              (b: any) =>
                b.r === Math.floor(r / 2) && b.c === Math.floor(c / 2),
            );
            return (
              <span
                style={{ textAlign: "center", alignSelf: "center" }}
                key={i}
              >
                {box.owner < 0 ? " " : box.owner + 1}
              </span>
            );
          }
          const at = d.edges.findIndex(
            (e: any) =>
              e.r1 === Math.floor(r / 2) &&
              e.c1 === Math.floor(c / 2) &&
              (r % 2 ? e.r2 === e.r1 + 1 : e.c2 === e.c1 + 1),
          );
          const e = d.edges[at];
          return (
            <button
              key={i}
              style={{ minHeight: 36, padding: 0 }}
              aria-label={`edge ${at + 1}`}
              disabled={dead || e.owner >= 0}
              onClick={() => act({ type: "choose", index: at })}
            >
              {e.owner < 0 ? "·" : r % 2 ? "|" : "—"}
            </button>
          );
        }),
      );
    case "reversi":
      return (
        <>
          {grid(
            8,
            d.board.map((v: number, i: number) =>
              cell(v === 1 ? "X" : v === 2 ? "O" : "·", i, !!v),
            ),
          )}
          {button("pass (only when blocked)", { type: "pass" })}
        </>
      );
    case "mancala":
      return (
        <>
          <p>
            {person(1)} store: {d.pits[13]}
          </p>
          {grid(
            6,
            Array.from({ length: 6 }, (_, j) =>
              cell(
                d.pits[12 - j],
                12 - j,
                viewer !== 1 || d.pits[12 - j] === 0,
              ),
            ),
          )}
          {grid(
            6,
            Array.from({ length: 6 }, (_, j) =>
              cell(d.pits[j], j, viewer !== 0 || d.pits[j] === 0),
            ),
          )}
          <p>
            {person(0)} store: {d.pits[6]}
          </p>
        </>
      );
    case "battleship":
      return (
        <>
          <p>Your fleet (# ship, X hit, · miss)</p>
          {grid(
            5,
            Array.from({ length: 25 }, (_, i) => (
              <span
                style={{
                  border: "1px solid #fff",
                  textAlign: "center",
                  padding: 8,
                }}
                key={i}
              >
                {d.incoming[i] === 1
                  ? "X"
                  : d.incoming[i] === 0
                    ? "·"
                    : d.ownBoard[i]
                      ? "#"
                      : " "}
              </span>
            )),
          )}
          <p>Target grid</p>
          {grid(
            5,
            d.shots.map((v: number, i: number) =>
              cell(v === 1 ? "X" : v === 0 ? "·" : "?", i, v !== -1),
            ),
          )}
        </>
      );
    case "word-duel":
      return (
        <>
          <p>
            Required first letter: {d.letter.toUpperCase()} · {d.words.length}
            /20 words
          </p>
          <p>{d.words.join(" → ") || "Start the chain."}</p>
          {input("Next word", 8)}
          {button("pass (only if no word exists)", { type: "pass" })}
          <details>
            <summary>allowed bank</summary>
            <p>
              {ALL_WORDS.filter(
                (w) => w.startsWith(d.letter) && !d.words.includes(w),
              ).join(", ") || "No word remains."}
            </p>
          </details>
        </>
      );
    case "poisoned-chocolate":
      return (
        <>
          <p>Taking a square also removes every square down and right.</p>
          {grid(
            d.cols,
            d.board.map((v: number, i: number) =>
              cell(v ? (i === 0 ? "POISON" : "[]") : "·", i, !v),
            ),
          )}
        </>
      );
    case "nonogram":
      return (
        <>
          <p>Rows: {d.rows.map((r: number[]) => r.join(" ")).join(" / ")}</p>
          <p>Columns: {d.cols.map((r: number[]) => r.join(" ")).join(" / ")}</p>
          {grid(
            d.n,
            d.values.map((v: number, i: number) =>
              cell(v === 1 ? "#" : v === -1 ? "x" : "·", i),
            ),
          )}
          {check()}
        </>
      );
    case "mini-sudoku":
    case "cross-sums": {
      const n = s.game === "mini-sudoku" ? 4 : 3;
      return (
        <>
          {s.game === "cross-sums" && (
            <>
              <p>Row sums: {d.rows.join(", ")}</p>
              <p>Column sums: {d.cols.join(", ")}</p>
            </>
          )}
          <p>Tap editable cells to cycle digits (0 clears).</p>
          {grid(
            n,
            d.values.map((v: number, i: number) =>
              cell(
                d.given.includes(i) ? `[${v}]` : v || "·",
                i,
                d.given.includes(i),
              ),
            ),
          )}
          {check()}
        </>
      );
    }
    case "river-crossing":
      return (
        <>
          <p>
            Left bank:{" "}
            {d.names
              .filter((_: string, i: number) => d.bank[i] === 0)
              .join(", ") || "empty"}
            {d.keeper === 0 ? " + you" : ""}
          </p>
          <p>
            Right bank:{" "}
            {d.names
              .filter((_: string, i: number) => d.bank[i] === 1)
              .join(", ") || "empty"}
            {d.keeper === 1 ? " + you" : ""}
          </p>
          <p>
            Forbidden unattended pairs:{" "}
            {d.conflicts.map((p: string[]) => p.join(" + ")).join("; ")}
          </p>
          <div className="row">
            {button("cross alone", { type: "cross", index: -1 })}
            {d.names.map((name: string, i: number) =>
              button(
                `ferry ${name}`,
                { type: "cross", index: i },
                d.bank[i] !== d.keeper,
                i,
              ),
            )}
          </div>
        </>
      );
    case "water-jugs":
      return (
        <>
          <p>Reach exactly {d.target} litres in either jug.</p>
          {d.caps.map((cap: number, i: number) => (
            <section key={i}>
              <p>
                Jug {i + 1}: {d.values[i]} / {cap} litres
              </p>
              <div className="row">
                {button("fill", { type: "fill", index: i })}
                {button("empty", { type: "empty", index: i })}
                {button("pour into other jug", { type: "pour", index: i })}
              </div>
            </section>
          ))}
        </>
      );
    case "tower-hanoi":
      return (
        <>
          <p>
            Move all disks to rod {d.target + 1}. Moves: {d.moves}.
          </p>
          {d.rods.map((rod: number[], i: number) => (
            <section key={i}>
              <p>
                Rod {i + 1}: {rod.join(" → ") || "(empty)"}
              </p>
              <div className="row">
                {[0, 1, 2]
                  .filter((j) => j !== i)
                  .map((j) =>
                    button(
                      `move top to ${j + 1}`,
                      { type: "move", from: i, to: j },
                      !rod.length,
                      j,
                    ),
                  )}
              </div>
            </section>
          ))}
        </>
      );
    case "circuit-route":
      return (
        <>
          <p>IN: left of top-left · OUT: below bottom-right</p>
          {grid(
            d.n,
            d.tiles.map((v: number, i: number) =>
              cell(
                (
                  {
                    3: "└",
                    6: "┌",
                    12: "┐",
                    9: "┘",
                    5: "│",
                    10: "─",
                  } as Record<number, string>
                )[v] ?? "?",
                i,
              ),
            ),
          )}
          {check()}
        </>
      );
    case "laser-mirrors":
      return (
        <>
          <p>
            IN → row {d.entry + 1} · target → right edge row {d.exit + 1}
          </p>
          {grid(
            d.n,
            Array.from({ length: d.n * d.n }, (_, i) => {
              const at = d.mirrors.findIndex(
                (m: any) => m.r === Math.floor(i / d.n) && m.c === i % d.n,
              );
              return at < 0 ? (
                <span key={i} style={{ textAlign: "center", padding: 8 }}>
                  ·
                </span>
              ) : (
                <button
                  key={i}
                  disabled={dead}
                  onClick={() => act({ type: "choose", index: at })}
                >
                  {d.mirrors[at].char}
                </button>
              );
            }),
          )}
          {button("fire / check", { type: "check" })}
        </>
      );
    case "balance-scale":
      return (
        <>
          <p>
            {d.result} · Weighings {d.weighs}/{d.limit}
          </p>
          <p>Exactly one coin is heavier. Put equal numbers on both pans.</p>
          <div className="row">
            {d.sides.map((side: number, i: number) => (
              <label key={i}>
                Coin {i + 1}{" "}
                <select
                  value={side}
                  disabled={dead}
                  onChange={(e) =>
                    act({
                      type: "place",
                      index: i,
                      side: Number(e.target.value),
                    })
                  }
                >
                  <option value={0}>off</option>
                  <option value={1}>left</option>
                  <option value={2}>right</option>
                </select>
              </label>
            ))}
          </div>
          {button("weigh", { type: "weigh" }, d.weighs >= d.limit)}
          <p>Choose the heavier coin (one final accusation).</p>
          <div className="row">
            {d.sides.map((_: number, i: number) =>
              button(`coin ${i + 1}`, { type: "accuse", index: i }, false, i),
            )}
          </div>
        </>
      );
    case "peg-solitaire":
      return (
        <>
          <p>
            Select a peg, then its empty landing cell. Jump over exactly one
            peg.
          </p>
          {grid(
            5,
            d.values.map((v: number, i: number) =>
              !d.holes[i] ? (
                <span key={i} />
              ) : (
                <button
                  key={i}
                  disabled={dead}
                  aria-pressed={selected[0] === i}
                  onClick={() => {
                    if (v) setSelected([i]);
                    else if (selected.length) {
                      act({ type: "jump", from: selected[0], to: i });
                      setSelected([]);
                    }
                  }}
                >
                  {v ? (selected[0] === i ? "[O]" : "O") : "·"}
                </button>
              ),
            ),
          )}
        </>
      );
    case "knapsack-vault":
      return (
        <>
          <p>
            Capacity: {d.capacity}. Target value: {d.target}.
          </p>
          <div className="stack">
            {d.items.map((item: any, i: number) =>
              choose(
                `${d.selected.includes(i) ? "[x]" : "[ ]"} ${item.name}: weight ${item.weight}, value ${item.value}`,
                i,
              ),
            )}
          </div>
          <p>
            Selected weight:{" "}
            {d.selected.reduce(
              (a: number, i: number) => a + d.items[i].weight,
              0,
            )}{" "}
            · Value:{" "}
            {d.selected.reduce(
              (a: number, i: number) => a + d.items[i].value,
              0,
            )}
          </p>
          <div className="row">
            {check()}
            {reset()}
          </div>
        </>
      );
    case "path-sum":
      return (
        <>
          <p>
            Target: {d.target} · Current:{" "}
            {d.path.reduce((a: number, i: number) => a + d.grid[i], 0)}
          </p>
          {grid(
            d.n,
            d.grid.map((v: number, i: number) =>
              cell(d.path.includes(i) ? `[${v}]` : v, i, d.path.includes(i)),
            ),
          )}
          {reset()}
        </>
      );
    case "n-back":
      return (
        <>
          <p>
            {s.phase === "observe"
              ? `Memorize initial symbol ${d.cursor + 1}/${d.n}`
              : `Is this the same as ${d.n} step(s) earlier?`}
          </p>
          <p style={{ fontSize: "3rem" }}>{d.current}</p>
          {s.phase === "observe" ? ready() : yesNo("same", "different")}
        </>
      );
    case "story-recall":
      return s.phase === "observe" ? (
        <>
          <div>
            {d.entries.map((e: any, i: number) => (
              <p key={i}>
                {e.name} put the {e.object} in the {e.place}.
              </p>
            ))}
          </div>
          {ready()}
        </>
      ) : (
        <>
          <p>{d.question}</p>
          {answers(d.answers)}
        </>
      );
    case "mental-rotation":
      return (
        <>
          <p>Original</p>
          {shape(rotatedShape(d.shape, 0))}
          <p>
            Choose the same shape rotated {d.angle * 90}° clockwise, without
            mirroring.
          </p>
          <div className="row">
            {d.rotations.map((angle: number, i: number) => (
              <button
                key={i}
                disabled={dead}
                onClick={() => act({ type: "choose", index: i })}
              >
                Option {i + 1}
                {shape(rotatedShape(d.shape, angle))}
              </button>
            ))}
          </div>
        </>
      );
    case "focus-switch":
      return (
        <>
          <p>
            Cue {d.trial.cue}:{" "}
            {d.trial.cue === "#"
              ? "choose the largest number"
              : "choose the shortest word"}{" "}
            · Trial {d.cursor + 1}/5
          </p>
          <div className="row">
            {d.trial.values.map((v: string, i: number) => choose(v, i))}
          </div>
        </>
      );
    case "logic-grid":
      return (
        <>
          <ul>
            {d.clues.map((c: any, i: number) => (
              <li key={i}>
                {d.names[c.person]} does NOT have the {d.objects[c.item]}.
              </li>
            ))}
          </ul>
          <div className="stack">
            {d.names.map((name: string, i: number) => (
              <label key={i}>
                {name}{" "}
                <select
                  disabled={dead}
                  value={d.values[i]}
                  onChange={(e) =>
                    act({
                      type: "assign",
                      index: i,
                      value: Number(e.target.value),
                    })
                  }
                >
                  <option value={-1} disabled>
                    choose an object
                  </option>
                  {d.objects.map((o: string, j: number) => (
                    <option key={j} value={j}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {check()}
        </>
      );
    case "probability-pick":
      return (
        <>
          <p>
            Draw two without replacement. Which bag is most likely to give TWO
            RED tokens?
          </p>
          <div className="row">
            {d.bags.map((b: any, i: number) =>
              choose(`Bag ${i + 1}: ${b.red} red, ${b.blue} blue`, i),
            )}
          </div>
        </>
      );
    case "secret-mission":
      return s.phase === "observe" ? (
        <>
          <p>Private briefing for {person(viewer)}.</p>
          <p style={{ fontSize: "2rem" }}>
            Parcel weight: {d.clue ?? "hidden"}
          </p>
          {ready()}
        </>
      ) : (
        <>
          <p>All briefings are sealed. Discuss from memory.</p>
          {input("Combined weight of every parcel", 12)}
        </>
      );
    default:
      return <p>Game not found.</p>;
  }
}
