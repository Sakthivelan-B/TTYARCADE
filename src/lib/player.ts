"use client";
import { storage } from "@/lib/storage";
// localStorage-based player name (no accounts).
import { useEffect, useState } from "react";

const KEY = "ttyarcade-player-name";

export function getPlayerName(): string {
  if (typeof window === "undefined") return "guest";
  return storage.getItem(KEY) || "guest";
}

export function setPlayerName(name: string) {
  if (typeof window === "undefined") return;
  storage.setItem(KEY, name);
}

export function usePlayerName() {
  const [name, setName] = useState<string>("guest");
  useEffect(() => {
    setName(getPlayerName());
    const onStorage = () => setName(getPlayerName());
    window.addEventListener("ttyarcade-name", onStorage);
    return () => window.removeEventListener("ttyarcade-name", onStorage);
  }, []);
  return [
    name,
    (n: string) => {
      setPlayerName(n);
      setName(n);
      window.dispatchEvent(new Event("ttyarcade-name"));
    },
  ] as const;
}
