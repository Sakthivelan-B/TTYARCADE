import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),contexts=await Promise.all([0,1].map(()=>browser.newContext())),pages=await Promise.all(contexts.map(c=>c.newPage())),errors=[];
for(const p of pages)p.on('pageerror',e=>errors.push(p.url()+': '+e.message));
async function post(path,data){const r=await contexts[0].request.post(base+path,{data});assert.equal(r.status(),200,await r.text());return r.json();}
async function snapshot(path,token){return(await contexts[0].request.get(base+path+(token?'?token='+token:''))).json();}
try{
for(const game of ['rummy','battleship','secret-mission']){
 const h=await post('/api/rooms',{game,name:'host',maxPlayers:2}),path='/api/rooms/'+h.room.code,g=await post(path,{action:'join',name:'friend'}),tokens=[h.me.token,g.me.token];await post(path,{action:'start',token:tokens[0]});
 try{
 for(let i=0;i<2;i++){await pages[i].goto(base);await pages[i].evaluate(({key,token})=>localStorage.setItem(key,token),{key:'ttyarcade-room:'+h.room.code,token:tokens[i]});await pages[i].goto(base+'/games/'+game+'?room='+h.room.code);await expect(pages[i].getByRole('button',{name:'leave',exact:true})).toBeVisible();}
 const [host,friend]=pages;
 const publicState=(await snapshot(path)).room.state;for(const key of ['cards','hands','deck','boards','clues'])assert.equal(publicState.data[key],undefined);
 if(game==='rummy'){
  const before=await snapshot(path,tokens[1]);await host.getByRole('button',{name:'draw from stock',exact:true}).click();await expect(host.getByText('Your hand (14)',{exact:true})).toBeVisible();await host.locator('[aria-label="your hand"] button').first().click();await host.getByRole('button',{name:'discard selected',exact:true}).click();await expect(friend.getByRole('button',{name:'draw from stock',exact:true})).toBeEnabled();await expect(host.getByRole('button',{name:'draw from stock',exact:true})).toBeDisabled();const after=await snapshot(path,tokens[1]);assert.deepEqual(after.room.state.data.handCards,before.room.state.data.handCards);assert.equal(after.room.state.data.handCards.length,13);await friend.reload();await expect(friend.getByText('Your hand (13)',{exact:true})).toBeVisible();await friend.getByRole('button',{name:'draw from stock',exact:true}).click();await expect(friend.getByText('Your hand (14)',{exact:true})).toBeVisible();console.log('PASS two-browser Rummy: private hands, draw/discard, peer turn, reconnect, next draw');
 }else if(game==='battleship'){
  await host.getByRole('button',{name:'?',exact:true}).first().click();await expect(friend.getByRole('button',{name:'?',exact:true}).first()).toBeEnabled();await friend.getByRole('button',{name:'?',exact:true}).nth(1).click();await expect(host.getByRole('button',{name:'?',exact:true}).first()).toBeEnabled();const own=(await snapshot(path,tokens[0])).room.state;assert.ok([0,1].includes(own.data.incoming[1]));assert.equal(own.data.boards,undefined);assert.equal(own.data.ownBoard.length,25);console.log('PASS two-browser Fleet: alternating shots, incoming result, no opponent fleet in snapshots');
 }else{
  const first=(await host.getByText(/^Parcel weight:/).textContent()).match(/\d+/)[0];assert.equal((await snapshot(path,tokens[1])).room.state.data.clue,undefined);await host.getByRole('button',{name:'memorized — hide and continue',exact:true}).click();await expect(friend.getByRole('button',{name:'memorized — hide and continue',exact:true})).toBeEnabled();await expect(friend.getByText(/^Parcel weight: \d+/)).toBeVisible();const second=(await friend.getByText(/^Parcel weight:/).textContent()).match(/\d+/)[0];assert.equal((await snapshot(path,tokens[0])).room.state.data.clue,undefined);await friend.getByRole('button',{name:'memorized — hide and continue',exact:true}).click();await expect(friend.getByRole('textbox',{name:'answer',exact:true})).toBeEnabled();assert.equal((await snapshot(path,tokens[1])).room.state.data.clue,undefined);await friend.getByRole('textbox',{name:'answer',exact:true}).fill(String(Number(first)+Number(second)));await friend.getByRole('textbox',{name:'answer',exact:true}).press('Enter');for(const page of pages)await expect(page.getByRole('heading',{name:'round complete',exact:true})).toBeVisible();await host.getByRole('button',{name:'new round',exact:true}).click();await expect(host.getByRole('button',{name:'memorized — hide and continue',exact:true})).toBeEnabled();console.log('PASS two-browser Mission: seat-only clues, seal hides previous clue, either peer answers, cooperative finish and rematch');
 }
 }finally{await post(path,{action:'close',token:tokens[0]});for(const p of pages)await p.goto(base);}
}
assert.deepEqual(errors,[]);console.log('PASS hidden-information browser integration: zero page errors');
}finally{await browser.close();}
