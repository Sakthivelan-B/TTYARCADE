import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),context=await browser.newContext(),pages=[await context.newPage(),await context.newPage()],errors=[];
for(const p of pages)p.on('pageerror',e=>errors.push(p.url()+': '+e.message));
async function post(path,data){const r=await context.request.post(base+path,{data});assert.equal(r.status(),200,await r.text());return r.json();}
const state=async path=>(await context.request.get(base+path)).json();
// Home must not list any room codes, even when waiting rooms really exist.
const waiting=await post('/api/cards/rooms',{hostName:'retainedwaiting'});
await pages[0].goto(base+'/');await expect(pages[0].getByText('$ who | grep waiting',{exact:true})).toHaveCount(0);assert.ok(!(await pages[0].locator('body').textContent()).includes(waiting.room.code));assert.equal((await context.request.get(base+'/api/cards/rooms/'+waiting.room.code)).status(),200);
console.log('PASS home: waiting-room box/codes absent; retained rooms still exist.');
for(const game of ['tictactoe','connect4','memory','math','typing','crazy8']){
 const card=game==='crazy8',root=card?'/api/cards/rooms':'/api/rooms',created=await post(root,{game,name:'host',hostName:'host'}),host=card?created.player:created.me,path=root+'/'+created.room.code;
 await post(card?path+'/join':path,{action:'join',name:'friend'});await post(card?path+'/start':path,{action:'start',token:host.token});
 const url=base+'/games/'+game+'?'+(card?'code':'room')+'='+created.room.code,key=(card?'ttyarcade-c8:':'ttyarcade-room:')+created.room.code;
 await pages[0].goto(base+'/');await pages[0].evaluate(({key,token})=>{localStorage.setItem(key,token);sessionStorage.setItem('copied-tab-id','same-value');},{key,token:host.token});
 await pages[0].goto(url);await expect(pages[0].getByRole('button',{name:card?'exit':'leave',exact:true})).toBeVisible();
 if(game==='connect4'){await pages[0].getByRole('button',{name:'1v',exact:true}).click();await expect.poll(async()=>(await state(path)).room.state.b.filter(Boolean).length).toBe(1);}
 const before=await state(path+'?token='+host.token),owner=await pages[0].evaluate(()=>JSON.parse(localStorage.getItem('ttyarcade-active-game-tab')).id);
 await pages[1].goto(url);await expect(pages[1].getByRole('button',{name:card?'exit':'leave',exact:true})).toBeVisible();await expect(pages[0]).toHaveURL(base+'/');await expect(pages[0].getByRole('status')).toContainText('another game tab was opened');
 const after=await state(path+'?token='+host.token);assert.equal(after.room.status,'playing');assert.equal(after.me.id,host.id);assert.equal(after.room.turn,before.room.turn);if(card)assert.deepEqual(after.me.hand,before.me.hand);else assert.deepEqual(after.room.state,before.room.state);
 assert.equal(await pages[1].evaluate(key=>localStorage.getItem(key),key),host.token);assert.notEqual(await pages[1].evaluate(()=>JSON.parse(localStorage.getItem('ttyarcade-active-game-tab')).id),owner);
 await pages[1].reload();await expect(pages[1].getByRole('button',{name:card?'exit':'leave',exact:true})).toBeVisible();await pages[0].bringToFront();await expect(pages[1]).toHaveURL(url);
 await post(path,{action:'close',token:host.token});await pages[1].goto(base+'/');
 console.log('PASS '+game+': new same-profile tab owns saved seat, older tab returns home, room/turn/state/hand/token retained, refresh works.');
}
// Any game page claims ownership; different games also stop the old tab.
await pages[0].goto(base+'/games/snake');await expect(pages[0].getByRole('button',{name:'start',exact:true})).toBeVisible();await pages[1].goto(base+'/games/pong');await expect(pages[0]).toHaveURL(base+'/');await expect(pages[1].getByRole('button',{name:'start',exact:true})).toBeVisible();
const independent=await browser.newContext(),other=await independent.newPage();await other.goto(base+'/games/memory');await expect(other.getByRole('button',{name:'solo - endless levels',exact:true})).toBeVisible();await expect(pages[1]).toHaveURL(base+'/games/pong');await independent.close();
console.log('PASS cross-game handoff and separate-profile independence.');
for(const mode of ['no-local-storage','no-broadcast-channel']){
 const ctx=await browser.newContext();await ctx.addInitScript(mode=>{if(mode==='no-local-storage')Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError');}});else Object.defineProperty(window,'BroadcastChannel',{value:undefined});},mode);
 const a=await ctx.newPage(),b=await ctx.newPage();for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));await a.goto(base+'/games/snake');await expect(a.getByRole('button',{name:'start',exact:true})).toBeVisible();await b.goto(base+'/games/pong');await expect(a).toHaveURL(base+'/');await expect(b.getByRole('button',{name:'start',exact:true})).toBeVisible();await ctx.close();console.log('PASS tab coordination fallback: '+mode);
}
const rapid=await browser.newContext(),tabs=await Promise.all(Array.from({length:4},()=>rapid.newPage()));await Promise.all(tabs.map((p,i)=>p.goto(base+'/games/'+['snake','pong','memory','2048'][i])));await expect.poll(()=>tabs.filter(p=>new URL(p.url()).pathname.startsWith('/games/')).length).toBe(1);await rapid.close();
assert.deepEqual(errors,[]);await browser.close();console.log('PASS rapid tab claims: one winner, zero page errors. No server leave/close on tab takeover.');
