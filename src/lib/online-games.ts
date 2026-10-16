import { packOnlineAction } from './pack/online';
import { packGame } from './pack/catalog';
import { eq, sql } from 'drizzle-orm';
import { rooms, roomPlayers, gameScores } from '@/db/schema';
import { type Transaction } from './room-lifecycle';
import { newMemory, flipMemory, settleMemory, type MemoryState } from './memory-rules';
import { newBoard, playBoard, type BoardState } from './board-rules';
import { newOnlineRace, raceCorrect, type RaceState } from './race-rules';
import { publicRoom, publicSeat } from '@/app/api/rooms/route';
type Room=typeof rooms.$inferSelect;
type Seat=typeof roomPlayers.$inferSelect;
const active=(seats:Seat[])=>seats.filter(s=>!s.isCpu&&!s.leftAt);
export async function settleMemoryRoom(tx:Transaction,room:Room,seats:Seat[]):Promise<Room> {
 if(room.game!=='memory'||room.status!=='playing')return room;
 const v=room.state as unknown as MemoryState;
 if(!v.syms||!v.resolveAt||Date.now()<v.resolveAt)return room;
 const next=settleMemory(v,Date.now(),active(seats).map(s=>s.seat));
 if(next===v)return room;
 const [updated]=await tx.update(rooms).set({state:next as unknown as Record<string,unknown>,turn:next.turn,version:sql`${rooms.version}+1`,updatedAt:new Date()}).where(eq(rooms.id,room.id)).returning();
 return updated;
}
export async function onlineAction(tx:Transaction,room:Room,seats:Seat[],me:Seat,body:Record<string,unknown>):Promise<Response> {
 if(packGame(room.game))return packOnlineAction(tx,room,seats,me,body);
 room=await settleMemoryRoom(tx,room,seats);
 const action=String(body.action),respond=(error:string,status=409)=>Response.json({error,room:publicRoom(room),seats:seats.map(s=>publicSeat(s))},{status});
 if(body.expectVersion!==undefined&&body.expectVersion!==room.version)return respond('board updated; try again');
 const isBoard=['tictactoe','connect4'].includes(room.game),isRace=['math','typing'].includes(room.game);
 let state:Record<string,unknown>,turn=room.turn,status=room.status,round=room.round;
 let scores:number[]|null=null;
 if(['start','rematch','restart'].includes(action)) {
  if(me.seat!==room.hostSeat)return respond('host only',403);
  if(action==='start'&&room.status!=='waiting')return respond('already started');
  if(action==='rematch'&&room.status!=='finished')return respond('round is not finished');
  if(seats.length<2)return respond('need at least 2 players',400);
  turn=isRace?-1:active(seats)[0]?.seat??0;
  if(room.game==='memory')state=newMemory(seats.length,turn) as unknown as Record<string,unknown>;
  else if(isRace)state=newOnlineRace(room.game,seats.length) as unknown as Record<string,unknown>;
  else if(isBoard){
   const requested=body.state as Partial<BoardState>|undefined;
   const reset=requested?.sc&&Object.values(requested.sc).every(v=>v===0);
   state=newBoard(room.game,reset?undefined:(room.state as Partial<BoardState>).sc) as unknown as Record<string,unknown>;
  }else return respond('unsupported game',400);
  status='playing';round++;
  await tx.update(roomPlayers).set({score:0}).where(eq(roomPlayers.roomId,room.id));
 }else {
  if(status!=='playing')return respond('game is not playing');
  if(room.game==='memory') {
   if(action!=='memory-flip')return respond('use a memory flip action',400);
   if(me.seat!==room.turn)return respond('not your turn');
   const previous=room.state as unknown as MemoryState;
   const next=flipMemory(previous,Number.isInteger(body.index)?body.index as number:-1,me.name,Date.now());
   if(next===previous)return respond('card is unavailable or two cards are still showing');
   state=next as unknown as Record<string,unknown>;turn=next.turn;
   if(next.done){status='finished';scores=next.pairs;}
   await tx.update(roomPlayers).set({score:next.pairs[me.seat]}).where(eq(roomPlayers.id,me.id));
  }else if(isBoard) {
   if(action!=='move')return respond('unknown action',400);
   const actor=seats.find(s=>s.seat===room.turn);
   if(me.seat!==room.turn&&!actor?.isCpu)return respond('not your turn');
   if(body.expectTurn!==undefined&&body.expectTurn!==room.turn)return respond('not your turn');
   const requested=(body.state as Partial<BoardState>|undefined)?.b;
   const next=playBoard(room.game,room.state as unknown as BoardState,requested,room.turn);
   if(!next)return respond('illegal board move',400);
   state=next.state as unknown as Record<string,unknown>;turn=next.turn;
   if(next.result){status='finished';scores=seats.map(s=>next.result==='draw'?0:((s.seat%2===0?'X':'O')===next.result?1:0));}
  }else if(isRace) {
   const previous=room.state as unknown as RaceState,key=room.game==='math'?'qid':'lid';
   if(body.challenge!==previous[key])return respond('stale challenge');
   if(action==='race-timeout') {
    if(Date.now()<previous.endsAt)return respond('challenge is not expired');
    const next=newOnlineRace(room.game,seats.length,previous.level,previous.scores);
    next.log=[`timeout on ${room.game==='math'?previous.q:previous.line}`,...previous.log].slice(0,6);
    state=next as unknown as Record<string,unknown>;
   }else if(action==='race-answer') {
    if(Date.now()>=previous.endsAt)return respond('time is up');
    if(!raceCorrect(room.game,previous,body.answer))return respond('wrong answer',422);
    const totals=[...previous.scores];totals[me.seat]=(totals[me.seat]??0)+(room.game==='math'?previous.level:1);
    const won=totals[me.seat]>=(room.game==='math'?30:8);
    const next=newOnlineRace(room.game,seats.length,previous.level+(won?0:1),totals);
    next.log=[`${me.name}: scored${won?' - WINS':''}`,...previous.log].slice(0,6);
    state=next as unknown as Record<string,unknown>;
    await tx.update(roomPlayers).set({score:totals[me.seat]}).where(eq(roomPlayers.id,me.id));
    if(won){status='finished';scores=totals;}
   }else return respond('use a race answer or timeout action',400);
  }else return respond('unsupported game',400);
 }
 const [updated]=await tx.update(rooms).set({state,turn,status,round,version:sql`${rooms.version}+1`,updatedAt:new Date()}).where(eq(rooms.id,room.id)).returning();
 if(scores)for(const seat of active(seats)){
  const score=scores[seat.seat]??0;
  if(isBoard&&score===0)continue;
  await tx.insert(gameScores).values({userId:seat.userId,playerName:seat.name,game:room.game,score,meta:{room:room.code,round,multiplayer:true,serverValidated:true}});
 }
 const fresh=await tx.select().from(roomPlayers).where(eq(roomPlayers.roomId,room.id)).orderBy(roomPlayers.seat);
 return Response.json({ok:true,room:publicRoom(updated),seats:fresh.map(s=>publicSeat(s))});
}
