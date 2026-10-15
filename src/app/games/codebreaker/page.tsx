"use client";
import { useEffect, useRef, useState } from "react";
import { Shell, Stats, Banner } from "@/components/term";
import { freshPattern, randInt, useBest, submitScore } from "@/lib/levels";
import { usePlayerName } from "@/lib/player";

/**
 * CODE BREAKER
 * The hidden code is generated ONCE per level and never changes while you
 * guess. It only changes when you crack it (next level) or restart.
 * Everything about the round lives in one `round` object so a guess can never
 * re-roll the answer.
 */
type Round = {
  level: number;
  len: number;
  digits: number;
  tries: number;
  secret: string;
  rows: { g: string; exact: number; near: number }[];
  status: "play" | "won" | "lost";
};

function config(level: number) {
  return {
    len: Math.min(3 + Math.floor((level - 1) / 2), 6),
    digits: Math.min(5 + Math.floor(level / 2), 10),
    tries: 10,
  };
}

function newRound(level: number, prevSecret?: string): Round {
  const { len, digits, tries } = config(level);
  // A new level always gets a different code than the level before it.
  const secret = freshPattern(
    "codebreaker",
    () => Array.from({ length: len }, () => String(randInt(digits))).join(""),
    (s) => `${digits}:${len}:${s}`,
  );
  if (prevSecret && secret === prevSecret && len === prevSecret.length) {
    // extremely unlikely; force one different digit so the level feels new
    const i = randInt(len);
    const alt = String((Number(secret[i]) + 1 + randInt(digits - 1)) % digits);
    return { level, len, digits, tries, secret: secret.slice(0, i) + alt + secret.slice(i + 1), rows: [], status: "play" };
  }
  return { level, len, digits, tries, secret, rows: [], status: "play" };
}

function score(secret: string, guess: string) {
  let exact = 0;
  const sc: Record<string, number> = {};
  const gc: Record<string, number> = {};
  for (let i = 0; i < secret.length; i++) {
    if (secret[i] === guess[i]) exact++;
    else {
      sc[secret[i]] = (sc[secret[i]] || 0) + 1;
      gc[guess[i]] = (gc[guess[i]] || 0) + 1;
    }
  }
  let near = 0;
  for (const k in gc) near += Math.min(gc[k], sc[k] || 0);
  return { exact, near };
}

