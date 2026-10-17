import { ALL_WORDS } from './words';
const integer=(n:number)=>Math.floor(Math.random()*n);
const pick=<T>(a:readonly T[])=>a[integer(a.length)];
const shuffle=<T>(a:readonly T[])=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=integer(i+1);[b[i],b[j]]=[b[j],b[i]];}return b;};
export type RaceState={level:number;endsAt:number;scores:number[];log:string[];turn:number;q?:string;a?:number;qid?:number;line?:string;lid?:number};
export function newOnlineRace(game:string,players:number,level=1,scores?:number[],now=Date.now()):RaceState {
 const state:RaceState={level,endsAt:0,scores:scores??Array(players).fill(0),turn:0,log:[]};
 const id=crypto.getRandomValues(new Uint32Array(1))[0];
 if(game==='math'){
  const ops=['+'];if(level>=2)ops.push('-');if(level>=3)ops.push('x');if(level>=5)ops.push('/');const op=pick(ops),max=5+level*5;
  let a=1+integer(max),b=1+integer(max);
  if(op==='x'){a=2+integer(Math.min(4+level,20));b=2+integer(Math.min(4+level,15));}
  if(op==='/'){b=2+integer(Math.min(3+level,12));a=b*(1+integer(Math.min(3+level,15)));}
  if(op==='-'&&b>a)[a,b]=[b,a];
  let answer=op==='+'?a+b:op==='-'?a-b:op==='x'?a*b:a/b,q=`${a} ${op} ${b}`;
  if(level>=7&&integer(2)){const c=1+integer(10),op2=pick(['+','-']);answer=op2==='+'?answer+c:answer-c;q+=` ${op2} ${c}`;}
  Object.assign(state,{q,a:answer,qid:id,endsAt:now+Math.max(8,26-level*1.5)*1000});
 }else{
  const pool=ALL_WORDS.filter(w=>w.length<=Math.min(4+level,9));
  const line=shuffle(pool).slice(0,Math.min(3+level,14)).map(w=>level>=6&&integer(10)<3?w.toUpperCase():w).join(' ')+(level>=4?pick(['.','!','?',';']):'');
  Object.assign(state,{line,lid:id,endsAt:now+Math.ceil(line.length*Math.max(.22,.55-level*.03)*10)*100});
 }
 return state;
}
export function raceCorrect(game:string,state:RaceState,answer:unknown) {
 if(typeof answer!=='string'||answer.length>4096)return false;
 return game==='math'?answer.trim()!==''&&Number.isFinite(Number(answer))&&Number(answer)===state.a:answer===state.line;
}
