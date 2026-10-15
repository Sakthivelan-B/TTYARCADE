"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { usePlayerName } from "@/lib/player";

export function ThemeSwitch() {
  return <span className="dim">theme: terminal</span>;
}

function NameEdit() {
  const [name, setName] = usePlayerName();
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState("");
  if (edit) {
    return (
      <form
        className="inline-flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          setName(val.trim().slice(0, 20) || "guest");
          setEdit(false);
        }}
      >
        <input
          autoFocus
          className="inp"
          style={{ width: 120, padding: "0 6px" }}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          maxLength={20}
        />
        <button className="btn" style={{ padding: "0 6px" }}>
          ok
        </button>
      </form>
    );
  }
  return (
    <button
      className="btn"
      style={{ padding: "0 6px" }}
      onClick={() => {
        setVal(name);
        setEdit(true);
      }}
      title="change player name"
    >
      user:{name}
    </button>
  );
}

/** Terminal-style page wrapper used by every page. */
export function Shell({
  path,
  title,
  help,
  children,
  back = "/",
  wide = false,
}: {
  path: string;
  title?: string;
  help?: string;
  children: ReactNode;
  back?: string | null;
  wide?: boolean;
}) {
  return (
    <main className={`mx-auto px-4 py-5 ${wide ? "max-w-5xl" : "max-w-3xl"}`}>
      <div
        className="flex flex-wrap items-center justify-between gap-2 pb-2"
        style={{ borderBottom: "1px solid var(--fg)" }}
      >
        <div className="flex items-center gap-3">
          {back !== null && (
            <Link href={back} className="btn" style={{ padding: "0 6px" }}>
              cd ..
            </Link>
          )}
          <span>
            guest@ttyarcade:<b>~{path}</b>$<span className="blink">_</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <NameEdit />
          <ThemeSwitch />
        </div>
      </div>
      {title && (
        <h1 className="mt-4 text-xl font-bold uppercase tracking-widest">
          # {title}
        </h1>
      )}
      {help && <p className="dim mt-1 text-sm">{help}</p>}
      <div className="mt-4">{children}</div>
    </main>
  );
}

export function Stats({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {items.map(([k, v]) => (
        <span key={k}>
          <span className="dim">{k}=</span>
          <b>{v}</b>
        </span>
      ))}
    </div>
  );
}

/** Lives as text: [###--] */
export function lifeBar(lives: number, max: number) {
  return `[${"#".repeat(Math.max(0, lives))}${"-".repeat(Math.max(0, max - lives))}]`;
}

/** Message banner, e.g. game over / level clear */
export function Banner({
  title,
  lines = [],
  action,
  onAction,
}: {
  title: string;
  lines?: string[];
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="box mt-4">
      <p className="font-bold">&gt;&gt; {title}</p>
      {lines.map((l) => (
        <p key={l} className="dim">
          {l}
        </p>
      ))}
      {action && onAction && (
        <button className="btn mt-2" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

/** On-screen direction pad for touch devices */
export function Pad({ onDir }: { onDir: (d: "U" | "D" | "L" | "R") => void }) {
  return (
    <div className="mt-3 grid w-40 grid-cols-3 gap-1 text-center">
      <span />
      <button className="btn" onClick={() => onDir("U")}>^</button>
      <span />
      <button className="btn" onClick={() => onDir("L")}>&lt;</button>
      <button className="btn" onClick={() => onDir("D")}>v</button>
      <button className="btn" onClick={() => onDir("R")}>&gt;</button>
    </div>
  );
}

/** Map keyboard event to a direction (arrows + WASD) */
export function keyDir(e: KeyboardEvent): "U" | "D" | "L" | "R" | null {
  const k = e.key.toLowerCase();
  if (k === "arrowup" || k === "w") return "U";
  if (k === "arrowdown" || k === "s") return "D";
  if (k === "arrowleft" || k === "a") return "L";
  if (k === "arrowright" || k === "d") return "R";
  return null;
}
