export type Mark=''|'X'|'O';
export type BoardState={b:Mark[];sc:{X:number;O:number;draw:number}};
export function boardResult(game:string,b:Mark[]):Mark|'draw'|null {
 const cols=game==='connect4'?7:3,rows=game==='connect4'?6:3,need=game==='connect4'?4:3;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
  const value=b[r*cols+c];if(!value)continue;
  for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){
   let count=1;for(;count<need;count++){const y=r+dr*count,x=c+dc*count;if(y<0||x<0||y>=rows||x>=cols||b[y*cols+x]!==value)break;}
   if(count===need)return value;
  }
 }
 return b.every(Boolean)?'draw':null;
}
export function newBoard(game:string,sc?:BoardState['sc']):BoardState {return {b:Array(game==='connect4'?42:9).fill(''),sc:sc??{X:0,O:0,draw:0}};}
export function playBoard(game:string,previous:BoardState,requested:unknown,turn:number) {
 if(!Array.isArray(requested)||requested.length!==previous.b.length || boardResult(game,previous.b)!==null)return null;
 const changed=requested.map((v,i)=>v!==previous.b[i]?i:-1).filter(i=>i>=0),mark=turn%2===0?'X':'O';
 if(changed.length!==1)return null;const index=changed[0];
 if(previous.b[index]!==''||requested[index]!==mark)return null;
 if(game==='connect4' && index<35 && previous.b[index+7]==='')return null;
 const b=requested as Mark[],result=boardResult(game,b),sc={...previous.sc};if(result)sc[result]++;
 return {state:{b,sc},result,turn:result?turn:1-turn};
}
