"use client";
import { useEffect, useRef, useState } from "react";
import { Shell, Stats, Banner } from "@/components/term";
import { freshPattern, randInt, useBest, submitScore } from "@/lib/levels";

function makeNumber(len: number) {
  return freshPattern("numbers", () => {
    let s = String(1 + randInt(9));
    while (s.length < len) s += String(randInt(10));
    return s;
  }, (s) => s);
}

export default function NumberMemory() {
  const [level, setLevel] = useState(1);
  const [num, setNum] = useState("");
  const [phase, setPhase] = useState<"idle" | "show" | "input" | "over">("idle");
  const [answer, setAnswer] = useState("");
  const [left, setLeft] = useState(0);
  const [best, report] = useBest("numbers");
  const t = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function start(l: number) {
    const len = l + 2;
    setNum(makeNumber(len));
    setAnswer("");
    setPhase("show");
    const ms = 1000 + len * 450;
    const end = Date.now() + ms;
    setLeft(ms);
    if (t.current) clearInterval(t.current);
    t.current = setInterval(() => {
      const r = end - Date.now();
      if (r <= 0) {
        clearInterval(t.current!);
        setPhase("input");
        setTimeout(() => inputRef.current?.focus(), 30);
      }
      setLeft(Math.max(0, r));
    }, 50);
  }
  useEffect(() => () => { if (t.current) clearInterval(t.current); }, []);

  function submit() {
    if (answer.trim() === num) {
      report(level);
      const nl = level + 1;
      setLevel(nl);
      start(nl);
    } else {
      setPhase("over");
      submitScore("numbers", level - 1, { digits: num.length });
    }
  }

  const total = 1000 + num.length * 450;
  const bar = num ? Math.round((left / total) * 30) : 0;

  return (
    <Shell path="/games/numbers" title="number memory" help="a fresh random number appears. memorize it, then type it back. +1 digit each level.">
      <Stats items={[["level", level], ["digits", level + 2], ["best", best]]} />
      {phase === "idle" && <button className="btn mt-4" onClick={() => { setLevel(1); start(1); }}>start</button>}
      {phase === "show" && (
        <div className="box mt-4 text-center">
          <p className="break-all text-4xl font-bold tracking-[0.25em]">{num}</p>
          <p className="mt-2 text-sm">[{"#".repeat(bar)}{".".repeat(30 - bar)}]</p>
        </div>
      )}
      {phase === "input" && (
        <form className="box mt-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <p className="dim text-sm">what was the number?</p>
          <div className="mt-2 flex gap-2">
            <input
              ref={inputRef}
              className="inp flex-1 text-2xl tracking-[0.2em]"
              inputMode="numeric"
              value={answer}
              onChange={(e) => setAnswer(e.target.value.replace(/\D/g, ""))}
            />
            <button className="btn">enter</button>
          </div>
        </form>
      )}
      {phase === "over" && (
        <Banner
          title="wrong"
          lines={[`number: ${num}`, `yours : ${answer || "(empty)"}`, `score : ${level - 1}`]}
          action="play again"
          onAction={() => { setLevel(1); start(1); }}
        />
      )}
    </Shell>
  );
}
