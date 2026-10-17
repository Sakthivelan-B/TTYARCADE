"use client";
import { useEffect, useState } from 'react';
const KEY='ttyarcade-active-game-tab';
const CHANNEL='ttyarcade-game-tabs';
type Claim={id:string;at:number};
let documentId:string|undefined;
function parse(value:unknown):Claim|null {
 try {const data=typeof value==='string'?JSON.parse(value):value;return data&&typeof data.id==='string'&&typeof data.at==='number'&&Number.isFinite(data.at)?data:null;}catch{return null;}
}
// Local tab ownership only: never sends a server leave, deletes a room/token,
// or signs out an account. Each document gets a fresh ID (duplicated tabs can
// inherit sessionStorage, so sessionStorage IDs are deliberately not used).
export function useSingleGameTab(active:boolean) {
 useEffect(()=>{
  if(!active)return;
  documentId??=typeof crypto.randomUUID==='function'?crypto.randomUUID():`${Date.now()}-${Math.random()}`;
  const id=documentId;
  let channel:BroadcastChannel|null=null,exiting=false,claim:Claim;
  const current=()=>{try{return parse(localStorage.getItem(KEY));}catch{return null;}};
  const exit=()=>{if(exiting)return;exiting=true;window.location.replace('/?game-tab=inactive');};
  const inspect=(incoming:Claim|null)=>{
   if(!incoming||incoming.id===id)return;
   const latest=current();
   // Read current ownership, not a possibly delayed storage/channel event.
   if(latest){if(latest.id!==id)exit();}
   else if(incoming.at>claim.at||(incoming.at===claim.at&&incoming.id>id))exit();
  };
  try{channel=new BroadcastChannel(CHANNEL);channel.onmessage=event=>inspect(parse(event.data));}catch{/* storage events still work */}
  const acquire=()=>{
   claim={id,at:Math.max(Date.now(),(current()?.at??0)+1)};
   try{localStorage.setItem(KEY,JSON.stringify(claim));}catch{/* channel fallback */}
   channel?.postMessage(claim);
  };
  const onStorage=(event:StorageEvent)=>{if(event.key===KEY)inspect(parse(event.newValue));};
  const onShow=(event:PageTransitionEvent)=>{if(event.persisted)acquire();};
  window.addEventListener('storage',onStorage);window.addEventListener('pageshow',onShow);
  acquire();
  return()=>{window.removeEventListener('storage',onStorage);window.removeEventListener('pageshow',onShow);channel?.close();};
 },[active]);
}
export function GameTabNotice(){
 const [show,setShow]=useState(false);
 useEffect(()=>{if(new URLSearchParams(window.location.search).get('game-tab')==='inactive'){setShow(true);const url=new URL(window.location.href);url.searchParams.delete('game-tab');window.history.replaceState(null,'',url.pathname+url.search+url.hash);}},[]);
 return show?<p className="box-dashed mt-3 text-sm" role="status">This game tab was stopped because another game tab was opened. Your room and saved seat were not deleted. Continue in the newer tab.</p>:null;
}
