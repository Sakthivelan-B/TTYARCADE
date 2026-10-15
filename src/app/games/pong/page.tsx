"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Shell, Stats, Banner } from "@/components/term";
import { submitScore } from "@/lib/levels";
import { useControls, type Dir } from "@/lib/controls";

const W = 48, H = 16, PH = 4, WIN = 7;

type G = { py: number; cy: number; bx: number; by: number; vx: number; vy: number; ps: number; cs: number };

const init = (): G => ({ py: H / 2 - PH / 2, cy: H / 2 - PH / 2, bx: W / 2, by: H / 2, vx: 0.6, vy: 0.3, ps: 0, cs: 0 });

export default function Pong() {
  const g = useRef<G>(init());
  const keys = useRef({ up: false, down: false });
  const [, tick] = useState(0);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState<string | null>(null);

  // remappable keys + joystick: each press nudges the paddle (hold buttons on
  // screen still work for touch, they use keys.current)
  const nudge = useCallback((d: Dir) => {
    const s = g.current;
    if (d === "U") s.py = Math.max(0, s.py - 3.4);
    if (d === "D") s.py = Math.min(H - PH, s.py + 3.4);
  }, []);
  useControls(nudge);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const s = g.current;
      if (keys.current.up) s.py = Math.max(0, s.py - 0.8);
      if (keys.current.down) s.py = Math.min(H - PH, s.py + 0.8);
      // cpu: follows ball with capped speed (gets slightly faster as it loses)
      const cpuSpeed = 0.32 + s.ps * 0.03;
      const target = s.by - PH / 2;
      s.cy += Math.max(-cpuSpeed, Math.min(cpuSpeed, target - s.cy));
      s.cy = Math.max(0, Math.min(H - PH, s.cy));
      s.bx += s.vx;
      s.by += s.vy;
      if (s.by < 0) { s.by = 0; s.vy *= -1; }
      if (s.by > H - 1) { s.by = H - 1; s.vy *= -1; }
      if (s.bx <= 1.5 && s.vx < 0 && s.by >= s.py - 0.5 && s.by <= s.py + PH) {
        s.vx = Math.min(1.4, -s.vx * 1.06);
        s.vy = (s.by - (s.py + PH / 2)) * 0.25;
      }
      if (s.bx >= W - 2.5 && s.vx > 0 && s.by >= s.cy - 0.5 && s.by <= s.cy + PH) {
        s.vx = Math.max(-1.4, -s.vx * 1.06);
        s.vy = (s.by - (s.cy + PH / 2)) * 0.25;
      }
      if (s.bx < 0 || s.bx > W) {
        if (s.bx < 0) s.cs++; else s.ps++;
        const dir = s.bx < 0 ? 1 : -1;
        Object.assign(s, { bx: W / 2, by: H / 2, vx: 0.6 * dir, vy: (Math.random() - 0.5) * 0.8 });
        if (s.ps >= WIN || s.cs >= WIN) {
          setRunning(false);
          setOver(s.ps >= WIN ? "you win" : "cpu wins");
          if (s.ps >= WIN) submitScore("pong", s.ps - s.cs);
        }
      }
      tick((x) => x + 1);
    }, 40);
    return () => clearInterval(t);
  }, [running]);

  const s = g.current;
  const rows: string[] = ["+" + "-".repeat(W) + "+"];
  for (let y = 0; y < H; y++) {
    let r = "|";
    for (let x = 0; x < W; x++) {
      if (x === 1 && y >= Math.round(s.py) && y < Math.round(s.py) + PH) r += "█";
      else if (x === W - 2 && y >= Math.round(s.cy) && y < Math.round(s.cy) + PH) r += "█";
      else if (x === Math.round(s.bx) && y === Math.round(s.by)) r += "O";
      else if (x === W / 2) r += y % 2 ? " " : ":";
      else r += " ";
    }
    rows.push(r + "|");
  }
  rows.push("+" + "-".repeat(W) + "+");

  const hold = (k: "up" | "down", v: boolean) => () => { keys.current[k] = v; };

  return (
    <Shell path="/games/pong" title="pong" help={`↑/↓ or W/S. first to ${WIN}. on touch, hold the buttons.`}>
      <Stats items={[["you", s.ps], ["cpu", s.cs]]} />
      <div className="mt-3 max-w-full overflow-x-auto">
        <pre className="screen" style={{ fontSize: 15, lineHeight: 1 }}>{rows.join("\n")}</pre>
      </div>
      <div className="mt-2 flex gap-2">
        {!running && <button className="btn" onClick={() => { g.current = init(); setOver(null); setRunning(true); }}>{over ? "rematch" : "start"}</button>}
        <button className="btn" onPointerDown={hold("up", true)} onPointerUp={hold("up", false)} onPointerLeave={hold("up", false)}>^ up</button>
        <button className="btn" onPointerDown={hold("down", true)} onPointerUp={hold("down", false)} onPointerLeave={hold("down", false)}>v down</button>
      </div>
      {over && <Banner title={over} lines={[`${s.ps} - ${s.cs}`]} />}
    </Shell>
  );
}