export default function CodeBreaker() {
  const [name] = usePlayerName();
  const [round, setRound] = useState<Round | null>(null);
  const [guess, setGuess] = useState("");
  const [best, report] = useBest("codebreaker");
  const [showHelp, setShowHelp] = useState(true);
  const inp = useRef<HTMLInputElement>(null);

  function begin(level: number, prevSecret?: string) {
    setRound(newRound(level, prevSecret));
    setGuess("");
    setTimeout(() => inp.current?.focus(), 30);
  }

  function submit() {
    if (!round || round.status !== "play") return;
    if (guess.length !== round.len) return;
    const r = { g: guess, ...score(round.secret, guess) };
    const rows = [...round.rows, r];
    const won = r.exact === round.len;
    const lost = !won && rows.length >= round.tries;
    setRound({ ...round, rows, status: won ? "won" : lost ? "lost" : "play" });
    setGuess("");
    if (won) {
      report(round.level);
      submitScore("codebreaker", round.level, { tries: rows.length }, name);
    } else if (lost) {
      submitScore("codebreaker", round.level - 1, {}, name);
    }
  }

  // enter key submits from anywhere on the page
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.isComposing || (e.target as HTMLElement)?.closest("button")) return;
      if ((e.target as HTMLElement)?.closest("[data-terminal-header]")) return;
      if (e.key === "Enter" && round?.status === "play" && guess.length === round.len) { e.preventDefault(); submit(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <Shell path="/games/codebreaker" title="code breaker" help="crack the hidden code. the code is FIXED for the whole level - it only changes when you beat the level or restart.">
      <div className="box-dashed text-sm">
        <p className="font-bold">how to play</p>
        <p>1. the computer picks a secret code (numbers only, no repeats needed).</p>
        <p>2. type a guess of the same length and press enter.</p>
        <p>3. feedback: <b>+</b> = right digit in the right place, <b>-</b> = right digit in the wrong place, <b>.</b> = not in the code.</p>
        <p>4. you get {round?.tries ?? 10} guesses. crack it to reach the next level (longer code, more digits).</p>
        <p className="dim mt-1">
          example (3-digit code): secret <b>413</b>, you guess <b>143</b> -&gt; the 3 is in the right
          place (+), the 1 and the 4 exist but sit in the wrong places (- -), so feedback is
          <b> +- -</b> shown as &quot;+--&quot;.
        </p>
        <p className="dim">order of the marks does not matter: count the + first, then the -, then the dots.</p>
      </div>

      <Stats
        items={[
          ["level", round?.level ?? 1],
          ["code length", round?.len ?? "-"],
          ["digits used", round ? `0-${round.digits - 1}` : "-"],
          ["guesses", round ? `${round.rows.length}/${round.tries}` : "-"],
          ["best", best],
        ]}
      />

      {!round ? (
        <button className="btn mt-4" onClick={() => begin(1)}>start</button>
      ) : (
        <div className="box mt-4">
          <p className="dim text-sm">
            guesses so far (code stays the same all level):
          </p>
          <pre className="screen mt-2" style={{ lineHeight: 1.7 }}>
            {"  #   GUESS     FEEDBACK\n"}
            {round.rows.length
              ? round.rows
                  .map(
                    (r, i) =>
                      `  ${String(i + 1).padStart(2)}  ${r.g.split("").join(" ")}      ${"+".repeat(r.exact) || ""}${"-".repeat(r.near) || ""}${".".repeat(round.len - r.exact - r.near)}`,
                  )
                  .join("\n")
              : "  --  (none yet)"}
          </pre>

          {round.status === "play" && (
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <input
                ref={inp}
                className="inp w-44 text-xl tracking-[0.4em]"
                inputMode="numeric"
                value={guess}
                maxLength={round.len}
                onChange={(e) => {
                  const max = round.digits - 1;
                  setGuess(e.target.value.replace(new RegExp(`[^0-${max > 9 ? 9 : max}]`, "g"), "").slice(0, round.len));
                }}
              />
              <button className="btn" disabled={guess.length !== round.len}>
                guess
              </button>
              <button type="button" className="btn" onClick={() => setGuess("")}>clear</button>
              <span className="dim self-center text-xs">
                {guess.length}/{round.len} digits
              </span>
            </form>
          )}
        </div>
      )}

      {round?.status === "won" && (
        <Banner
          title={`cracked in ${round.rows.length}/${round.tries}`}
          lines={[`the code was ${round.secret}`, `next level: ${config(round.level + 1).len} digits from 0-${config(round.level + 1).digits - 1}, new code`]}
          action="next level"
          onAction={() => begin(round.level + 1, round.secret)}
        />
      )}
      {round?.status === "lost" && (
        <Banner
          title="locked out"
          lines={[`the code was ${round.secret}`, "same level again, but a NEW code is generated."]}
          action="retry level"
          onAction={() => begin(round.level)}
        />
      )}
      {round && (
        <div className="mt-3 flex gap-2">
          <button className="btn" onClick={() => begin(1)}>restart from level 1</button>
          <button className="btn" onClick={() => setShowHelp((s) => !s)}>{showHelp ? "hide" : "show"} legend</button>
        </div>
      )}
      {showHelp && round && (
        <p className="dim mt-2 text-xs">
          legend: + exact place · - wrong place · . not in code · digits allowed: 0-{round.digits - 1}
        </p>
      )}
    </Shell>
  );
}
