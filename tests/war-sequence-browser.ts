import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { newPackGame, commandPack } from '../src/lib/pack';
import { cardText } from '../src/lib/pack/card-games';
async function main(){
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000',browser=await chromium.launch({args:['--no-sandbox']}),ctx=await browser.newContext(),errors:string[]=[];
 await ctx.addInitScript({content:'Object.defineProperty(globalThis.crypto,"getRandomValues",{value:function(a){a.fill(1);return a;}});'});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto(base+'/games/war');await page.getByRole('button',{name:'play same device',exact:true}).click();
 let reveals=0;
 for(const level of [1,2]){
  let state=newPackGame('war',2,level,{},1);
  for(let p=0;p<2;p++)await expect(page.locator(`[data-player-card="${p}"]`)).toHaveText('??');
  while(state.phase==='play'){
   await page.getByRole('button',{name:'reveal top card',exact:true}).click();state=commandPack(state,{type:'reveal'},state.turn);reveals++;
   await expect(page.getByText(/Pass the device to/)).toHaveCount(0);
   if(state.phase==='play'){
    // Independent oracle from reducer's actual cards, NOT its view projector.
    const ids=state.data.revealed.some((id:number|null)=>id!==null)?state.data.revealed:state.data.lastBattle??[null,null];
    for(let p=0;p<2;p++)await expect(page.locator(`[data-player-card="${p}"]`)).toHaveText(ids[p]===null?'??':cardText(state.data.cards[ids[p]]));
   }
  }
  await expect(page.getByRole('heading',{name:'round complete',exact:true})).toBeVisible();
  if(level===1)await page.getByRole('button',{name:'next level / round',exact:true}).click();
 }
 assert.deepEqual(errors,[]);console.log(`PASS War: ${reveals} individual reveals across two completed local rounds; both slots verified after every reveal, no stale previous faces, fresh round reset, no curtain or page errors`);
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
