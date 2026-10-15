"use client";
import { useEffect, useRef, useState } from "react";
import { Shell, Stats, Banner } from "@/components/term";
import { freshPattern, randInt, useBest, submitScore } from "@/lib/levels";

const ALL_KEYS = ["A", "S", "D", "F", "J", "K", "L", "E", "I"];

function keyCount(level: number) {
  return Math.min(4 + Math.floor((level - 1) / 3), ALL_KEYS.length);
}

export default function KeySequence() {
  const [level, setLevel] = useState(1);
  const [seq, setSeq] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "show" | "input" | "over">("idle");
  const [best, report] = useBest("sequence");
  const cancel = useRef(false);

  const keys = ALL_KEYS.slice(0, keyCount(level));

  async function start(l: number) {
    const k = keyCount(l);
    const len = l + 2;
    const s = freshPattern("sequence", () => Array.from({ length: len }, () => randInt(k)), (a) => a.join(""));
    setSeq(s);
    setPos(0);
    setPhase("show");
    cancel.current = false;
    const speed = Math.max(220, 600 - l * 25);
    await new Promise((r) => setTimeout(r, 500));
    for (const i of s) {
      if (cancel.current) return;
      setLit(i);
      await new Promise((r) => setTimeout(r, speed));
      setLit(null);
      await new Promise((r) => setTimeout(r, 120));
    }
    setPhase("input");
  }

  useEffect(() => () => { cancel.current = true; }, []);

  function press(i: number) {
    if (phase !== "input") return;
    setLit(i);
    setTimeout(() => setLit(null), 150);
    if (seq[pos] !== i) {
      setPhase("over");
      report(level - 1);
      submitScore("sequence", level - 1, { length: seq.length });
      return;
    }
    if (pos + 1 === seq.length) {
      report(level);
      const nl = level + 1;
      setLevel(nl);
      setPhase("show");
      setTimeout(() => start(nl), 400);
    } else setPos(pos + 1);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const i = keys.indexOf(e.key.toUpperCase());
      if (i >= 0) press(i);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <Shell path="/games/sequence" title="key sequence" help="watch the keys light up, then repeat them (click or type). every level = a completely new sequence.">
      <Stats items={[["level", level], ["length", level + 2], ["keys", keys.length], ["best", best]]} />
      {phase === "idle" ? (
        <button className="btn mt-4" onClick={() => { setLevel(1); start(1); }}>start</button>
      ) : (
        <>
          <p className="mt-3 text-sm">
            {phase === "show" && "> watch..."}
            {phase === "input" && `> your turn ${pos}/${seq.length}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {keys.map((k, i) => (
              <button
                key={k}
                className={`cell text-2xl font-bold ${lit === i ? "on" : ""}`}
                style={{ width: 64, height: 64 }}
                onClick={() => press(i)}
                disabled={phase !== "input"}
              >
                {k}
              </button>
            ))}
          </div>
        </>
      )}
      {phase === "over" && (
        <Banner
          title="wrong key"
          lines={[`sequence was: ${seq.map((i) => ALL_KEYS[i]).join(" ")}`, `score: ${level - 1}`]}
          action="play again"
          onAction={() => { setLevel(1); start(1); }}
        />
      )}
    </Shell>
  );
}
