import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const contexts=[await browser.newContext(),await browser.newContext()];
const pages=await Promise.all(contexts.map(c=>c.newPage()));const errors=[];
for(const page of pages)page.on('pageerror',e=>errors.push(page.url()+": "+e.message));
const request=contexts[0].request;
async function state(code){return (await request.get(base+'/api/rooms/'+code)).json();}
async function setup(game){
 const h=await (await request.post(base+'/api/rooms',{data:{game,name:'host'}})).json();
 const g=await (await request.post(base+'/api/rooms/'+h.room.code,{data:{action:'join',name:'friend'}})).json();
 for(const [i,seat] of [h.me,g.me].entries()){
  await pages[i].goto(base+'/games/'+game);
  await pages[i].evaluate(({code,token})=>localStorage.setItem('ttyarcade-room:'+code,token),{code:h.room.code,token:seat.token});
  await pages[i].goto(base+'/games/'+game+'?room='+h.room.code);
 }
 await pages[0].getByRole('button',{name:'start game',exact:true}).click();
 await expect.poll(async()=> (await state(h.room.code)).room.status).toBe('playing');
 return h.room.code;
}
// MEMORY: reproduce the reported second-card failure in two isolated browsers.
{
 const code=await setup('memory');let current=(await state(code)).room.state;
 const first=0,second=current.syms.findIndex(v=>v!==current.syms[first]);
 for(const page of pages)await expect(page.locator('button.cell')).toHaveCount(current.syms.length);
 await pages[0].locator('button.cell').nth(first).click();
 await expect(pages[0].locator('button.cell').nth(first)).toHaveText(current.syms[first]);
 await pages[0].reload();await expect(pages[0].locator('button.cell').nth(first)).toHaveText(current.syms[first]);
 await pages[0].locator('button.cell').nth(second).click();
 // BOTH peers must see BOTH cards, before they close and pass the turn.
 for(const page of pages){await expect(page.locator('button.cell').nth(first)).toHaveText(current.syms[first]);await expect(page.locator('button.cell').nth(second)).toHaveText(current.syms[second]);}
 await expect.poll(async()=> (await state(code)).room.turn,{timeout:8000}).toBe(1);
 await expect(pages[0].locator('button.cell').nth(first)).toHaveText('?');
 current=(await state(code)).room.state;
 while(!current.done){
  await expect.poll(async()=> (await state(code)).room.state.open.length,{timeout:8000}).toBe(0);
  current=(await state(code)).room.state;
  const a=current.syms.findIndex((_,i)=>!current.matched.includes(i));
  const b=current.syms.findIndex((v,i)=>i!==a&&v===current.syms[a]&&!current.matched.includes(i));
  const player=pages[current.turn];
  await player.locator('button.cell').nth(a).click();await expect(player.locator('button.cell').nth(a)).toHaveText(current.syms[a]);
  await player.locator('button.cell').nth(b).click();
  await expect.poll(async()=> (await state(code)).room.state.matched.length).toBe(current.matched.length+2);
  current=(await state(code)).room.state;
 }
 for(const page of pages)await expect(page.getByText(/board clear -/)).toBeVisible();
 assert.equal(current.pairs.reduce((a,b)=>a+b,0),current.syms.length/2);
 await pages[0].getByRole('button',{name:'rematch (new board)',exact:true}).click();
 await expect.poll(async()=> (await state(code)).room.state.matched.length).toBe(0);
 console.log('PASS memory: two-card reveal in both browsers, mismatch/turn change, first-card refresh, all pairs, score totals, completion and rematch.');
}
for(const game of ['tictactoe','connect4']){
 const code=await setup(game);const moves=game==='tictactoe'?[0,3,1,4,2]:[0,1,0,1,0,1,0];
 let count=0;
 for(const index of moves){
  const room=(await state(code)).room,page=pages[room.turn];
  if(game==='tictactoe')await page.locator('button.cell').nth(index).click();
  else await page.getByRole('button',{name:(index+1)+'v',exact:true}).click();
  count++;await expect.poll(async()=> (await state(code)).room.state.b.filter(Boolean).length).toBe(count);
 }
 for(const page of pages)await expect(page.getByText(game==='tictactoe'?'>> X wins':'>> X connects four',{exact:true})).toBeVisible();
 assert.equal((await state(code)).room.state.sc.X,1);
 await pages[0].getByRole('button',{name:'next round',exact:true}).click();
 await expect.poll(async()=> (await state(code)).room.state.b.filter(Boolean).length).toBe(0);
 assert.equal((await state(code)).room.state.sc.X,1);
 await expect(pages[1].getByRole('button',{name:'reset board',exact:true})).toBeDisabled();
 console.log('PASS '+game+': alternating peers, legal moves, win detection, score, host-only rematch.');
}
for(const game of ['math','typing']){
 const code=await setup(game),key=game==='math'?'qid':'lid';
 let room=(await state(code)).room;
 while(room.status!=='finished'){
  const before=room.state;
  await pages[1].locator('[data-gameplay] input').last().fill(game==='math'?'999':before.line.slice(0,2));
  const input=pages[0].locator('[data-gameplay] input').last();
  await input.fill(game==='math'?String(before.a):before.line);
  if(game==='math')await input.press('Enter');
  await expect.poll(async()=> (await state(code)).room.state[key]).not.toBe(before[key]);
  room=(await state(code)).room;
  if(room.status!=='finished')await expect(pages[1].locator('[data-gameplay] input').last()).toHaveValue('');
 }
 for(const page of pages)await expect(page.getByText(/>> host wins/)).toBeVisible();
 const version=room.version;await pages[0].waitForTimeout(650);assert.equal((await state(code)).room.version,version);
 await pages[0].getByRole('button',{name:'rematch',exact:true}).click();
 await expect.poll(async()=> (await state(code)).room.status).toBe('playing');
 assert.deepEqual((await state(code)).room.state.scores,[0,0]);
 console.log('PASS '+game+': server-scored complete race, peer partial input reset, stable winner, rematch.');
}
assert.deepEqual(errors,[]);await browser.close();
console.log('PASS: complete two-browser gameplay for all five generic multiplayer games, no browser page errors. Crazy Eights full rules exercised by the API suite.');
