"use client";
import { useEffect, useRef, useState } from "react";
import { Shell, Stats } from "./term";
import { RoomLobby, useRoom } from "./multi";
import { PackBoard } from "./pack-board";
import {
  newPackGame,
  commandPack,
  projectPack,
  type PackState,
  type Command,
} from "@/lib/pack";
import { packGame, CARD_IDS, STRATEGY_IDS } from "@/lib/pack/catalog";
import { usePlayerName } from "@/lib/player";
import { submitScore } from "@/lib/levels";
type Mode = "menu" | "solo" | "local" | "online";
export function PackGame({ id }: { id: string }) {
  const def = packGame(id)!;
  const [name] = usePlayerName();
  const [mode, setMode] = useState<Mode>("menu"),
    [count, setCount] = useState(2),
    [jokers, setJokers] = useState(false),
    [garden, setGarden] = useState("alphabet");
  const [names, setNames] = useState<string[]>([]),
    [state, setState] = useState<PackState | null>(null),
    [relay, setRelay] = useState(0),
    [totals, setTotals] = useState<number[]>([]),
    [error, setError] = useState(""),
    [serial, setSerial] = useState(0),
    [revealed, setRevealed] = useState("");
  const ref = useRef<PackState | null>(null),
    scored = useRef(false);
  const m = useRoom(id, def.max, mode === "online");
  useEffect(() => {
    if (m.code) setMode("online");
  }, [m.code]);
  const puzzle = !CARD_IDS.includes(id) && !STRATEGY_IDS.includes(id),
    options = { jokers, garden };
  function begin(nextMode: Mode, level = 1, nextRelay = 0) {
    const players = nextMode === "local" && !puzzle ? count : 1;
    const next = newPackGame(id, players, level, options);
    ref.current = next;
    setState(next);
    setMode(nextMode);
    setError("");
    setRelay(nextRelay);
    setSerial((v) => v + 1);
    scored.current = false;
  }
  function start(nextMode: Mode) {
    const n = nextMode === "local" ? count : 1;
    setNames(
      Array.from({ length: n }, (_, i) => (i === 0 ? name : `Player ${i + 1}`)),
    );
    setTotals(Array(n).fill(0));
    begin(nextMode);
  }
  const raw =
    mode === "online" ? (m.room?.state as unknown as PackState) : state;
  const viewer =
    mode === "online" ? m.mySeatIndex : puzzle ? 0 : (raw?.turn ?? 0);
  const localPlayer = puzzle ? relay : viewer,
    key = `${serial}:${localPlayer}`;
  const privateTurn = puzzle || ["rummy", "go-fish", "twenty-one", "sevens", "old-maid", "battleship", "secret-mission"].includes(id);
  const handoff = mode === "local" && privateTurn && raw && revealed !== key;
  const onlineReady =
    mode === "online" && m.room?.status !== "waiting" && raw?.v === 1;
  const boardNames = mode === "online" ? m.seats.map((s) => s.name) : names;
  const label = mode === "local" ? names[localPlayer] : name;
  function send(command: Command) {
    if (mode === "online") {
      void m.move({ action: "pack-command", command });
      return;
    }
    if (handoff || !ref.current) return;
    try {
      const next = commandPack(ref.current, command, viewer);
      ref.current = next;
      setState(next);
      setError("");
      if ((next.phase === "won" || next.phase === "lost") && !scored.current) {
        scored.current = true;
        if (puzzle) {
          const points = next.phase === "won" ? next.level : 0;
          setTotals((t) => t.map((v, i) => (i === relay ? v + points : v)));
          if (mode === "solo" && points > 0)
            submitScore(id, points, { level: next.level }, name);
        } else setTotals((t) => t.map((v, i) => v + (next.scores[i] ?? 0)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid move.");
    }
  }
  const done = raw?.phase === "won" || raw?.phase === "lost";
  function nextRound() {
    if (!state) return;
    if (mode === "local" && puzzle) {
      const nextRelay = (relay + 1) % count;
      begin(mode, state.level + (nextRelay === 0 ? 1 : 0), nextRelay);
    } else begin(mode, state.level + (state.phase === "won" ? 1 : 0));
  }
  const settings = (
    <>
      {id === "rummy" && (
        <label>
          <input
            type="checkbox"
            checked={jokers}
            onChange={(e) => setJokers(e.target.checked)}
          />{" "}
          include printed jokers
        </label>
      )}
      {id === "order-garden" && (
        <label>
          Garden mode{" "}
          <select
            aria-label="garden mode"
            value={garden}
            onChange={(e) => setGarden(e.target.value)}
          >
            <option value="alphabet">A → Z</option>
            <option value="numbers">1 → numbers</option>
          </select>
        </label>
      )}
    </>
  );
  return (
    <Shell
      path={`/games/${id}`}
      title={def.name}
      help={def.rules}
      wide={id === "order-garden"}
    >
      <div className="pack-ui">
        {mode === "menu" ? (
          <section>
            <p>{def.desc}</p>
            <div className="row">{settings}</div>
            {def.modes.includes("local") && (
              <details>
                <summary>same-device players and names</summary>
                <label>
                  Players{" "}
                  <input
                    aria-label="local players"
                    type="number"
                    min={2}
                    max={def.max}
                    value={count}
                    onChange={(e) =>
                      setCount(
                        Math.max(
                          2,
                          Math.min(
                            def.max,
                            Math.floor(Number(e.target.value)) || 2,
                          ),
                        ),
                      )
                    }
                  />
                </label>
                <p>Names can be changed after starting.</p>
                {puzzle && (
                  <p>
                    Round relay: each person gets one fresh puzzle at the same
                    level before the level rises. Scores stay on this device.
                  </p>
                )}
              </details>
            )}
            <div className="row">
              {def.modes.includes("solo") && (
                <button onClick={() => start("solo")}>play solo</button>
              )}
              {def.modes.includes("local") && (
                <button onClick={() => start("local")}>play same device</button>
              )}
              {def.modes.includes("online") && (
                <button onClick={() => setMode("online")}>play online</button>
              )}
            </div>
          </section>
        ) : null}
        {mode === "online" && (
          <>
            <RoomLobby
              m={m}
              title={def.name}
              seatChooser={() => {}}
              onPlay={() => {
                void m.start({ options });
              }}
              onLeave={async () => {
                if (await m.leave()) setMode("menu");
              }}
            />
            {(!m.room || m.room.status === "waiting") && (
              <div className="row">
                {(!m.code || m.mySeatIndex === m.room?.hostSeat) && settings}
                {!m.code && (
                  <button onClick={() => setMode("menu")}>mode menu</button>
                )}
              </div>
            )}
          </>
        )}
        {(mode === "solo" || mode === "local" || onlineReady) &&
          raw?.v === 1 && (
            <>
              <Stats
                items={[
                  ["level", raw.level],
                  ...(!CARD_IDS.includes(id) &&
                  (!STRATEGY_IDS.includes(id) || id === "secret-mission") &&
                  id !== "order-garden"
                    ? [["lives", raw.lives] as [string, number]]
                    : []),
                  [
                    "turn",
                    mode === "local" && puzzle
                      ? label
                      : (boardNames[raw.turn] ?? `Player ${raw.turn + 1}`),
                  ],
                ]}
              />
              {mode === "local" && (
                <details className="mt-2">
                  <summary>names / match totals</summary>
                  {names.map((n, i) => (
                    <label key={i} className="name-line">
                      Player {i + 1}{" "}
                      <input
                        aria-label={`Player ${i + 1} name`}
                        maxLength={20}
                        value={n}
                        onChange={(e) =>
                          setNames((a) =>
                            a.map((v, j) =>
                              j === i ? e.target.value.slice(0, 20) : v,
                            ),
                          )
                        }
                      />{" "}
                      · {totals[i] ?? 0} points
                    </label>
                  ))}
                </details>
              )}
              {handoff ? (
                <section className="box mt-4">
                  <p>
                    Pass the device to{" "}
                    <strong>{label || `Player ${localPlayer + 1}`}</strong>.
                  </p>
                  <p>Everyone else: look away before continuing.</p>
                  <button onClick={() => setRevealed(key)}>
                    I am {label || `Player ${localPlayer + 1}`} — show my turn
                  </button>
                </section>
              ) : (
                <PackBoard
                  key={`${serial}:${raw.turn}`}
                  state={mode === "online" ? raw : projectPack(raw, viewer)}
                  viewer={viewer}
                  names={boardNames}
                  send={send}
                  disabled={
                    mode === "online" &&
                    (m.busy ||
                      (!m.myTurn &&
                        !(id === "secret-mission" && raw.phase === "play")))
                  }
                />
              )}
              {!done && raw.message && !handoff && (
                <p role="status">{raw.message}</p>
              )}
              {error && <p role="alert">! {error}</p>}
              {done && !handoff && (
                <div className="row">
                  {mode === "online" ? (
                    m.me?.seat === m.room?.hostSeat ? (
                      <button
                        disabled={
                          m.busy ||
                          m.seats.filter((s) => !s.isCpu && !s.left).length <
                            def.min
                        }
                        onClick={() => {
                          void m.rematch({});
                        }}
                      >
                        new round
                      </button>
                    ) : (
                      <p>Waiting for the host to start a new round.</p>
                    )
                  ) : (
                    <button onClick={nextRound}>
                      {mode === "local" && puzzle
                        ? "next player / round"
                        : raw.phase === "won"
                          ? "next level / round"
                          : "retry — fresh board"}
                    </button>
                  )}
                  {mode === "online" && (
                    <p>
                      Share room code {m.code}; departed seats may be replaced.
                      No room timeout.
                    </p>
                  )}
                </div>
              )}
              {mode !== "online" && (
                <div className="row">
                  {!done && (
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            "Start a fresh board at this same level?",
                          )
                        )
                          begin(mode, raw.level, relay);
                      }}
                    >
                      retry this level
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMode("menu");
                      setState(null);
                      ref.current = null;
                    }}
                  >
                    mode menu
                  </button>
                </div>
              )}
            </>
          )}
      </div>
    </Shell>
  );
}
