// Rare, world-anchored curiosities: exploration rewards without extra hazards.
import {BIOMES,CHUNK_DEPTH,biomeAtDepth,seededRandom} from './ocean.js';
export const DISCOVERIES=Object.freeze({
 shell:{id:'shell',name:'WHISTLESHELL',reward:65,color:'#ffde94'},
 bell:{id:'bell',name:'DRIFT BELL',reward:110,color:'#9afff0'},
 fossil:{id:'fossil',name:'CROWN FOSSIL',reward:160,color:'#f5bdb2'},
 nest:{id:'nest',name:'LUMEN NEST',reward:240,color:'#a2ffe3'},
 signal:{id:'signal',name:'BLACKGLASS SIGNAL',reward:390,color:'#f0b9ff'},
 cipher:{id:'cipher',name:'UNMARKED CIPHER',reward:600,color:'#ffe3a1'}
});
const byBiome={sunskip:'shell',bluewander:'bell',knuckles:'fossil',hush:'fossil',
 lantern:'nest',blackglass:'signal',unmarked:'cipher'};
export function generateDiscoveryChunk(index,seed=1,maxDepth=Infinity){
 const i=Math.max(0,Math.trunc(index));
 if(i===0||!Number.isFinite(maxDepth)&&maxDepth!==Infinity)return [];
 const rand=seededRandom(((seed>>>0)^Math.imul(i+17,0x27d4eb2d)^0x715b35f9)>>>0);
 // A discovery is uncommon, never guaranteed by a cast or a fixed interval.
 if(rand()>.23)return [];
 const d=i*CHUNK_DEPTH+120+rand()*(CHUNK_DEPTH-240);
 if(d>maxDepth-38)return [];
 const kind=byBiome[biomeAtDepth(d).id],definition=DISCOVERIES[kind];
 const x=67+rand()*286;
 return [{id:'curio-'+i,kind,name:definition.name,reward:definition.reward,
  color:definition.color,x,d,found:false}];
}
export function createDiscoveryStream(maxDepth,seed=1){
 const limit=Math.max(0,Number(maxDepth)||1050);
 const cache=new Map(),found=new Set();
 function near(depth,span=900){
  const first=Math.max(0,Math.floor((depth-span)/CHUNK_DEPTH));
  const last=Math.floor(Math.min(limit,depth+span)/CHUNK_DEPTH);
  for(let i=first;i<=last;i++)if(!cache.has(i))cache.set(i,generateDiscoveryChunk(i,seed,limit));
  const items=[];
  for(const [i,objects] of cache){
   if(i<first-1||i>last+1){cache.delete(i);continue;}
   for(const item of objects){item.found=found.has(item.id);items.push(item);}
  }
  return items;
 }
 function claimAt(depth,x){
  for(const item of near(depth,220)){
   if(!item.found&&Math.abs(item.d-depth)<38&&Math.abs(item.x-x)<46){
    found.add(item.id);item.found=true;return item;
   }
  }
  return null;
 }
 return {near,claimAt,get foundCount(){return found.size;},get chunkCount(){return cache.size;}};
}
export function drawDiscovery(ctx,item,y,time=0,{lowFx=false}={}){
 if(!item)return;
 const motion=lowFx?0:Math.sin(time*1.6+item.d*.04);
 const px=Math.round(item.x),py=Math.round(y+motion*2);
 ctx.save();ctx.translate(px,py);ctx.globalAlpha=item.found?.20:1;
 const fill=(color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
 // A faint field helps tiny relics remain recognisable without spoiling darkness.
 if(!item.found){
  ctx.globalAlpha=.12+.025*motion;
  fill(item.color,-28,-27,56,54);ctx.globalAlpha=1;
 }
 fill('#071628',-19,-17,39,35);
 if(item.kind==='shell'){
  fill('#b77565',-16,-10,31,22);fill('#ffe3ad',-14,-12,26,18);
  fill('#c78970',-8,-10,16,14);fill('#fff7d0',-2,-6,9,8);
  fill('#825f57',2,-3,5,4);fill('#fff4da',-14,8,29,4);
 }else if(item.kind==='bell'){
  fill('#6896a9',-3,-24,6,9);fill('#c0fff4',-12,-16,25,6);
  fill('#309fa3',-16,-10,32,20);fill('#abf9ed',-13,-10,27,4);
  fill('#74dfce',-5,10,10,6);fill('#e0fff9',-2,15,5,4);
 }else if(item.kind==='fossil'){
  fill('#ad807e',-17,-8,34,18);fill('#f4c4ae',-13,-12,26,20);
  fill('#523c59',-9,-5,18,9);fill('#fce0bc',-4,0,8,10);
  for(let i=-1;i<=1;i++)fill('#fff0cc',i*10-3,-17,6,9);
 }else if(item.kind==='nest'){
  fill('#376c73',-18,-9,36,21);fill('#a5ffe1',-13,-7,26,12);
  fill('#367d75',-8,-6,16,8);
  for(let i=-1;i<=1;i++)fill('#edfff4',i*9-3,-17-(i===0?5:0),7,10);
 }else if(item.kind==='signal'){
  fill('#5d417c',-12,-19,24,39);fill('#ba92d2',-9,-16,18,31);
  fill('#201735',-5,-12,10,22);fill('#fff0d6',-2,-8,5,5);
  fill('#d2b5ff',-15,13,30,4);
 }else{
  fill('#605772',-18,-17,36,35);fill('#a494b6',-14,-14,28,29);
  fill('#221c3e',-9,-10,18,19);
  fill('#ffe6aa',-4,-7,8,4);fill('#ffe6aa',-1,0,4,8);
  fill('#e5cfff',-15,11,30,3);
 }
 if(!item.found){
  fill(item.color,-25,-25,5,5);fill(item.color,22,18,4,4);
 }
 ctx.restore();
}
