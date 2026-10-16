"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { GAMES, MODE_LABEL, type Mode } from "@/lib/games";
import { packGame, PACK_GAMES } from "@/lib/pack/catalog";
const OLD_CATEGORIES: Record<string, string> = {
  crazy8: "cards",
  matrix: "memory",
  numbers: "memory",
  memory: "memory",
  sequence: "memory",
  scramble: "words",
  odd: "logic",
  maze: "logic",
  slide: "logic",
  lights: "logic",
  math: "numbers",
  codebreaker: "logic",
  typing: "words",
  snake: "arcade",
  minesweeper: "logic",
  tictactoe: "strategy",
  connect4: "strategy",
  "2048": "numbers",
  pong: "arcade",
};
export function GameCatalog() {
  const [q, setQ] = useState(""),
    [mode, setMode] = useState("all"),
    [category, setCategory] = useState("all"),
    [sort, setSort] = useState("installed"),
    [players, setPlayers] = useState("any");
  const games = useMemo(() => {
    const query = q.trim().toLowerCase(),
      terms = query.split(/\s+/).filter(Boolean);
    const list = GAMES.filter((g) => {
      const p = packGame(g.id),
        cat = p?.category ?? OLD_CATEGORIES[g.id] ?? "arcade",
        hay = [g.id, g.name, g.desc, cat, ...g.modes.map((m) => MODE_LABEL[m])]
          .join(" ")
          .toLowerCase();
      return (
        terms.every((t) => hay.includes(t)) &&
        (mode === "all" || g.modes.includes(mode as Mode)) &&
        (category === "all" || cat === category) &&
        (players === "any" ||
          (Number(players) === 1
            ? (mode === "all" &&
                (g.modes.includes("solo") || g.modes.includes("cpu"))) ||
              mode === "solo" ||
              mode === "cpu"
            : mode !== "solo" &&
              mode !== "cpu" &&
              g.maxPlayers >= Number(players) &&
              (mode === "all"
                ? g.modes.includes("local") || g.modes.includes("online")
                : g.modes.includes(mode as Mode))))
      );
    });
    if (sort === "az") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "za") list.sort((a, b) => b.name.localeCompare(a.name));
    if (sort === "players")
      list.sort(
        (a, b) => b.maxPlayers - a.maxPlayers || a.name.localeCompare(b.name),
      );
    if (sort === "new")
      list.sort(
        (a, b) =>
          Number(!!packGame(b.id)) - Number(!!packGame(a.id)) ||
          a.name.localeCompare(b.name),
      );
    return list;
  }, [q, mode, category, sort, players]);
  return (
    <section aria-label="game catalog" className="mt-4">
      <div className="flex flex-wrap gap-3 text-sm">
        <label>
          Search games
          <br />
          <input
            className="inp"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="name, word, card, memory…"
          />
        </label>
        <label>
          Play mode
          <br />
          <select
            className="inp"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="all">all modes</option>
            {Object.entries(MODE_LABEL).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <br />
          <select
            className="inp"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">all categories</option>
            {[
              ...new Set([
                ...Object.values(OLD_CATEGORIES),
                ...PACK_GAMES.map((g) => g.category),
              ]),
            ]
              .sort()
              .map((c) => (
                <option key={c}>{c}</option>
              ))}
          </select>
        </label>
        <label>
          Group size
          <br />
          <select
            className="inp"
            value={players}
            onChange={(e) => setPlayers(e.target.value)}
          >
            <option value="any">any</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "1 (solo / CPU)" : `${n} players`}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <br />
          <select
            className="inp"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="installed">installed order</option>
            <option value="az">name A–Z</option>
            <option value="za">name Z–A</option>
            <option value="players">most players</option>
            <option value="new">new games first</option>
          </select>
        </label>
        <button
          className="btn self-end"
          onClick={() => {
            setQ("");
            setMode("all");
            setCategory("all");
            setPlayers("any");
            setSort("installed");
          }}
        >
          clear filters
        </button>
      </div>
      <p className="dim mt-3 text-sm" role="status">
        {games.length} / {GAMES.length} games · {PACK_GAMES.length} new ·
        accounts optional
      </p>
      <div className="mt-2">
        {games.map((g) => (
          <Link
            key={g.id}
            href={`/games/${g.id}`}
            className="group grid gap-x-3 border-b border-dashed border-[var(--fg)] py-3 sm:grid-cols-[14rem_1fr]"
          >
            <span className="font-bold">&gt; ./{g.name}</span>
            <span className="text-xs">
              [{g.modes.map((m) => MODE_LABEL[m]).join(" · ")}
              {g.maxPlayers > 1 ? ` · up to ${g.maxPlayers} players` : ""}]
            </span>
            <span className="dim text-sm sm:col-span-2">{g.desc}</span>
          </Link>
        ))}
      </div>
      {!games.length && (
        <p className="box mt-3">
          No games match. Clear a filter or try a shorter search.
        </p>
      )}
    </section>
  );
}
