import { test, after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { PACK_GAMES } from "../src/lib/pack/catalog";
import type { PackState } from "../src/lib/pack";
import { cardConservation, type PackCard } from "../src/lib/pack/card-games";
import { nextCommand } from "./pack-helpers";
if (process.env.ALLOW_DATABASE_TESTS !== "1" || !process.env.TEST_DATABASE_URL)
  throw new Error(
    "Use isolated TEST_DATABASE_URL with ALLOW_DATABASE_TESTS=1.",
  );
const testIp = `198.18.${(process.pid >>> 8) % 256}.${process.pid % 256}`;
const pool = new pg.Pool({
    connectionString: process.env.TEST_DATABASE_URL,
    max: 2,
  }),
  base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
after(() => pool.end());
async function post(path: string, body: unknown) {
  const r = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": testIp },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}
async function get(path: string) {
  const r = await fetch(base + path);
  return { status: r.status, data: await r.json() };
}
async function setup(game: string, players = 2, password = false) {
  const h = await post("/api/rooms", {
    game,
    name: "host",
    maxPlayers: players,
    passwordEnabled: password,
    password: password ? "test-pass" : "",
  });
  assert.equal(h.status, 200, JSON.stringify(h.data));
  const path = "/api/rooms/" + h.data.room.code,
    tokens = [h.data.me.token];
  for (let i = 1; i < players; i++) {
    const g = await post(path, {
      action: "join",
      name: "friend" + i,
      password: password ? "test-pass" : "",
    });
    assert.equal(g.status, 200);
    tokens.push(g.data.me.token);
  }
  const started = await post(path, {
    action: "start",
    token: tokens[0],
    state: { phase: "won", hands: [[99]], options: { jokers: true } },
    score: 999,
  });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  assert.equal(
    started.data.room.state.phase,
    game === "secret-mission" ? "observe" : "play",
  );
  return { path, tokens, code: h.data.room.code };
}
async function raw(code: string) {
  const result = await pool.query(
    "select state,version,status,round from rooms where code=$1",
    [code],
  );
  return result.rows[0] as {
    state: PackState;
    version: number;
    status: string;
    round: number;
  };
}
for (const def of PACK_GAMES.filter((g) => g.modes.includes("online")))
  test(`${def.id}: authenticated private views, legal full round, authoritative finish, rematch`, async () => {
    const game = await setup(def.id, def.min);
    try {
      let r = await raw(game.code);
      assert.equal(r.state.players, def.min);
      const spectator = (await get(game.path)).data.room.state;
      assert.equal(spectator.data.cards, undefined);
      assert.equal(spectator.data.hands, undefined);
      assert.equal(spectator.data.boards, undefined);
      assert.equal(spectator.data.clues, undefined);
      if (def.category === "cards") {
        assert.ok(cardConservation(r.state));
        assert.deepEqual(spectator.data.handCards, []);
        const own = (await get(game.path + "?token=" + game.tokens[0])).data
          .room.state;
        if (def.id !== "war" && def.id !== "golf-six")
          assert.equal(own.data.handCards.length, r.state.data.hands[0].length);
      }
      if (def.id === "rummy") {
        const d = r.state.data,
          specs: [number, string][] = [
            [1, "S"],
            [2, "S"],
            [3, "S"],
            [6, "H"],
            [7, "H"],
            [8, "H"],
            [10, "S"],
            [10, "H"],
            [10, "D"],
            [13, "S"],
            [13, "H"],
            [13, "D"],
            [13, "C"],
          ];
        const ids = specs.map(
            ([rank, suit]) =>
              d.cards.find((c: PackCard) => c.rank === rank && c.suit === suit)
                .id,
          ),
          remaining = d.cards
            .map((c: PackCard) => c.id)
            .filter((id: number) => !ids.includes(id));
        d.hands = [ids, remaining.splice(0, 13)];
        d.discard = [remaining.shift()];
        d.deck = remaining;
        assert.ok(cardConservation(r.state));
        await pool.query("update rooms set state=$1 where code=$2", [
          JSON.stringify(r.state),
          game.code,
        ]);
      }
      const illegal = await post(game.path, {
        action: "move",
        token: game.tokens[0],
        state: { phase: "won", scores: [999] },
        score: 999,
        status: "finished",
      });
      assert.equal(illegal.status, 400);
      assert.equal((await raw(game.code)).version, r.version);
      const wrong = await post(game.path, {
        action: "pack-command",
        token: game.tokens[1],
        command: { type: "choose", index: 0 },
      });
      assert.equal(wrong.status, 422);
      assert.equal((await raw(game.code)).version, r.version);
      let moves = 0;
      while (r.status === "playing" && moves < 6000) {
        const command =
          def.id === "rummy"
            ? { type: "declare" }
            : nextCommand(r.state, moves + 17);
        const response = await post(game.path, {
          action: "pack-command",
          command,
          token: game.tokens[r.state.turn],
          expectVersion: r.version,
          state: { phase: "won" },
          score: 999,
        });
        assert.equal(
          response.status,
          200,
          JSON.stringify({ game: def.id, command, response: response.data }),
        );
        assert.equal(response.data.room.state.data.deck, undefined);
        r = await raw(game.code);
        if (def.category === "cards") assert.ok(cardConservation(r.state));
        moves++;
      }
      assert.equal(r.status, "finished");
      assert.equal(r.state.phase, "won");
      const endVersion = r.version;
      assert.equal(
        (
          await post(game.path, {
            action: "pack-command",
            token: game.tokens[0],
            command: { type: "declare" },
          })
        ).status,
        409,
      );
      assert.equal((await raw(game.code)).version, endVersion);
      const scores = await pool.query(
        "select * from game_scores where meta->>'room'=$1",
        [game.code],
      );
      assert.equal(
        scores.rows.length,
        r.state.scores.filter((n) => n > 0).length,
      );
      assert.ok(
        scores.rows.every(
          (row) => row.meta.serverValidated === true && row.score !== 999,
        ),
      );
      assert.equal(
        (await post(game.path, { action: "rematch", token: game.tokens[1] }))
          .status,
        403,
      );
      const again = await post(game.path, {
        action: "rematch",
        token: game.tokens[0],
        expectVersion: endVersion,
      });
      assert.equal(again.status, 200);
      assert.equal(again.data.room.round, r.round + 1);
      assert.equal(again.data.room.state.level, 2);
      assert.equal(again.data.room.state.scores[0], 0);
      if (def.id === "rummy")
        assert.equal(again.data.room.state.options.jokers, true);
    } finally {
      await post(game.path, { action: "close", token: game.tokens[0] });
    }
  });
test("Ten-player Rummy optional password, no-token privacy, kick/rejoin, host transfer, idle persistence and compaction", async () => {
  const g = await setup("rummy", 10, true);
  let tokens = g.tokens;
  try {
    let r = await raw(g.code);
    assert.equal(r.state.data.cards.length, 216);
    assert.ok(cardConservation(r.state));
    const own = (await get(g.path + "?token=" + tokens[7])).data;
    assert.equal(own.room.state.data.handCards.length, 13);
    assert.equal(own.me.seat, 7);
    const kicked = await post(g.path, {
      action: "kick",
      token: tokens[0],
      playerId: own.me.id,
    });
    assert.equal(kicked.status, 200);
    assert.equal(kicked.data.room.status, "finished");
    assert.equal((await get(g.path + "?token=" + tokens[7])).data.me, null);
    assert.ok(cardConservation((await raw(g.code)).state));
    assert.equal(
      (
        await post(g.path, {
          action: "join",
          name: "returning",
          password: "wrong",
        })
      ).status,
      403,
    );
    const rejoin = await post(g.path, {
      action: "join",
      name: "returning",
      password: "test-pass",
    });
    assert.equal(rejoin.status, 200);
    tokens[7] = rejoin.data.me.token;
    assert.equal(
      (await post(g.path, { action: "rematch", token: tokens[0] })).status,
      200,
    );
    await pool.query(
      "update room_players set last_seen=now()-interval '365 days' where room_id=(select id from rooms where code=$1)",
      [g.code],
    );
    assert.equal((await get(g.path)).status, 200);
    assert.equal((await raw(g.code)).status, "playing");
    await post(g.path, { action: "leave", token: tokens[0] });
    assert.equal((await get(g.path)).data.room.hostSeat, 1);
    assert.equal(
      (await post(g.path, { action: "rematch", token: tokens[1] })).status,
      200,
    );
    const host = (await get(g.path + "?token=" + tokens[1])).data;
    assert.equal(host.me.seat, 0);
    assert.equal(host.room.hostSeat, 0);
    assert.equal(host.room.state.players, 9);
    for (const token of tokens.slice(1))
      assert.equal(
        (await post(g.path, { action: "leave", token })).status,
        200,
      );
    assert.equal((await get(g.path)).status, 404);
  } finally {
    for (const token of tokens) await post(g.path, { action: "close", token });
  }
});
test("Concurrent commands serialize by version; stale/private error responses stay private", async () => {
  const g = await setup("nim");
  try {
    const r = await raw(g.code);
    const a = await Promise.all(
      [1, 1].map((amount) =>
        post(g.path, {
          action: "pack-command",
          command: { type: "take", index: 0, amount },
          token: g.tokens[0],
          expectVersion: r.version,
        }),
      ),
    );
    assert.equal(a.filter((r) => r.status === 200).length, 1);
    assert.equal(a.filter((r) => r.status === 409).length, 1);
    assert.equal((await raw(g.code)).version, r.version + 1);
  } finally {
    await post(g.path, { action: "close", token: g.tokens[0] });
  }
  const r = await setup("rummy");
  try {
    const state = await raw(r.code);
    const stale = await post(r.path, {
      action: "pack-command",
      command: { type: "draw", source: "stock" },
      token: r.tokens[1],
      expectVersion: state.version - 1,
    });
    assert.equal(stale.status, 409);
    assert.equal(stale.data.room.state.data.deck, undefined);
    assert.equal(stale.data.room.state.data.handCards.length, 13);
    assert.equal(
      (
        await post("/api/scores", {
          game: "rummy",
          score: 999,
          meta: { serverValidated: true },
        })
      ).status,
      400,
    );
  } finally {
    await post(r.path, { action: "close", token: r.tokens[0] });
  }
});
