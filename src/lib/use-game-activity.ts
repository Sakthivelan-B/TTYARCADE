"use client";
import { useEffect } from "react";
import { GAMES } from "./games";
// Actual game input, not a background tab/presence poll, counts as play.
export function useGameActivity(game: string | null) {
  useEffect(() => {
    if (!GAMES.some(g => g.id === game)) return;
    let lastSent = 0;
    const record = (event: Event) => {
      if ((!event.isTrusted && event.type !== "ttyarcade-game-input") || document.hidden) return;
      const target = event.target as HTMLElement | null;
      if (event.type === "pointerdown" && !target?.closest("[data-gameplay]")) return;
      if (event instanceof KeyboardEvent && (event.repeat || event.ctrlKey || event.metaKey || target?.closest("header, [data-terminal-header]"))) return;
      if (Date.now() - lastSent < 60_000) return;
      lastSent = Date.now();
      void fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({game}), signal: AbortSignal.timeout(8000) }).catch(() => { lastSent = 0; });
    };
    window.addEventListener("ttyarcade-game-input", record);
    window.addEventListener("pointerdown", record, { passive: true });
    window.addEventListener("keydown", record, { passive: true });
    return () => { window.removeEventListener("ttyarcade-game-input", record); window.removeEventListener("pointerdown", record); window.removeEventListener("keydown", record); };
  }, [game]);
}
