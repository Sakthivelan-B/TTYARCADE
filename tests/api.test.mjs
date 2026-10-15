import test from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
async function post(path, body, headers = {}) {
  const r = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json(), cookie: r.headers.get('set-cookie') };
}
const get = async path => { const r = await fetch(base + path); return { status: r.status, data: await r.json() }; };
test('health and malformed request handling', async () => {
  assert.equal((await get('/api/health')).status, 200);
  for (const body of [null, [], 'bad']) assert.equal((await post('/api/scores', body)).status, 400);
  assert.equal((await post('/api/scores', { game: 'unknown', score: 1 })).status, 400);
  assert.equal((await post('/api/scores', { game: 'snake', score: '1' })).status, 400);
  assert.equal((await get('/api/cron/cleanup')).status, 401);
  assert.equal((await post('/api/rooms', { game: 'snake' })).status, 400);
});
test('registration never grants admin and account scores are attributed', async () => {
  const username = 'audit_' + Date.now().toString(36);
  const a = await post('/api/auth/register', { username, password: 'test-password-123' });
  assert.equal(a.status, 200); assert.equal(a.data.user.isAdmin, false);
  assert.equal((await post('/api/auth/register', { username, password: 'test-password-123' })).status, 409);
  const login = await post('/api/auth/login', { username, password: 'test-password-123' });
  assert.equal(login.status, 200);
  // Production secure cookies are sent explicitly by the test client.
  const cookie = login.cookie.split(';')[0];
  const score = await post('/api/scores', { playerName: 'spoof', game: 'snake', score: 12 }, { cookie });
  assert.equal(score.status, 200); assert.equal(score.data.attributed, true);
  const scores = await get('/api/scores?game=snake');
  assert.ok(scores.data.scores.some(s => s.username === username && s.playerName === username));
  assert.equal((await get('/api/admin/users')).status, 403);
});
test('generic room capacity, host authorization, reconnect and turn checks', async () => {
  const host = await post('/api/rooms', { game: 'tictactoe', name: 'host', maxPlayers: 10 });
  assert.equal(host.status, 200); assert.equal(host.data.room.maxPlayers, 2);
  const code = host.data.room.code, path = '/api/rooms/' + code;
  const results = await Promise.all(Array.from({ length: 4 }, () => post(path, { action: 'join', name: 'host' })));
  assert.equal(results.filter(r => r.status === 200).length, 1);
  const guest = results.find(r => r.status === 200).data.me;
  assert.notEqual(guest.token, host.data.me.token); assert.notEqual(guest.name, 'host');
  assert.equal((await post(path, { action: 'start', token: guest.token })).status, 403);
  assert.equal((await post(path, { action: 'join', token: guest.token })).status, 200);
  assert.equal((await post(path, { action: 'start', token: host.data.me.token, state: {}, turn: 0 })).status, 200);
  assert.equal((await post(path, { action: 'move', token: guest.token, state: { hacked: true } })).status, 409);
});
test('Crazy Eights hides deck and validates host; concurrent draws apply once', async () => {
  const h = await post('/api/cards/rooms', { hostName: 'cardhost' }); assert.equal(h.status, 200);
  const code = h.data.room.code, path = '/api/cards/rooms/' + code;
  const joins = await Promise.all(Array.from({ length: 3 }, (_, i) => post(path + '/join', { name: 'guest' + i })));
  assert.ok(joins.every(r => r.status === 200));
  const list = await get('/api/cards/rooms');
  assert.ok(list.data.rooms.every(r => !('deck' in r) && !('discard' in r)));
  const publicState = await get(path); assert.equal(publicState.data.me, null);
  assert.ok(publicState.data.players.every(p => !('hand' in p) && !('token' in p)));
  assert.equal((await post(path + '/start', {})).status, 403);
  assert.equal((await post(path + '/start', { token: joins[0].data.player.token })).status, 403);
  assert.equal((await post(path + '/start', { token: h.data.player.token })).status, 200);
  const draw = await Promise.all([1, 2].map(() => post(path + '/action', { token: h.data.player.token, action: 'draw' })));
  assert.equal(draw.filter(r => r.status === 200).length, 1);
  const me = await get(path + '?token=' + h.data.player.token);
  assert.equal(me.data.me.hand.length, 8);
  assert.equal((await post(path + '/join', { token: h.data.player.token, name: 'cardhost' })).data.player.token, h.data.player.token);
});
