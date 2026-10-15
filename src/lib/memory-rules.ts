export const MEMORY_REVEAL_MS = 1800;
export type MemoryState = { syms:string[]; open:number[]; matched:number[]; pairs:number[]; turn:number; log:string[]; done:boolean; resolveAt:number|null };
export function newMemory(players:number, turn=0):MemoryState {
 const symbols='@#$%&*+=?!ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'.split('');
 const shuffled=<T>(values:T[])=>{const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const chosen=shuffled(symbols).slice(0,Math.max(6,Math.min(18,4+Math.round(players*1.4))));
 return {syms:shuffled([...chosen,...chosen]),open:[],matched:[],pairs:Array(players).fill(0),turn,log:[],done:false,resolveAt:null};
}
export function settleMemory(v:MemoryState,now:number,active?:number[]):MemoryState {
 if(!v.resolveAt || now<v.resolveAt || v.open.length!==2)return v;
 const [a,b]=v.open;
 const next=v.syms[a]===v.syms[b]?v.turn:nextMemorySeat(v.turn,v.pairs.length,active);
 return {...v,open:[],resolveAt:null,turn:next};
}
export function nextMemorySeat(turn:number,players:number,active?:number[]) {
 for(let offset=1;offset<=players;offset++){const next=(turn+offset)%players;if(!active || active.includes(next))return next;}
 return turn;
}
export function flipMemory(v:MemoryState,index:number,who:string,now:number):MemoryState {
 if(v.done || !Number.isInteger(index) || index<0 || index>=v.syms.length || v.open.length>=2 || v.open.includes(index) || v.matched.includes(index))return v;
 const open=[...v.open,index];
 if(open.length===1)return {...v,open};
 const [a,b]=open,match=v.syms[a]===v.syms[b];
 const matched=match?[...v.matched,a,b]:v.matched;
 const pairs=[...v.pairs];if(match)pairs[v.turn]++;
 return {...v,open,matched,pairs,resolveAt:now+MEMORY_REVEAL_MS,done:matched.length===v.syms.length,
 log:[`${who}: ${v.syms[a]} ${v.syms[b]} ${match?'MATCH (+1, goes again)':'no match -> next player'}`,...v.log].slice(0,6)};
}
