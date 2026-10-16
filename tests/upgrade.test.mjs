import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
if (process.env.ALLOW_DATABASE_TESTS !== '1' || !process.env.TEST_DATABASE_URL || !process.env.TEST_CRON_SECRET) throw new Error('Use an isolated DB and set ALLOW_DATABASE_TESTS=1, TEST_DATABASE_URL, TEST_CRON_SECRET');
const pool = new pg.Pool({connectionString:process.env.TEST_DATABASE_URL,max:2});
const testIp=`198.18.${(process.pid>>>8)%256}.${process.pid%256}`;
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
async function post(path,body,headers={}) { const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':testIp,...headers},body:JSON.stringify(body)});const text=await r.text();return {status:r.status,data:text?JSON.parse(text):null,cookie:r.headers.get('set-cookie')}; }
async function get(path,headers={}) {const r=await fetch(base+path,{headers});return {status:r.status,data:await r.json()};}
const cron=()=>get('/api/cron/cleanup',{authorization:'Bearer '+process.env.TEST_CRON_SECRET});
test.after(()=>pool.end());
test('all five generic games retain stale/offline rooms through cron, reconnect, and host transfer',async()=>{
 for (const game of ['tictactoe','connect4','memory','math','typing']) {
  const h=await post('/api/rooms',{game,name:'host'});assert.equal(h.status,200);
  const path='/api/rooms/'+h.data.room.code;
  const g=await post(path,{action:'join',name:'guest'});assert.equal(g.status,200);
  await pool.query("UPDATE rooms SET updated_at=now()-interval '30 days' WHERE code=$1",[h.data.room.code]);
  await pool.query("UPDATE room_players SET last_seen=now()-interval '2 days' WHERE token=$1",[h.data.me.token]);
  assert.equal((await cron()).status,200);
  const before=await get(path);assert.equal(before.status,200);assert.equal(before.data.seats.find(s=>s.id===h.data.me.id).isCpu,false);
  const resumed=await post(path,{action:'join',token:h.data.me.token});assert.equal(resumed.data.me.token,h.data.me.token);
  assert.equal((await post(path,{action:'close',token:g.data.me.token})).status,403);
  assert.equal((await post(path,{action:'leave',token:h.data.me.token})).status,200);
  const after=await get(path+'?token='+g.data.me.token);assert.equal(after.status,200);assert.equal(after.data.room.hostSeat,after.data.me.seat);
  assert.equal((await post(path,{action:'leave',token:g.data.me.token})).status,200);
  assert.equal((await get(path)).status,404);
 }
});
test('playing rooms reserve offline seats; explicit leave rotates token; new host can close',async()=>{
 const h=await post('/api/rooms',{game:'tictactoe',name:'host'}),path='/api/rooms/'+h.data.room.code;
 const g=await post(path,{action:'join',name:'guest'});
 await post(path,{action:'start',token:h.data.me.token,state:{b:Array(9).fill('')},turn:0});
 await pool.query("UPDATE room_players SET last_seen=now()-interval '2 days' WHERE token=$1",[h.data.me.token]);
 assert.equal((await post(path,{action:'move',token:g.data.me.token,takeover:0})).status,409);
 assert.equal((await post(path,{action:'join',token:h.data.me.token})).status,200);
 assert.equal((await post(path,{action:'leave',token:h.data.me.token})).status,200);
 assert.equal((await post(path,{action:'move',token:h.data.me.token})).status,403);
 assert.equal((await get(path)).status,200);
 assert.equal((await post(path,{action:'close',token:g.data.me.token})).status,200);
 assert.equal((await get(path)).status,404);
});
test('Crazy Eights retains hands through heartbeat/cron, has real leave/close, and transfers host',async()=>{
 const h=await post('/api/cards/rooms',{hostName:'host'}),path='/api/cards/rooms/'+h.data.room.code;
 const g=await post(path+'/join',{name:'guest'});
 await pool.query("UPDATE card_rooms SET updated_at=now()-interval '30 days' WHERE code=$1",[h.data.room.code]);
 await pool.query("UPDATE card_players SET last_seen=now()-interval '2 days' WHERE token=$1",[h.data.player.token]);
 await cron();
 const fresh=await get(path+'?token='+h.data.player.token);assert.equal(fresh.status,200);assert.deepEqual(fresh.data.me.hand,h.data.player.hand);
 assert.equal((await get(path+'?token='+h.data.player.token)).data.players.find(p=>p.id===h.data.player.id).online,true);
 assert.equal((await post(path,{action:'close',token:g.data.player.token})).status,403);
 assert.equal((await post(path,{action:'leave',token:h.data.player.token})).status,200);
 assert.equal((await get(path+'?token='+h.data.player.token)).data.me,null);
 assert.equal((await post(path+'/start',{token:g.data.player.token})).status,200);
 const cards=await pool.query('SELECT jsonb_array_length(r.deck)+jsonb_array_length(r.discard)+sum(jsonb_array_length(p.hand)) AS total FROM card_rooms r JOIN card_players p ON p.room_id=r.id WHERE r.code=$1 GROUP BY r.id',[h.data.room.code]);
 assert.equal(Number(cards.rows[0].total),104);
 assert.equal((await post(path,{action:'close',token:g.data.player.token})).status,200);
 assert.equal((await get(path)).status,404);
});
test('seven-day inactivity is reversible, idempotent, and never deletes account, scores or open rooms',async()=>{
 const username='retain_'+Date.now().toString(36);
 const account=await post('/api/auth/register',{username,password:'retention-test-123'});assert.equal(account.status,200);
 const uid=account.data.user.id,cookie=account.cookie.split(';')[0];
 await pool.query("UPDATE users SET last_active_at=now()-interval '8 days' WHERE id=$1",[uid]);
 const flagged=await cron();assert.equal(flagged.status,200);assert.ok(flagged.data.flaggedAccounts>=1);assert.equal(flagged.data.deletedRooms,0);
 let user=(await pool.query('SELECT * FROM users WHERE id=$1',[uid])).rows[0];assert.ok(user.inactive_at);
 const flagTime=user.inactive_at.toISOString();await cron();user=(await pool.query('SELECT * FROM users WHERE id=$1',[uid])).rows[0];assert.equal(user.inactive_at.toISOString(),flagTime);
 const activity=await post('/api/activity',{game:'snake'},{cookie});assert.equal(activity.status,204);
 user=(await pool.query('SELECT * FROM users WHERE id=$1',[uid])).rows[0];assert.equal(user.inactive_at,null);
 await pool.query("UPDATE users SET last_active_at=now()-interval '8 days' WHERE id=$1",[uid]);await cron();
 assert.equal((await post('/api/auth/login',{username,password:'retention-test-123'})).status,200);
 assert.equal((await pool.query('SELECT inactive_at FROM users WHERE id=$1',[uid])).rows[0].inactive_at,null);
 await pool.query("UPDATE users SET last_active_at=now()-interval '8 days' WHERE id=$1",[uid]);await cron();
 assert.equal((await post('/api/scores',{game:'snake',score:3},{cookie})).status,200);
 assert.equal((await pool.query('SELECT inactive_at FROM users WHERE id=$1',[uid])).rows[0].inactive_at,null);
 assert.equal((await post('/api/activity',{game:'snake'})).status,204); // guest path
 assert.equal((await post('/api/activity',{game:'not-a-game'})).status,400);
});
