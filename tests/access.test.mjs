import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
if(process.env.ALLOW_DATABASE_TESTS!=='1'||!process.env.TEST_DATABASE_URL)throw Error('Use ALLOW_DATABASE_TESTS=1 with isolated TEST_DATABASE_URL');
const testIp=`198.18.${(process.pid>>>8)%256}.${process.pid%256}`;
const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL,max:2}),base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
async function post(path,body,cookie=''){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':testIp,...(cookie?{cookie}:{})},body:JSON.stringify(body)});return {status:r.status,data:r.status===204?null:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
async function get(path,cookie=''){const r=await fetch(base+path,{headers:cookie?{cookie}:{}});return {status:r.status,data:await r.json()};}
test.after(()=>pool.end());
for(const game of ['tictactoe','connect4','memory','math','typing','crazy8'])test(game+': password + kick permissions, rotated credentials, rejoin and mid-game preservation',async()=>{
 const card=game==='crazy8',root=card?'/api/cards/rooms':'/api/rooms',secret='access-secret-'+game;
 const h=await post(root,{game,name:'host',hostName:'host',passwordEnabled:true,password:secret});assert.equal(h.status,200);
 const host=card?h.data.player:h.data.me,path=root+'/'+h.data.room.code;
 const join=body=>post(card?path+'/join':path,{action:'join',name:'friend',...body});
 assert.equal((await join({})).status,403);assert.equal((await join({password:'wrong'})).status,403);
 let guest=await join({password:secret});assert.equal(guest.status,200);guest=card?guest.data.player:guest.data.me;
 const publicData=JSON.stringify((await get(path)).data);assert.ok(!publicData.includes(secret));assert.ok(!publicData.includes('passwordHash'));assert.ok(!publicData.includes('password_hash'));
 assert.equal((await get(path)).data.room.passwordRequired,true);
 assert.equal((await post(path,{action:'kick',token:guest.token,playerId:host.id})).status,403);
 assert.equal((await post(path,{action:'access',token:guest.token,passwordEnabled:false})).status,403);
 assert.equal((await post(path,{action:'kick',token:host.token,playerId:host.id})).status,400);
 assert.equal((await post(path,{action:'kick',token:host.token,playerId:guest.id})).status,200);
 assert.equal((await join({token:guest.token})).status,403);
 const again=await join({token:guest.token,password:secret});assert.equal(again.status,200);let next=card?again.data.player:again.data.me;assert.notEqual(next.token,guest.token);
 assert.equal((await post(card?path+'/start':path,{action:'start',token:host.token})).status,200);
 const before=await get(path+'?token='+next.token),hand=card?before.data.me.hand:null;
 assert.equal((await post(path,{action:'kick',token:host.token,playerId:next.id})).status,200);
 const gone=await get(path+'?token='+next.token);assert.equal(gone.data.me,null);assert.equal(gone.data.room.status,'playing');
 assert.equal((await post(card?path+'/action':path,{action:card?'draw':'memory-flip',index:0,token:next.token})).status,403);
 const restored=await join({password:secret});assert.equal(restored.status,200);next=card?restored.data.player:restored.data.me;
 if(card){assert.deepEqual(next.hand,hand);const total=await pool.query('SELECT jsonb_array_length(r.deck)+jsonb_array_length(r.discard)+sum(jsonb_array_length(p.hand)) AS total FROM card_rooms r JOIN card_players p ON p.room_id=r.id WHERE r.code=$1 GROUP BY r.id',[h.data.room.code]);assert.equal(Number(total.rows[0].total),104);}
 assert.equal((await post(path,{action:'access',token:host.token,passwordEnabled:true,password:'changed-secret'})).status,200);
 assert.equal((await join({token:next.token})).status,200,'saved valid seat reconnects without password');
 assert.equal((await post(path,{action:'kick',token:host.token,playerId:next.id})).status,200);
 assert.equal((await join({password:secret})).status,403);
 assert.equal((await post(path,{action:'access',token:host.token,passwordEnabled:false})).status,200);
 assert.equal((await get(path)).data.room.passwordRequired,false);assert.equal((await join({})).status,200);
 assert.equal((await post(path,{action:'close',token:host.token})).status,200);
});
test('admin: backend authorization, placement persistence, clear account activity/per-game/guest details',async()=>{
 assert.equal((await get('/api/admin/ads')).status,403);assert.equal((await post('/api/admin/ads',{id:'home-footer',enabled:false})).status,403);
 const a=await post('/api/auth/register',{username:'accessadmin_'+Date.now().toString(36),password:'isolated-access-test-123'});assert.equal(a.status,200);
 assert.equal((await get('/api/admin/ads',a.cookie)).status,403);
 await pool.query('UPDATE users SET is_admin=true WHERE id=$1',[a.data.user.id]);
 await post('/api/scores',{game:'snake',score:12},a.cookie);await post('/api/scores',{game:'math',score:3,playerName:'scoreguest'});
 const users=await get('/api/admin/users',a.cookie);assert.equal(users.status,200);const mine=users.data.users.find(u=>u.id===a.data.user.id);assert.ok(mine.lastActiveAt);assert.equal(mine.inactiveAt,null);assert.ok(users.data.gameStats.some(s=>s.userId===mine.id&&s.game==='snake'&&s.best===12));assert.ok(users.data.recentScores.some(s=>s.userId===null&&s.playerName==='scoreguest'));
 assert.equal((await post('/api/admin/ads',{id:'home-footer',enabled:'false'},a.cookie)).status,400);
 assert.equal((await post('/api/admin/ads',{id:'invented',enabled:false},a.cookie)).status,400);
 for(const id of ['home-footer','leaderboard-footer']){assert.equal((await post('/api/admin/ads',{id,enabled:false},a.cookie)).status,200);assert.equal((await get('/api/admin/ads',a.cookie)).data.placements.find(p=>p.id===id).enabled,false);assert.equal((await post('/api/admin/ads',{id,enabled:true},a.cookie)).status,200);}
 assert.equal((await post('/api/admin/users',{id:mine.id,action:'delete'},a.cookie)).status,400);
});
test('kicking a player who is choosing an eight suit cannot stall Crazy Eights',async()=>{
 const h=await post('/api/cards/rooms',{hostName:'host'}),path='/api/cards/rooms/'+h.data.room.code,g=await post(path+'/join',{name:'choosing'});await post(path+'/start',{token:h.data.player.token});
 const room=(await pool.query('SELECT * FROM card_rooms WHERE code=$1',[h.data.room.code])).rows[0];
 const players=(await pool.query('SELECT * FROM card_players WHERE room_id=$1 ORDER BY position',[room.id])).rows;
 let card=players[1].hand.find(c=>c.slice(1)==='8');
 if(!card){let index=room.deck.findIndex(c=>c.slice(1)==='8');if(index>=0){card=room.deck[index];room.deck[index]=players[1].hand[0];players[1].hand[0]=card;}else{index=players[0].hand.findIndex(c=>c.slice(1)==='8');assert.ok(index>=0);card=players[0].hand[index];players[0].hand[index]=players[1].hand[0];players[1].hand[0]=card;}}
 await pool.query('UPDATE card_rooms SET deck=$1::jsonb,turn=1 WHERE id=$2',[JSON.stringify(room.deck),room.id]);for(const p of players)await pool.query('UPDATE card_players SET hand=$1::jsonb WHERE id=$2',[JSON.stringify(p.hand),p.id]);
 const play=await post(path+'/action',{token:g.data.player.token,action:'play',card});assert.equal(play.status,200);assert.equal(play.data.needsSuit,true);
 assert.equal((await post(path,{token:h.data.player.token,action:'kick',playerId:g.data.player.id})).status,200);const after=(await get(path)).data.room;assert.ok(['S','H','D','C'].includes(after.currentSuit));assert.equal(after.turn,0);
 assert.equal((await post(path+'/action',{token:h.data.player.token,action:'draw'})).status,200);
 const total=await pool.query('SELECT jsonb_array_length(r.deck)+jsonb_array_length(r.discard)+sum(jsonb_array_length(p.hand)) AS total FROM card_rooms r JOIN card_players p ON p.room_id=r.id WHERE r.code=$1 GROUP BY r.id',[room.code]);assert.equal(Number(total.rows[0].total),104);
});
