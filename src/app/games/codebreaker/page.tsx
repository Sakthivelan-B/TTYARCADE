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
  const [message, setMessage] = useState("");
  // Synchronous round ownership also guards duplicate events before React renders.
  const currentRound = useRef<Round | null>(null);
  const [best, report] = useBest("codebreaker");
  const [showHelp, setShowHelp] = useState(true);
  const inp = useRef<HTMLInputElement>(null);

  function begin(level: number, prevSecret?: string) {
    const next = newRound(level, prevSecret);
    currentRound.current = next;
    setRound(next);
    setGuess("");
    setMessage("");
    setTimeout(() => inp.current?.focus(), 30);
  }

  function submit() {
    const current = currentRound.current;
    if (!current || current.status !== "play") return;
    if (!new RegExp(`^[0-${current.digits - 1}]{${current.len}}$`).test(guess)) {
      setMessage(`Enter exactly ${current.len} digits from 0-${current.digits - 1}. Repeated digits are allowed.`);
      return;
    }
    if (current.rows.some(row => row.g === guess)) {
      setMessage("You already tried that guess. Check its feedback below; no attempt was used.");
      inp.current?.focus();
      return;
    }
    const row = { g: guess, ...score(current.secret, guess) };
    const rows = [...current.rows, row];
    const won = row.exact === current.len;
    const lost = !won && rows.length >= current.tries;
    // Keep the original secret. Only begin() ever generates another code.
    const next: Round = { ...current, rows, status: won ? "won" : lost ? "lost" : "play" };
    currentRound.current = next;
    setRound(next);
    setGuess("");
    setMessage("");
    if (won) {
      report(current.level);
      submitScore("codebreaker", current.level, { tries: rows.length }, name);
    } else if (lost) {
      submitScore("codebreaker", current.level - 1, {}, name);
    }
    inp.current?.focus();
  }

  // enter key submits from anywhere on the page
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.isComposing || (e.target as HTMLElement)?.closest("button")) return;
      if ((e.target as HTMLElement)?.closest("[data-terminal-header]")) return;
      if (e.key === "Enter" && round?.status === "play" && guess.length === round.len) { e.preventDefault(); submit(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <Shell path="/games/codebreaker" title="code breaker" help="crack the hidden code. one fixed code per round. keep using earlier feedback; only retry, next level or restart creates a new code.">
      <details className="box-dashed text-sm"><summary className="cursor-pointer">full rules and examples</summary>
        <p className="font-bold">how to play</p>
        <p>1. the computer picks ONE secret code. repeated digits and leading zeros ARE allowed (for example, 242 or 004).</p>
        <p>2. type a guess of the same length and press enter. only the input box clears; the secret and previous guesses stay unchanged.</p>
        <p>3. feedback: <b>+</b> = right digit in the right place, <b>-</b> = right digit in the wrong place, <b>.</b> = an unmatched digit occurrence (including an extra copy).</p>
        <p>4. you get {round?.tries ?? 10} guesses. crack it to reach the next level (longer code, more digits).</p>
        <p className="dim mt-1">
          example (3-digit code): secret <b>413</b>, you guess <b>143</b> -&gt; the 3 is in the right
          place (+), the 1 and the 4 exist but sit in the wrong places (- -), so feedback is
          <b> +- -</b> shown as &quot;+--&quot;.
        </p>
        <p className="dim">marks are GROUPED COUNTS, not aligned with your digit positions. A + at the start does NOT mean your first digit is correct.</p>
        <p className="dim">repeats example: secret <b>242</b>, guess <b>222</b> gives <b>++.</b>: two exact matches and one extra 2. Keep all earlier rows to narrow down the same code.</p>
      </details>

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
            guess history - one unchanged secret for this round:
          </p>
          <pre className="screen mt-2" style={{ lineHeight: 1.7 }}>
            {"  #   GUESS         MARKS   EXACT  WRONG-PLACE  ABSENT\n"}
            {round.rows.length
              ? round.rows
                  .map(
                    (r, i) =>
                      `  ${String(i + 1).padStart(2)}  ${r.g.split("").join(" ").padEnd(13)} ${("+".repeat(r.exact) + "-".repeat(r.near) + ".".repeat(round.len - r.exact - r.near)).padEnd(7)} ${String(r.exact).padStart(3)} ${String(r.near).padStart(10)} ${String(round.len - r.exact - r.near).padStart(8)}`,
                  )
                  .join("\n")
              : "  --  (none yet)"}
          </pre>
          <p className="dim mt-2 text-xs">EXACT = correct position; WRONG-PLACE = correct digit elsewhere; ABSENT = unmatched occurrence. Counts always add up to the code length.</p>
          {message && <p className="mt-2 text-sm" role="status">{message}</p>}

          {round.status === "play" && (
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <input
                aria-label="code guess"
                autoComplete="off"
                ref={inp}
                className="inp w-44 text-xl tracking-[0.4em]"
                inputMode="numeric"
                value={guess}
                maxLength={round.len}
                onChange={(e) => {
                  const max = round.digits - 1;
                  setMessage("");
                  setGuess(e.target.value.replace(new RegExp(`[^0-${max > 9 ? 9 : max}]`, "g"), "").slice(0, round.len));
                }}
              />
              <button className="btn" disabled={guess.length !== round.len}>
                guess
              </button>
              <button type="button" className="btn" onClick={() => { setGuess(""); setMessage(""); inp.current?.focus(); }}>clear</button>
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
          onAction={() => begin(round.level, round.secret)}
        />
      )}
      {round && (
        <div className="mt-3 flex gap-2">
          <button className="btn" onClick={() => begin(1, round.secret)}>restart from level 1</button>
          <button className="btn" onClick={() => setShowHelp((s) => !s)}>{showHelp ? "hide" : "show"} legend</button>
        </div>
      )}
      {showHelp && round && (
        <p className="dim mt-2 text-xs">
          legend: + exact place · - wrong place · . unmatched/extra digit · repeats allowed · grouped counts, not positions · digits allowed: 0-{round.digits - 1}
        </p>
      )}
    </Shell>
  );
}
