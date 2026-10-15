"use client";
import { useRef, useState } from "react";
import { Shell, Stats, Banner, lifeBar } from "@/components/term";
import { freshPattern, pick, shuffle, useBest, submitScore } from "@/lib/levels";
import { wordsOfLength } from "@/lib/words";

const MAX_LIVES = 3;

function makeWord(level: number) {
  const len = Math.min(3 + Math.floor((level - 1) / 2), 9);
  const word = freshPattern("scramble", () => pick(wordsOfLength(len)), (w) => w, 120);
  let mixed = word;
  for (let i = 0; i < 20 && mixed === word; i++) mixed = shuffle(word.split("")).join("");
  return { word, mixed };
}

export default function WordScramble() {
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(MAX_LIVES);
  const [cur, setCur] = useState<{ word: string; mixed: string } | null>(null);
  const [guess, setGuess] = useState("");
  const [hint, setHint] = useState(0);
  const [msg, setMsg] = useState("");
  const [over, setOver] = useState(false);
  const [best, report] = useBest("scramble");
  const inputRef = useRef<HTMLInputElement>(null);

  function next(l: number) {
    setCur(makeWord(l));
    setGuess("");
    setHint(0);
    setTimeout(() => inputRef.current?.focus(), 30);
  }

  function newGame() {
    setLevel(1);
    setLives(MAX_LIVES);
    setOver(false);
    setMsg("");
    next(1);
  }

  function lose(reason: string) {
    const left = lives - 1;
    setLives(left);
    setMsg(`${reason} - answer was "${cur?.word}"`);
    if (left <= 0) {
      setOver(true);
      report(level - 1);
      submitScore("scramble", level - 1);
    } else next(level);
  }

  function submit() {
    if (!cur) return;
    if (guess.trim().toLowerCase() === cur.word) {
      report(level);
      setMsg(`ok: ${cur.word}`);
      const nl = level + 1;
      setLevel(nl);
      next(nl);
    } else lose("wrong");
  }

  return (
    <Shell path="/games/scramble" title="word scramble" help="unscramble the letters. words get longer as you level up. hints reveal letters from the start.">
      <Stats items={[["level", level], ["lives", lifeBar(lives, MAX_LIVES)], ["best", best]]} />
      {!cur ? (
        <button className="btn mt-4" onClick={newGame}>start</button>
      ) : over ? (
        <Banner title="game over" lines={[msg, `score: ${level - 1}`]} action="play again" onAction={newGame} />
      ) : (
        <form className="box mt-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <p className="text-4xl font-bold uppercase tracking-[0.35em]">{cur.mixed}</p>
          {hint > 0 && <p className="mt-1 dim">hint: {cur.word.slice(0, hint).toUpperCase()}{"_".repeat(cur.word.length - hint)}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <input ref={inputRef} className="inp flex-1 uppercase tracking-widest" value={guess} onChange={(e) => setGuess(e.target.value.replace(/[^a-z]/gi, ""))} maxLength={cur.word.length} />
            <button className="btn">enter</button>
            <button type="button" className="btn" disabled={hint >= cur.word.length - 1} onClick={() => setHint((h) => h + 1)}>hint</button>
            <button type="button" className="btn" onClick={() => lose("skipped")}>skip (-1 life)</button>
          </div>
          {msg && <p className="mt-2 text-sm dim">&gt; {msg}</p>}
        </form>
      )}
    </Shell>
  );
}
