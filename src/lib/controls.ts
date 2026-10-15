"use client";
import { storage } from "@/lib/storage";
// Remappable controls + gamepad (joystick) support.
// Every direction-driven game reads its keys through useControls() so a user
// can bind whatever they like (arrows, WASD, numpad, a USB/Bluetooth pad...).
import { useCallback, useEffect, useRef, useState } from "react";

export type Dir = "U" | "D" | "L" | "R";
export type Act = "OK" | "FLAG";
export type ControlMap = Record<Dir | Act, string>;

export const DEFAULT_CONTROLS: ControlMap = {
  U: "ArrowUp",
  D: "ArrowDown",
  L: "ArrowLeft",
  R: "ArrowRight",
  OK: "Enter",
  FLAG: "f",
};
// WASD is always accepted as a secondary binding (cannot be unbound).
const ALT: Record<string, Dir> = { w: "U", s: "D", a: "L", d: "R" };

const KEY = "ttyarcade-controls";

export function loadControls(): ControlMap {
  if (typeof window === "undefined") return DEFAULT_CONTROLS;
  try {
    const raw = JSON.parse(storage.getItem(KEY) || "{}") as Partial<ControlMap>;
    const result = { ...DEFAULT_CONTROLS };
    for (const action of Object.keys(result) as (Dir | Act)[]) {
      if (typeof raw?.[action] === "string" && raw[action]!.length > 0) result[action] = raw[action]!;
    }
    return result;
  } catch {
    return DEFAULT_CONTROLS;
  }
}

export function saveControls(m: ControlMap) {
  storage.setItem(KEY, JSON.stringify(m));
  window.dispatchEvent(new Event("ttyarcade-controls"));
}

const norm = (k: string) => k === "Space" ? " " : (k.length === 1 ? k.toLowerCase() : k);

/**
 * useControls(onDir, onAction?)
 * - keyboard using the user's map (+ WASD fallback)
 * - gamepad: d-pad/stick -> directions, button 0 -> OK, button 1 -> FLAG
 * Returns the current map, pad name, and helpers for the settings UI.
 */
export function useControls(onDir: (d: Dir) => void, onAction?: (a: Act) => void) {
  const [map, setMap] = useState<ControlMap>(DEFAULT_CONTROLS);
  const [pad, setPad] = useState<string | null>(null);
  const dirRef = useRef(onDir);
  const actRef = useRef(onAction);
  const mapRef = useRef(map);
  useEffect(() => { dirRef.current = onDir; actRef.current = onAction; mapRef.current = map; }, [onDir, onAction, map]);

  useEffect(() => {
    setMap(loadControls());
    const sync = () => setMap(loadControls());
    window.addEventListener("ttyarcade-controls", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ttyarcade-controls", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    function down(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || (t && (t.closest("input, textarea, select, [contenteditable]")))) return;
      const k = norm(e.key);
      const m = mapRef.current;
      const dir = (Object.keys(m) as (Dir | Act)[]).find((a) => norm(m[a]) === k);
      if (dir === "OK" || dir === "FLAG") {
        if (actRef.current) { e.preventDefault(); if (!e.repeat) actRef.current(dir); }
        return;
      }
      if (dir) { e.preventDefault(); dirRef.current(dir as Dir); return; }
      const alt = ALT[k];
      if (alt) { e.preventDefault(); dirRef.current(alt); }
    }
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  // gamepad polling
  const prev = useRef<Record<string, boolean>>({});
  useEffect(() => {
    let raf = 0;
    let lastPad: string | null = null;
    const loop = () => {
      let pads: (Gamepad | null)[] = [];
      try { pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : []; } catch { /* gamepad policy unavailable: keyboard/touch still work */ }
      const p = Array.from(pads).find((x) => x && x.connected) ?? null;
      const nextPad = p ? (p.id || "gamepad").slice(0, 32) : null;
      if (nextPad !== lastPad) { lastPad = nextPad; setPad(nextPad); }
      if (!p || document.hidden) prev.current = {};
      if (p && !document.hidden) {
        const fire = (id: string, now: boolean, fn: () => void) => {
          if (now && !prev.current[id]) { window.dispatchEvent(new Event("ttyarcade-game-input")); fn(); }
          prev.current[id] = now;
        };
        const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0;
        const b = (i: number) => !!p.buttons[i]?.pressed;
        fire("L", b(14) || ax < -0.5, () => dirRef.current("L"));
        fire("R", b(15) || ax > 0.5, () => dirRef.current("R"));
        fire("U", b(12) || ay < -0.5, () => dirRef.current("U"));
        fire("D", b(13) || ay > 0.5, () => dirRef.current("D"));
        fire("OK", b(0), () => actRef.current?.("OK"));
        fire("FLAG", b(1), () => actRef.current?.("FLAG"));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const bind = useCallback((a: Dir | Act, key: string) => {
    const next = { ...map, [a]: key };
    saveControls(next);
    setMap(next);
  }, [map]);
  const reset = useCallback(() => {
    saveControls(DEFAULT_CONTROLS);
    setMap(DEFAULT_CONTROLS);
  }, []);

  return { map, bind, reset, pad };
}

/** For games that want the raw map without listeners (e.g. settings display). */
export function keyLabel(k: string) {
  return k.startsWith("Arrow") ? k.slice(5) : k.length === 1 ? k.toUpperCase() : k;
}
