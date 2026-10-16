import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
const mode=process.env.TEST_AD_MODE || 'placeholder';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
let requests=0;
// No actual advertising requests, impressions, clicks, or real publisher IDs.
await page.route('https://pagead2.googlesyndication.com/**',async route=>{
 requests++;
 if(process.env.TEST_AD_BLOCK==='1') return route.abort();
 return route.fulfill({contentType:'application/javascript',body:'window.__adPushes=0; window.adsbygoogle={push:function(){window.__adPushes++}};'});
});
await page.goto(base+'/');
// SSR placeholder visibility alone does not mean the consent bridge is hydrated.
await page.getByRole('button',{name:'user:guest',exact:true}).click();
await expect(page.locator('[data-terminal-header] input')).toBeVisible();
await page.keyboard.press('Enter');
if(mode==='off') { assert.equal(await page.locator('[data-ad-placement]').count(),0); }
else {
 await expect(page.locator('[data-ad-placement="home-footer"]')).toBeVisible();
 if(mode==='placeholder') await expect(page.getByText(/advertising placeholder/)).toBeVisible();
 else {
  await expect(page.getByText(/awaiting consent/)).toBeVisible();assert.equal(requests,0);
  await page.evaluate(()=>{ window.ttyarcadeAdvertisingConsent=true; window.dispatchEvent(new CustomEvent('ttyarcade-ad-consent',{detail:{granted:true}})); });
  if(process.env.TEST_AD_BLOCK==='1') await expect(page.getByText(/advertising unavailable/)).toBeVisible();
  else {
   await expect.poll(()=>page.evaluate(()=>window.__adPushes)).toBe(1);
   assert.equal(await page.locator('script#ttyarcade-adsense').count(),1);
   await page.evaluate(()=>{ window.ttyarcadeAdvertisingConsent=false; window.dispatchEvent(new CustomEvent('ttyarcade-ad-consent',{detail:{granted:false}})); });
   await expect(page.getByText(/awaiting consent/)).toBeVisible();assert.equal(await page.locator('ins.adsbygoogle').count(),0);
  }
 }
 const color=await page.evaluate(()=>({bg:getComputedStyle(document.body).backgroundColor,fg:getComputedStyle(document.body).color}));
 assert.deepEqual(color,{bg:'rgb(0, 0, 0)',fg:'rgb(255, 255, 255)'});
}
if(mode!=='live') assert.equal(requests,0);
await page.goto(base+'/games/snake');assert.equal(await page.locator('[data-ad-placement]').count(),0);
await page.getByRole('button',{name:'start',exact:true}).click();await page.keyboard.press('ArrowUp');
assert.deepEqual(errors,[]);await browser.close();
console.log(`PASS: ad mode=${mode}, blocked=${process.env.TEST_AD_BLOCK==='1'}; no unconsented Google request; reserved footer, unchanged body theme, zero game-page ads, no page errors. Live script was locally mocked.`);
