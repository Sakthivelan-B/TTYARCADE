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

test('ad configuration fails closed without changing terminal styles', async () => {
 const {readAdConfig}=await import('../src/lib/ads');
 assert.equal(readAdConfig({}).mode,'off');
 assert.equal(readAdConfig({NEXT_PUBLIC_ADSENSE_MODE:'placeholder'}).mode,'placeholder');
 const config={NEXT_PUBLIC_ADSENSE_MODE:'live',NEXT_PUBLIC_ADSENSE_CLIENT_ID:'ca-pub-0000000000000000',NEXT_PUBLIC_ADSENSE_SLOT_ID:'0000000000'};
 assert.equal(readAdConfig(config).mode,'live');
 for (const url of ['javascript:alert(1)','http://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js','https://evil.example/script.js','https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=evil']) assert.equal(readAdConfig({...config,NEXT_PUBLIC_ADSENSE_SCRIPT_URL:url}).mode,'off');
 assert.equal(readAdConfig({...config,NEXT_PUBLIC_ADSENSE_CLIENT_ID:'bad'}).mode,'off');
});

test('Memory pairs: both cards stay revealed, resolution is delayed, matches retain turn and departed seats are skipped',async()=>{
 const {flipMemory,settleMemory,MEMORY_REVEAL_MS}=await import('../src/lib/memory-rules');
 const original={syms:['A','B','A','B'],open:[],matched:[],pairs:[0,0,0],turn:0,log:[],done:false,resolveAt:null};
 const first=flipMemory(original,0,'p1',1000);assert.deepEqual(first.open,[0]);
 const second=flipMemory(first,1,'p1',1100);assert.deepEqual(second.open,[0,1]);assert.equal(second.turn,0);
 assert.equal(flipMemory(second,2,'p1',1200),second);assert.equal(settleMemory(second,1200),second);
 const hidden=settleMemory(second,1100+MEMORY_REVEAL_MS,[0,2]);assert.deepEqual(hidden.open,[]);assert.equal(hidden.turn,2);
 const match=flipMemory(first,2,'p1',1100);assert.equal(match.pairs[0],1);assert.deepEqual(match.matched,[0,2]);
 assert.equal(settleMemory(match,4000).turn,0);assert.equal(flipMemory(original,-1,'p1',0),original);
});
test('online board rules validate moves, gravity, diagonals and wins without trusting score payloads',async()=>{
 const {newBoard,playBoard,boardResult}=await import('../src/lib/board-rules');
 const b=newBoard('tictactoe');assert.equal(playBoard('tictactoe',b,['O',...Array(8).fill('')],0),null);
 const next=playBoard('tictactoe',b,['X',...Array(8).fill('')],0);assert.equal(next?.turn,1);
 assert.equal(boardResult('tictactoe',['X','O','','','X','O','','','X']),'X');
 const c=newBoard('connect4'),illegal=[...c.b];illegal[0]='X';assert.equal(playBoard('connect4',c,illegal,0),null);
 const valid=[...c.b];valid[35]='X';assert.ok(playBoard('connect4',c,valid,0));
 const win=[...c.b];for(const i of [35,29,23,17])win[i]='O';assert.equal(boardResult('connect4',win),'O');
});
test('server race challenges have valid answers and deadlines',async()=>{
 const {newOnlineRace,raceCorrect}=await import('../src/lib/race-rules');
 for(const level of [1,3,7,20])for(const game of ['math','typing']){
  const state=newOnlineRace(game,2,level,undefined,1000);assert.ok(state.endsAt>1000);assert.equal(state.scores.length,2);
  assert.equal(raceCorrect(game,state,String(game==='math'?state.a:state.line)),true);
  assert.equal(raceCorrect(game,state,'wrong'),false);assert.equal(raceCorrect(game,state,''),false);
 }
});
