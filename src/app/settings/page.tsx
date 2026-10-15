"use client";
import { storage } from "@/lib/storage";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/term";
import { DEFAULT_CONTROLS, keyLabel, loadControls, saveControls, type Act, type ControlMap, type Dir } from "@/lib/controls";
import { usePlayerName } from "@/lib/player";

const ACTIONS: (Dir | Act)[] = ["U", "D", "L", "R", "OK", "FLAG"];
const LABEL: Record<string, string> = {
  U: "up", D: "down", L: "left", R: "right", OK: "confirm / submit", FLAG: "flag / secondary",
};

export default function Settings() {
  const [name, setName] = usePlayerName();
  const [map, setMap] = useState<ControlMap>(DEFAULT_CONTROLS);
  const [binding, setBinding] = useState<Dir | Act | null>(null);
  const [pad, setPad] = useState<string | null>(null);
  const [test, setTest] = useState<string[]>([]);

  useEffect(() => {
    setMap(loadControls());
    let raf = 0;
    let lastPad: string | null = null;
    const loop = () => {
      let pads: (Gamepad | null)[] = [];
      try { pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : []; } catch { /* gamepad policy unavailable: keyboard/touch still work */ }
      const p = Array.from(pads).find((x) => x && x.connected);
      const nextPad = p ? (p.id || "gamepad").slice(0, 40) : null;
      if (nextPad !== lastPad) { lastPad = nextPad; setPad(nextPad); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // capture the next key press for the binding being edited
  useEffect(() => {
    if (!binding) return;
    function onKey(e: KeyboardEvent) {
      e.preventDefault();
      const key = e.key;
      const next: ControlMap = { ...map, [binding as Dir | Act]: key };
      setMap(next);
      saveControls(next);
      setTest((t) => [`${LABEL[binding!]} -> ${keyLabel(key)}`, ...t].slice(0, 6));
      setBinding(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [binding, map]);

  function wipe(kind: "best" | "seen" | "all") {
    const keys = storage.keys().filter((k) =>
      kind === "all" ? k.startsWith("ttyarcade-") : kind === "best" ? k.startsWith("ttyarcade-best:") : k.startsWith("ttyarcade-seen:"),
    );
    keys.forEach((k) => storage.removeItem(k));
    setTest((t) => [`cleared ${keys.length} ${kind} entries`, ...t].slice(0, 6));
  }

  return (
    <Shell path="/settings" title="settings" help="name, theme and controls. everything is stored in this browser only.">
      <div className="box">
        <p className="font-bold">player</p>
        <p className="mt-2 text-sm">
          display name (used in rooms and on the leaderboard):{" "}
          <input className="inp w-48" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
        </p>
        <p className="dim mt-1 text-xs">
          want your scores saved on the server and a rank? <Link href="/login" className="underline">create an account / log in</Link>.
        </p>
      </div>

      <div className="box mt-4">
        <p>theme: terminal (white text on pure black; no automatic switching)</p>
      </div>

      <div className="box mt-4">
        <p className="font-bold">controls</p>
        <p className="dim text-sm">
          click an action, then press the key you want. WASD always works as a second binding.
          A joystick/gamepad works without any setup: d-pad or left stick moves, button 0 = confirm, button 1 = flag.
        </p>
        <pre className="screen mt-3" style={{ lineHeight: 1.8 }}>
          {ACTIONS.map((a) =>
            `  ${LABEL[a].padEnd(18)} [ ${keyLabel(map[a]).padEnd(10)} ]  ${binding === a ? "<- press a key now" : ""}`,
          ).join("\n")}
        </pre>
        <div className="mt-2 flex flex-wrap gap-2">
          {ACTIONS.map((a) => (
            <button key={a} className={`btn ${binding === a ? "on" : ""}`} onClick={() => setBinding(a)}>
              set {LABEL[a]}
            </button>
          ))}
          <button className="btn" onClick={() => { saveControls(DEFAULT_CONTROLS); setMap(DEFAULT_CONTROLS); }}>
            reset to arrows
          </button>
        </div>
        <p className="mt-3 text-sm">joystick: {pad ? <b>{pad}</b> : <span className="dim">none connected</span>}</p>
        {test.length > 0 && (
          <div className="box-dashed mt-2 text-xs">
            {test.map((t, i) => <p key={i}>&gt; {t}</p>)}
          </div>
        )}
      </div>

      <div className="box mt-4">
        <p className="font-bold">local data</p>
        <p className="dim text-sm">
          best scores and the list of already-seen level patterns live in this browser. Clearing patterns lets the
          level generator reuse them again.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn" onClick={() => wipe("best")}>clear best scores</button>
          <button className="btn" onClick={() => wipe("seen")}>clear seen patterns</button>
          <button className="btn" onClick={() => wipe("all")}>clear all ttyarcade data</button>
        </div>
      </div>
    </Shell>
  );
}
