import test from 'node:test';
import assert from 'node:assert/strict';
import { slideRow, move, canMove } from '../src/lib/2048';
import { makeWalls, placeFood, W, H } from '../src/lib/snake';
import { freshPattern } from '../src/lib/levels';
import { storage } from '../src/lib/storage';
import { loadControls, DEFAULT_CONTROLS } from '../src/lib/controls';
test('2048 merges each tile once and reports gain', () => {
  assert.deepEqual(slideRow([2,2,2,2]), { row: [4,4,0,0], gain: 8, merged: 2 });
  assert.deepEqual(slideRow([2,2,4,0]), { row: [4,4,0,0], gain: 4, merged: 1 });
  assert.equal(canMove([[2,4,2,4],[4,2,4,2],[2,4,2,4],[4,2,4,2]]), false);
  for (const d of ['U','D','L','R'] as const) {
    const b = [[0,0,0,0],[0,2,0,0],[0,0,0,0],[0,0,0,0]];
    const out = move(b, d); assert.equal(out.changed, true);
    assert.equal(out.b.flat().filter(Boolean).length, 2);
    assert.equal(b[1][1], 2);
  }
});
test('Snake high levels are bounded, unique, and preserve spawn lane', () => {
  for (const level of [1, 2, 100, 1000000]) {
    const walls = makeWalls(level); assert.ok(walls.length <= 120);
    assert.equal(new Set(walls.map(p => `${p.x},${p.y}`)).size, walls.length);
    assert.ok(walls.every(p => !(p.y === Math.floor(H/2) && p.x < 12)));
  }
  const full = Array.from({length: W*H}, (_,i) => ({x: i%W, y: Math.floor(i/W)}));
  assert.deepEqual(placeFood({ snake: full, walls: [] }), {x:-1,y:-1});
});
test('corrupted storage data cannot crash level generator or controls', () => {
  storage.setItem('ttyarcade-seen:test', 'null');
  assert.equal(freshPattern('test', () => 7), 7);
  storage.setItem('ttyarcade-controls', '{"U":null}');
  assert.deepEqual(loadControls(), DEFAULT_CONTROLS);
});

test('card encodings include two-digit ranks and secure tokens', async () => {
  const { buildDeck, getRank, getSuit, cardRank, cardSuit, generateToken } = await import('../src/lib/cards');
  for (const card of buildDeck()) { assert.equal(cardSuit(card), getSuit(card)); assert.equal(cardRank(card), getRank(card)); }
  assert.equal(cardRank('S12'), '12'); assert.equal(cardSuit('H10'), 'H');
  assert.match(generateToken(), /^[a-f0-9]{48}$/); assert.notEqual(generateToken(), generateToken());
});
