import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
if(process.env.ALLOW_DATABASE_TESTS!=='1'||!process.env.TEST_DATABASE_URL)throw new Error('Use isolated TEST_DATABASE_URL with ALLOW_DATABASE_TESTS=1');
const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL,max:2}),base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
async function post(path,data){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,data:await r.json()};}
async function get(path){return (await fetch(base+path)).json();}
async function generic(game){const h=await post('/api/rooms',{game,name:'host'}),path='/api/rooms/'+h.data.room.code,g=await post(path,{action:'join',name:'friend'});const started=await post(path,{action:'start',token:h.data.me.token});return {path,host:h.data.me.token,guest:g.data.me.token,room:started.data.room};}
test.after(()=>pool.end());
test('memory serializes simultaneous flips, cannot hide the second card early, and rejects state/score forgery',async()=>{
 const {path,host,guest,room}=await generic('memory');
 const results=await Promise.all([0,1].map(index=>post(path,{action:'memory-flip',index,token:host,expectVersion:room.version})));
 assert.equal(results.filter(r=>r.status===200).length,1);assert.equal(results.filter(r=>r.status===409).length,1);
 let live=(await get(path)).room;assert.equal(live.state.open.length,1);
 const index=live.state.syms.findIndex((_,i)=>!live.state.open.includes(i));
 assert.equal((await post(path,{action:'memory-flip',index,token:guest})).status,409);
 const second=await post(path,{action:'memory-flip',index,token:host,expectVersion:live.version});assert.equal(second.status,200);assert.equal(second.data.room.state.open.length,2);
 assert.equal((await post(path,{action:'memory-flip',index:3,token:host})).status,409);
 assert.equal((await post(path,{action:'move',token:host,state:{done:true,pairs:[999,0]},score:999,status:'finished'})).status,400);
 live=(await get(path)).room;assert.notEqual(live.state.pairs[0],999);
});
test('both race games enforce challenge identity, deadline and one accepted concurrent answer',async()=>{
 for(const game of ['math','typing']){
  const {path,host,guest,room}=await generic(game),key=game==='math'?'qid':'lid',answer=String(game==='math'?room.state.a:room.state.line);
  assert.equal((await post(path,{action:'race-answer',token:host,challenge:room.state[key],answer:'wrong'})).status,422);
  assert.equal((await post(path,{action:'race-timeout',token:host,challenge:room.state[key]})).status,409);
  const results=await Promise.all([host,guest].map(token=>post(path,{action:'race-answer',token,challenge:room.state[key],answer,expectVersion:room.version})));
  assert.equal(results.filter(r=>r.status===200).length,1);
  let live=(await get(path)).room;assert.equal(live.state.scores.reduce((a,b)=>a+b,0),1);
  assert.equal((await post(path,{action:'race-answer',token:host,challenge:room.state[key],answer})).status,409);
  await pool.query("UPDATE rooms SET state=jsonb_set(state,'{endsAt}',to_jsonb((extract(epoch from now())*1000-1000)::bigint)) WHERE code=$1",[live.code]);
  live=(await get(path)).room;
  assert.equal((await post(path,{action:'race-answer',token:host,challenge:live.state[key],answer:String(game==='math'?live.state.a:live.state.line)})).status,409);
  assert.equal((await post(path,{action:'race-timeout',token:host,challenge:live.state[key]})).status,200);
 }
});
test('board moves enforce symbol, one changed cell, gravity and stale versions',async()=>{
 for(const game of ['tictactoe','connect4']){
  const {path,host,room}=await generic(game);const wrong=[...room.state.b];wrong[0]='O';
  assert.equal((await post(path,{action:'move',token:host,state:{b:wrong}})).status,400);
  if(game==='connect4'){const floating=[...room.state.b];floating[0]='X';assert.equal((await post(path,{action:'move',token:host,state:{b:floating}})).status,400);}
  const board=[...room.state.b];board[game==='connect4'?35:0]='X';
  assert.equal((await post(path,{action:'move',token:host,state:{b:board,sc:{X:999,O:0,draw:0}},score:999,status:'finished',expectVersion:room.version})).status,200);
  const live=(await get(path)).room;assert.equal(live.status,'playing');assert.equal(live.state.sc.X,0);
  assert.equal((await post(path,{action:'move',token:host,state:{b:board},expectVersion:room.version})).status,409);
 }
});
test('Crazy Eights completes a full human-v-human game with validated hands, draws and wild suits',async()=>{
 const h=await post('/api/cards/rooms',{hostName:'cardhost'}),path='/api/cards/rooms/'+h.data.room.code,g=await post(path+'/join',{name:'cardfriend'});
 const tokens=[h.data.player.token,g.data.player.token];await post(path+'/start',{token:tokens[0]});
 let finished=false;
 for(let step=0;step<1500;step++){
  const publicState=await get(path);if(publicState.room.status==='finished'){finished=true;break;}
  const turn=publicState.room.turn,live=await get(path+'?token='+tokens[turn]),hand=live.me.hand,top=live.room.discardTop;
  const card=hand.find(c=>c.slice(1)==='8'||c[0]===(live.room.currentSuit||top[0])||c.slice(1)===top.slice(1));
  const body={token:tokens[turn],expectTurn:turn,action:card?'play':'draw'};
  if(card){body.card=card;if(card.slice(1)==='8')body.suit=hand.find(c=>c!==card)?.[0]||'S';}
  const result=await post(path+'/action',body);assert.equal(result.status,200,JSON.stringify(result.data));
  const after=await get(path+'?token='+tokens[turn]);assert.equal(after.me.hand.length,hand.length+(card?-1:1));
  const total=await pool.query('SELECT jsonb_array_length(r.deck)+jsonb_array_length(r.discard)+sum(jsonb_array_length(p.hand)) AS total FROM card_rooms r JOIN card_players p ON p.room_id=r.id WHERE r.code=$1 GROUP BY r.id',[h.data.room.code]);assert.equal(Number(total.rows[0].total),104);
 }
 assert.equal(finished,true,'game must finish within the regression simulation limit');
 const final=await get(path);assert.ok(final.room.winner);assert.equal((await post(path+'/action',{token:tokens[0],action:'draw'})).status,400);
});
test('late arrivals cannot create nonexistent race/memory slots; explicit leave preserves active turn',async()=>{
 for(const game of ['memory','math','typing']){
  const {path,host,guest}=await generic(game);
  assert.equal((await post(path,{action:'join',name:'late'})).status,400);
  if(game==='memory')assert.equal((await post(path,{action:'memory-flip',index:0,token:host})).status,200);
  assert.equal((await post(path,{action:'leave',token:host})).status,200);
  const live=(await get(path)).room;assert.equal(live.hostSeat,1);
  if(game==='memory'){assert.equal(live.turn,1);assert.equal(live.state.turn,1);assert.deepEqual(live.state.open,[]);assert.equal((await post(path,{action:'memory-flip',index:1,token:guest})).status,200);}
 }
});
test('moderating an active host transfers control and revokes old capabilities in both room engines',async()=>{
 async function account(label){const response=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:label+'_'+Date.now().toString(36),password:'isolated-gameplay-test-123'})});return {data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};}
 const admin=await account('mod'),host=await account('removed');assert.ok(admin.data.user);assert.ok(host.data.user);
 await pool.query('UPDATE users SET is_admin=true WHERE id=$1',[admin.data.user.id]);
 async function authenticated(path,body,cookie){const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',cookie},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};}
 // More simultaneous authenticated room actions than the pool's five connections:
 // auth resolution/activity updates must not need a second connection inside a lock.
 const concurrent=await Promise.all(Array.from({length:7},async()=>{
  const created=await authenticated('/api/rooms',{game:'math',name:'parallel'},host.cookie),p='/api/rooms/'+created.data.room.code;
  await post(p,{action:'join',name:'other'});
  const started=await authenticated(p,{action:'start',token:created.data.me.token},host.cookie);
  return {path:p,token:created.data.me.token,status:started.status};
 }));
 assert.ok(concurrent.every(r=>r.status===200));
 for(const room of concurrent)await post(room.path,{action:'close',token:room.token});
 const generic=await authenticated('/api/rooms',{game:'memory',name:'moderatedhost'},host.cookie),path='/api/rooms/'+generic.data.room.code;
 const friend=await post(path,{action:'join',name:'remaining'});await post(path,{action:'start',token:generic.data.me.token});
 const card=await authenticated('/api/cards/rooms',{hostName:'moderatedcardhost'},host.cookie),cardpath='/api/cards/rooms/'+card.data.room.code;
 const other=await post(cardpath+'/join',{name:'remaining'});await post(cardpath+'/start',{token:card.data.player.token});
 assert.equal((await authenticated('/api/admin/users',{id:host.data.user.id,action:'block'},admin.cookie)).status,200);
 const after=await get(path);assert.equal(after.room.hostSeat,friend.data.me.seat);assert.equal(after.room.turn,friend.data.me.seat);
 assert.equal((await post(path,{action:'memory-flip',token:generic.data.me.token,index:0})).status,403);
 const cardAfter=await get(cardpath);assert.equal(cardAfter.room.hostPosition,other.data.player.position);
 assert.equal((await post(cardpath+'/action',{action:'draw',token:card.data.player.token})).status,403);
 assert.equal((await post(path,{action:'close',token:friend.data.me.token})).status,200);
 assert.equal((await post(cardpath,{action:'close',token:other.data.player.token})).status,200);
});
