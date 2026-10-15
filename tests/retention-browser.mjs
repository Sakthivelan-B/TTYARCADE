import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{ Object.defineProperty(navigator,'getGamepads',{value:()=>{throw new DOMException('blocked by policy','SecurityError');},configurable:true}); });
await page.goto(base);
let retained;
for(const game of ['tictactoe','connect4','memory','math','typing']) {
 const h=await (await page.request.post(base+'/api/rooms',{data:{game,name:'refreshhost'}})).json();
 const path='/api/rooms/'+h.room.code;
 await page.request.post(base+path,{data:{action:'join',name:'friend'}});
 await page.evaluate(({code,token})=>localStorage.setItem('ttyarcade-room:'+code,token),{code:h.room.code,token:h.me.token});
 await page.goto(base+'/games/'+game+'?room='+h.room.code);
 await page.getByRole('button',{name:'start game',exact:true}).click();
 await expect.poll(async()=> (await (await page.request.get(base+path)).json()).room.status).toBe('playing');
 await page.reload();
 await expect(page.getByText('room=',{exact:false}).first()).toBeVisible({timeout:12000});
 const state=await (await page.request.get(base+path+'?token='+h.me.token)).json();
 assert.equal(state.me.id,h.me.id);assert.equal(state.me.isCpu,false);assert.equal(state.room.status,'playing');
 retained={h,path,game};
}
// A failed explicit leave cannot destroy the guest's only saved credential.
await page.route('**'+retained.path,async route=>{ if(route.request().method()==='POST') await route.abort(); else await route.continue(); });
await page.getByRole('button',{name:'leave',exact:true}).click();
await expect(page.getByRole('button',{name:'leave',exact:true})).toBeEnabled();
assert.equal(await page.evaluate(code=>localStorage.getItem('ttyarcade-room:'+code),retained.h.room.code),retained.h.me.token);
await page.unroute('**'+retained.path);
await page.reload();await expect(page.getByRole('button',{name:'close room',exact:true})).toBeVisible();
page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'close room',exact:true}).click();
await expect.poll(async()=> (await page.request.get(base+retained.path)).status()).toBe(404);
await page.goto(base+'/games/crazy8');
await page.getByRole('button',{name:'create room',exact:true}).click();
await expect(page.getByRole('button',{name:'close room',exact:true})).toBeVisible();
const code=new URL(page.url()).searchParams.get('code');
const before=await page.evaluate(code=>localStorage.getItem('ttyarcade-c8:'+code),code);
await page.reload();await expect(page.getByRole('button',{name:'close room',exact:true})).toBeVisible();
assert.equal(await page.evaluate(code=>localStorage.getItem('ttyarcade-c8:'+code),code),before);
await page.getByRole('button',{name:'leave',exact:true}).click();
await expect(page.getByRole('button',{name:'create room',exact:true})).toBeVisible();
assert.equal((await page.request.get(base+'/api/cards/rooms/'+code)).status(),404);
// Preferences survive navigation/reload even when browser gamepad access is denied.
await page.goto(base+'/settings');
await page.getByRole('button',{name:'set up',exact:true}).click();await page.keyboard.press('i');await page.reload();
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ttyarcade-controls')).U),'i');
await page.goto(base+'/games/snake');await page.getByRole('button',{name:'start',exact:true}).click();await page.keyboard.press('i');
assert.deepEqual(errors,[]);await browser.close();
console.log('PASS: all five generic games auto-resume playing state; Crazy Eights refresh + explicit last leave; failed leave retains token; host close; persisted controls; gamepad permission denial fallback; zero page errors.');
