"use client";
import { useState } from 'react';
export function PasswordOption({enabled,setEnabled,password,setPassword}:{enabled:boolean;setEnabled:(v:boolean)=>void;password:string;setPassword:(v:string)=>void}) {
 return <div className="mt-2 text-sm"><label><input style={{accentColor:"var(--fg)"}} type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} /> require room password</label>{enabled&&<input aria-label="room password" className="inp mt-1 block w-full" type="password" autoComplete="new-password" minLength={4} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder="4-128 characters" />}</div>;
}
export function HostRoomControls({protectedRoom,players,busy,onCommand}:{protectedRoom:boolean;players:{id:number;name:string}[];busy:boolean;onCommand:(body:Record<string,unknown>)=>Promise<unknown>}) {
 const [enabled,setEnabled]=useState(protectedRoom),[password,setPassword]=useState('');
 return <details className="box-dashed mt-2 w-full"><summary>host controls — {protectedRoom?'password protected':'open room'}</summary>
 <p className="dim text-xs mt-2">Existing seats keep access after password changes. Leave password blank to keep the current one. Kicked players may rejoin.</p>
 <PasswordOption enabled={enabled} setEnabled={setEnabled} password={password} setPassword={setPassword}/>
 <button className="btn mt-2" disabled={busy||(enabled&&!protectedRoom&&password.length<4)} onClick={async()=>{await onCommand({action:'access',passwordEnabled:enabled,password});setPassword('');}}>save room access</button>
 <div className="mt-2">{players.map(p=><p key={p.id}>{p.name} <button className="btn" disabled={busy} onClick={()=>{if(window.confirm(`kick ${p.name}? They may rejoin with the room password.`))void onCommand({action:'kick',playerId:p.id});}}>kick {p.name}</button></p>)}</div>
 </details>;
}
