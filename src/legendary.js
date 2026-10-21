// The Bellwraith: an original, optional three-signal encounter in The Hush.
// Kept separate from species IDs, campaign chapters and existing saved catches.
import {BIOMES,seededRandom} from './ocean.js';
export const LEGEND_KEY='reel-trouble-legend-v1';
const HUSH_START=BIOMES.find(b=>b.id==='hush').start;
export const BELLWRAITH=Object.freeze({
 id:'bellwraith',name:'THE BELLWRAITH',start:HUSH_START,warning:HUSH_START-170,
 gateOffsets:Object.freeze([145,355,565]),firstReward:960,repeatReward:145
});
export const OCEAN_RELICS=Object.freeze([
 {id:'tide-compass',name:'TIDE COMPASS',d:1680,reward:145,color:'#ffe8a2'},
 {id:'echo-pearl',name:'ECHO PEARL',d:HUSH_START+425,reward:390,color:'#a4fff2'}
]);
export function normalizeLegend(raw){
 const r=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 return {seen:r.seen===true,defeated:r.defeated===true,
  attempts:Number.isSafeInteger(r.attempts)?Math.max(0,r.attempts):0,
  wins:Number.isSafeInteger(r.wins)?Math.max(0,r.wins):0,
  relics:Array.isArray(r.relics)?[...new Set(r.relics.filter(id=>OCEAN_RELICS.some(v=>v.id===id)))]:[]};
}
export function createBellwraith(seed=1){
 const random=seededRandom((seed^0xb311a11)>>>0);
 const gates=BELLWRAITH.gateOffsets.map((offset,i)=>({
  index:i,d:BELLWRAITH.start+offset,
  x:Math.round(95+random()*225),done:false,hit:false
 }));
 return {gates,revealed:false,finished:false,success:false};
}
export function encounterEvents(enc,previousDepth,depth,x){
 if(!enc||enc.finished||depth<previousDepth)return [];
 const events=[];
 if(!enc.revealed&&depth>=BELLWRAITH.warning&&previousDepth<BELLWRAITH.warning){
  enc.revealed=true;events.push({type:'reveal'});
 }
 for(const gate of enc.gates){
  if(gate.done||depth<gate.d||previousDepth>=gate.d)continue;
  gate.done=true;gate.hit=Math.abs(x-gate.x)<=51;
  events.push({type:gate.hit?'seal':'miss',gate});
 }
 if(enc.gates.every(g=>g.done)){
  enc.finished=true;enc.success=enc.gates.every(g=>g.hit);
  events.push({type:enc.success?'victory':'escape'});
 }
 return events;
}
export function awardLegend(raw){
 const progress=normalizeLegend(raw),first=!progress.defeated;
 progress.seen=true;progress.defeated=true;progress.wins++;
 return {progress,reward:first?BELLWRAITH.firstReward:BELLWRAITH.repeatReward,first};
}
export function createRelicTrail(seed=1){
 const random=seededRandom((seed^0x5ea5ca5e)>>>0);
 return OCEAN_RELICS.map(r=>({...r,x:Math.round(86+random()*248),claimed:false}));
}
export function claimRelics(items,oldDepth,newDepth,hookX,already=[]){
 const results=[];
 if(!items)return results;
 for(const item of items){
  if(item.claimed)continue;
  if(already.includes(item.id)){item.claimed=true;continue;}
  const crossed=Math.min(oldDepth,newDepth)<=item.d+26&&Math.max(oldDepth,newDepth)>=item.d-26;
  if(crossed&&Math.abs(item.x-hookX)<=49){item.claimed=true;results.push(item);}
 }
 return results;
}
export function drawBellwraith(ctx,x,y,time=0,{lowFx=false,defeated=false}={}){
 const t=lowFx?0:time,scale=5,px=Math.round(x),py=Math.round(y);
 ctx.save();ctx.translate(px,py);
 ctx.globalAlpha=defeated?.55:1;
 // Sonar bell, bifurcated fins, luminous teeth and swaying tendrils.
 ctx.fillStyle='#091327';ctx.fillRect(-72,-34,145,72);
 ctx.fillStyle='#37284f';ctx.fillRect(-60,-43,120,76);
 ctx.fillStyle='#725d91';ctx.fillRect(-51,-52,103,44);
 ctx.fillStyle='#caa4e4';ctx.fillRect(-39,-54,79,11);
 ctx.fillStyle='#3c2d60';ctx.fillRect(-49,-18,99,49);
 ctx.fillStyle='#100f2d';ctx.fillRect(-36,-11,70,28);
 ctx.fillStyle='#f8eecb';
 for(let i=0;i<5;i++){ctx.fillRect(-30+i*13,-11,6,10);ctx.fillRect(-30+i*13,12,6,10);}
 ctx.fillStyle=defeated?'#aed0d0':'#bbfff5';ctx.fillRect(18,-33,22,12);
 ctx.fillStyle='#072e44';ctx.fillRect(28,-31,7,8);
 ctx.fillStyle='#9877bd';ctx.fillRect(-73,-12,19,29);ctx.fillRect(55,-6,18,29);
 ctx.fillStyle='#755494';
 for(let i=0;i<5;i++){
  const dx=-48+i*24,dy=34+Math.round(Math.sin(t*1.9+i)*7);
  ctx.fillRect(dx,23,11,20+dy-29);ctx.fillRect(dx+(i%2?5:-5),dy,10,19);
  ctx.fillStyle=i%2?'#a38bcb':'#785ea3';
 }
 ctx.fillStyle='#b9fff2';ctx.fillRect(-57,-48,8,8);ctx.fillRect(53,-41,6,6);
 ctx.restore();
}
export function drawEchoGate(ctx,gate,screenY,time=0,{lowFx=false}={}){
 if(gate.done)return;
 const x=Math.round(gate.x),y=Math.round(screenY),pulse=lowFx?0:Math.sin(time*3);
 ctx.save();
 ctx.globalAlpha=.7+.18*pulse;
 ctx.strokeStyle='#d8fff6';ctx.lineWidth=3;
 ctx.strokeRect(x-31,y-23,62,46);
 ctx.fillStyle='#a5ffdf';
 ctx.fillRect(x-4,y-33,8,18);ctx.fillRect(x-4,y+15,8,18);
 ctx.fillRect(x-42,y-3,18,6);ctx.fillRect(x+24,y-3,18,6);
 ctx.fillStyle='#fff3ad';ctx.fillRect(x-4,y-4,8,8);
 ctx.restore();
}
export function drawOceanRelic(ctx,item,y,time=0){
 if(item.claimed)return;
 const x=Math.round(item.x),bob=Math.sin(time*2)*3;
 ctx.save();ctx.translate(x,Math.round(y+bob));
 ctx.fillStyle='#081a30';ctx.fillRect(-19,-19,38,39);
 ctx.fillStyle=item.color;ctx.fillRect(-13,-13,26,27);
 ctx.fillStyle='#173650';ctx.fillRect(-8,-8,16,17);
 if(item.id==='tide-compass'){
  ctx.fillStyle='#fff6d4';ctx.fillRect(-2,-13,4,30);ctx.fillRect(-13,-2,26,4);
  ctx.fillStyle='#ffbe5e';ctx.fillRect(-3,-3,6,6);
 }else{
  ctx.fillStyle='#e1fff5';ctx.fillRect(-8,-6,16,14);ctx.fillRect(-5,-12,10,8);
  ctx.fillStyle='#70ccdb';ctx.fillRect(-3,-3,6,7);
 }
 ctx.fillStyle=item.color;ctx.fillRect(-26,-23,4,4);ctx.fillRect(22,16,5,5);
 ctx.restore();
}
