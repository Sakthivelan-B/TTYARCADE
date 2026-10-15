"use client";
// Text-only playing card. Red suits use OUTLINED glyphs (♡ ♢), black suits
// use FILLED glyphs (♣ ♠) so they are distinguishable without color.
import { getRank, getSuit, rankLabel } from "@/lib/cards";

export const SUIT_TEXT: Record<string, string> = { H: "♡", D: "♢", C: "♣", S: "♠" };

export function PlayingCard({
  card,
  onClick,
  playable = false,
  big = false,
}: {
  card: string;
  onClick?: () => void;
  playable?: boolean;
  big?: boolean;
}) {
  const r = rankLabel(getRank(card));
  const s = SUIT_TEXT[getSuit(card)] ?? "?";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`cell ${playable ? "" : "soft"}`}
      style={{
        width: big ? 72 : 52,
        height: big ? 100 : 72,
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 4,
        borderStyle: playable ? "double" : "solid",
        borderWidth: playable ? 3 : 1,
        borderColor: playable ? "var(--fg)" : "var(--dim)",
        cursor: onClick ? "pointer" : "default",
      }}
      title={`${r}${s}`}
    >
      <span className="self-start text-xs leading-none">{r}{s}</span>
      <span className={big ? "text-3xl" : "text-xl"}>{s}</span>
      <span className="self-end rotate-180 text-xs leading-none">{r}{s}</span>
    </button>
  );
}

export function CardBack({ label }: { label?: string }) {
  return (
    <div
      className="cell"
      style={{ width: 52, height: 72, cursor: "default", fontSize: 11, lineHeight: 1 }}
    >
      <pre className="screen" style={{ fontSize: 10 }}>{label ?? "/\\/\\\n\\/\\/\n/\\/\\"}</pre>
    </div>
  );
}
