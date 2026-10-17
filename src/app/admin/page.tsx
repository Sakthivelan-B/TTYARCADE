"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Shell, Stats } from '@/components/term';
import { gameName } from '@/lib/games';
type User={id:number;username:string;isAdmin:boolean;blocked:boolean;blockedReason:string|null;createdAt:string;lastLoginAt:string|null;lastActiveAt:string;inactiveAt:string|null;plays:number;best:number};
type GameStat={userId:number;game:string;plays:number;best:number;lastPlayedAt:string};
type Score={id:number;userId:number|null;playerName:string;game:string;score:number;createdAt:string};
type Data={users:User[];gameStats:GameStat[];recentScores:Score[];totals:{userCount:number;blockedCount:number;scoreCount:number;openRooms:number}};
type Ads={placements:{id:string;enabled:boolean;updatedAt:string}[];mode:string;requestedMode:string;clientId:string;slotId:string};
const date=(s:string|null)=>s?new Date(s).toLocaleString():'never';
export default function AdminPage(){
 const [data,setData]=useState<Data|null>(null),[ads,setAds]=useState<Ads|null>(null),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[search,setSearch]=useState(''),[reason,setReason]=useState<Record<number,string>>({});
 const load=useCallback(async()=>{
  const [u,a]=await Promise.all([fetch('/api/admin/users',{cache:'no-store',signal:AbortSignal.timeout(10000)}),fetch('/api/admin/ads',{cache:'no-store',signal:AbortSignal.timeout(10000)})]);
  const users=await u.json(),advertising=await a.json();
  if(!u.ok)throw new Error(users.error??'admin only');
  setData(users);if(!a.ok)throw new Error(advertising.error??'could not load placements');setAds(advertising);
 },[]);
 useEffect(()=>{void load().catch(e=>setErr(e.message));},[load]);
 async function mutate(url:string,body:Record<string,unknown>){
  if(busy)return;setBusy(true);setErr('');
  try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});const d=await r.json();if(!r.ok)throw new Error(d.error??'failed');await load();}catch(e){setErr(e instanceof Error?e.message:'network unavailable');}finally{setBusy(false);}
 }
 if(!data)return <Shell path="/admin" title="admin"><p>{err?'! '+err:'loading...'}</p><p className="dim mt-2 text-sm">Register an optional account, then the database owner must set users.is_admin=true using trusted SQL. ADMIN_USERNAMES is not supported. See ADMIN_GUIDE.md.</p><Link href="/login" className="btn mt-3">login</Link><button className="btn ml-2" onClick={()=>void load().catch(e=>setErr(e.message))}>retry</button></Shell>;
 const users=data.users.filter(u=>(u.username+' '+u.id).toLowerCase().includes(search.toLowerCase()));
 return <Shell path="/admin" title="admin — players and advertising" help="Trusted administrator controls. Accounts are optional; guest names are not persistent identities." wide>
 <Stats items={[["accounts",data.totals.userCount],["blocked",data.totals.blockedCount],["score rows",data.totals.scoreCount],["stored rooms",data.totals.openRooms]]}/>
 {err&&<p className="mt-3" role="alert">! {err}</p>}
 <section className="box mt-4"><h2 className="font-bold">advertising placements</h2>
 <p className="mt-2">configured mode: <b>{ads?.requestedMode??'unknown'}</b> · effective mode: <b>{ads?.mode??'unavailable'}</b></p>
 {ads?.requestedMode==='live'&&ads.mode!=='live'&&<p>! Invalid/missing AdSense configuration: live loading is disabled. Fix hosting environment and rebuild.</p>}
 <p className="dim text-sm mt-2">Publisher: {ads?.clientId||'not set'} · slot: {ads?.slotId||'not set'}</p>
 <p className="dim text-sm">Enabled means eligible, not guaranteed ad delivery. Off mode loads nothing; placeholder is text only. Live requires valid environment IDs, site approval and your real CMP consent integration. These switches cannot override consent or enable Auto ads.</p>
 {ads?.placements.map(p=><div key={p.id} className="box-dashed mt-2"><p><b>{p.id}</b> — {p.enabled?'enabled':'disabled'}</p><p className="dim text-xs">updated: {date(p.updatedAt)}</p><button className="btn mt-2" disabled={busy} onClick={()=>void mutate('/api/admin/ads',{id:p.id,enabled:!p.enabled})}>{p.enabled?'disable':'enable'} {p.id}</button></div>)}
 <p className="dim text-xs mt-2">Changes apply on subsequent home/leaderboard page requests, not retroactively to an already loaded ad. No gameplay ads. Publisher ID, slot ID, script URL and mode are owner-managed hosting environment settings; changing public settings requires rebuild/redeploy. This is not a Google revenue/impression dashboard.</p>
 </section>
 <h2 className="font-bold mt-5">registered players</h2><input aria-label="search players" className="inp mt-2" placeholder="search username or ID" value={search} onChange={e=>setSearch(e.target.value)}/>
 <p className="dim text-xs mt-2">Activity = login, actual game input or submitted score; room polling is not activity. Seven-day inactivity flags are reversible and never automatically delete accounts. Plays = accepted score rows, not all game starts.</p>
 <div className="mt-3 space-y-2">{users.map(u=><details className="box-dashed" key={u.id}><summary><b>{u.username}</b> #{u.id} · {u.blocked?'BLOCKED':u.isAdmin?'admin':'account'} · {u.inactiveAt?'inactive flagged':'not flagged'} · {u.plays} score submissions</summary>
 <p className="text-sm mt-2">registered: {date(u.createdAt)}<br/>last login: {date(u.lastLoginAt)}<br/>last game/login activity: {date(u.lastActiveAt)}<br/>inactive flag set: {u.inactiveAt?date(u.inactiveAt):'not flagged'}</p>
 {u.blockedReason&&<p>block reason: {u.blockedReason}</p>}
 <div className="box mt-2 text-sm"><p className="font-bold">per-game scores</p>{data.gameStats.filter(g=>g.userId===u.id).map(g=><p key={g.game}>{gameName(g.game)}: best {g.best} · {g.plays} submissions · latest {date(g.lastPlayedAt)}</p>)}{!u.plays&&<p>no scores yet</p>}</div>
 <div className="mt-2 flex flex-wrap gap-2">{!u.blocked?<><input aria-label={`block reason for ${u.username}`} className="inp" placeholder="reason shown to the player" value={reason[u.id]??''} onChange={e=>setReason(r=>({...r,[u.id]:e.target.value}))}/><button className="btn" disabled={busy||u.isAdmin} onClick={()=>void mutate('/api/admin/users',{id:u.id,action:'block',reason:reason[u.id]??''})}>block</button></>:<button className="btn" disabled={busy} onClick={()=>void mutate('/api/admin/users',{id:u.id,action:'unblock'})}>unblock</button>}
 <button className="btn" disabled={busy||u.isAdmin} onClick={()=>{if(confirm(`Permanently remove all scores for ${u.username}? Historical game logs remain.`))void mutate('/api/admin/users',{id:u.id,action:'wipe-scores'});}}>wipe scores</button>
 <button className="btn" disabled={busy||u.isAdmin} onClick={()=>{if(confirm(`Permanently delete account ${u.username} and their scores? Historical log records remain without account linkage.`))void mutate('/api/admin/users',{id:u.id,action:'delete'});}}>delete account</button></div>
 </details>)}</div>
 <details className="box mt-4"><summary>recent score submissions — accounts and guests (latest 100)</summary><div className="overflow-x-auto mt-2"><table className="text-sm w-full"><thead><tr><th>player</th><th>identity</th><th>game</th><th>score</th><th>submitted</th></tr></thead><tbody>{data.recentScores.map(s=><tr key={s.id}><td>{s.playerName}</td><td>{s.userId===null?'guest / detached account':'account #'+s.userId}</td><td>{gameName(s.game)}</td><td>{s.score}</td><td>{date(s.createdAt)}</td></tr>)}</tbody></table></div></details>
 <div className="box-dashed mt-4 text-sm"><p>Block: destroys account sessions, revokes room capabilities, transfers host control and hides attributed scores from public rankings. It does not ban a device/IP or prevent guest play. Unblock restores account eligibility, not old sessions/seat tokens. Host kick affects only one room and allows rejoining.</p><p className="mt-2">Wipe/delete are explicit destructive operations, separate from reversible seven-day flags. Historical game logs are retained. Do not use delete for routine inactivity. Password hashes, sessions, room tokens and private hands are never exposed by this dashboard.</p><p className="mt-2">Setup, consent, deployment and operating instructions: ADMIN_GUIDE.md and HANDOVER.md in the repository.</p></div>
 <div className="flex gap-2 mt-3"><button className="btn" disabled={busy} onClick={()=>{setErr('');void load().catch(e=>setErr(e.message));}}>refresh</button><Link className="btn" href="/">back</Link></div>
 </Shell>;
}
