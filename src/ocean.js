// Reel Trouble's original seven-region ocean. World coordinates are pixels, HUD is metres.
export const DEPTH_SCALE=3, CHUNK_DEPTH=720;
export const BIOMES=Object.freeze([
 {id:'sunskip',name:'SUNSKIP SHELF',start:0,colors:['#17667a','#135a71','#114962','#0c3b55'],motif:'coral'},
 {id:'bluewander',name:'BLUEWANDER',start:780,colors:['#165771','#134a66','#103a58','#0c304a'],motif:'open'},
 {id:'knuckles',name:'KELP KNUCKLES',start:1920,colors:['#20515d','#194752','#153947','#102e3b'],motif:'kelp'},
 {id:'hush',name:'THE HUSH',start:3690,colors:['#163e5a','#15354f','#102a42','#0b2036'],motif:'spires'},
 {id:'lantern',name:'LANTERN RIFT',start:6480,colors:['#192c55','#152744','#111e35','#0c182b'],motif:'glow'},
 {id:'blackglass',name:'BLACKGLASS DROP',start:11550,colors:['#101b36','#0e192f','#0b1427','#080f20'],motif:'glass'},
 {id:'unmarked',name:'THE UNMARKED',start:20100,colors:['#0b1630','#0a1226','#080f20','#060b18'],motif:'unknown'}
]);
export const SPECIES = Object.freeze([
 {name:'Guppy',value:10,color:'#ffc247',size:13,behavior:'cruise',speed:13},
 {name:'Mackerel',value:18,color:'#22dce4',size:16,behavior:'cruise',speed:20},
 {name:'Snapper',value:28,color:'#ff657a',size:18,behavior:'zigzag',speed:17},
 {name:'Moonfish',value:42,color:'#b48aff',size:21,behavior:'drift',speed:11},
 {name:'Sunfish',value:65,color:'#d4ff69',size:24,behavior:'drift',speed:12},
 {name:'Phantom',value:95,color:'#a7fff4',size:22,behavior:'glow',speed:15},
 {name:'Clownfish',value:22,color:'#ff963a',size:15,behavior:'zigzag',speed:23},
 {name:'Pufferfish',value:46,color:'#fff279',size:22,behavior:'drift',speed:8},
 {name:'Sardine',value:12,color:'#88f6e6',size:11,behavior:'school',speed:25},
 {name:'Lionfish',value:74,color:'#ff8c7f',size:20,behavior:'drift',speed:10},
 {name:'Tuna',value:88,color:'#58e6ea',size:24,behavior:'dash',speed:30},
 {name:'Lanternfish',value:110,color:'#7dffca',size:17,behavior:'glow',speed:17},
 {name:'Anglerfish',value:170,color:'#c69cff',size:24,behavior:'lure',speed:9},
 {name:'Golden Fish',value:500,color:'#ffe35b',size:18,behavior:'dash',speed:40,rare:true}
]);

// Use world-pixel depth consistently; region boundaries correspond to 260m,
// 640m, 1230m, 2160m, 3850m, and 6700m.
export function biomeAtDepth(depth){
 const d=Math.max(0,Number(depth)||0);
 for(let i=BIOMES.length-1;i>=0;i--)if(d>=BIOMES[i].start)return BIOMES[i];
 return BIOMES[0];
}
const lerp=(a,b,t)=>Math.round(a+(b-a)*t);
const rgb=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));
const hex=a=>'#'+a.map(v=>Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('');
export function oceanPalette(depth){
 const d=Math.max(0,Number(depth)||0),blend=240;
 for(let i=1;i<BIOMES.length;i++){
  const boundary=BIOMES[i].start;
  if(d>=boundary-blend&&d<=boundary+blend){
   const f=Math.max(0,Math.min(1,(d-boundary+blend)/(blend*2))),t=f*f*(3-2*f);
   return BIOMES[i-1].colors.map((c,j)=>{
    const a=rgb(c),b=rgb(BIOMES[i].colors[j]);
    return hex(a.map((v,k)=>lerp(v,b[k],t)));
   });
  }
 }
 return biomeAtDepth(d).colors;
}
export function oceanVisibility(depth){
 const metres=Math.max(0,depth)/DEPTH_SCALE;
 const t=Math.max(0,Math.min(1,(metres-430)/1050));
 return 1-(t*t*(3-2*t))*.99;
}
// Species ordering is stable to preserve collection and achievement save data.
const TABLES={
 sunskip:[[0,17],[1,14],[2,12],[6,19],[7,10],[8,21],[3,7]],
 bluewander:[[1,16],[2,13],[3,12],[6,9],[8,16],[9,9],[10,13]],
 knuckles:[[1,8],[2,12],[3,12],[4,10],[7,10],[8,13],[9,16],[10,17]],
 hush:[[3,12],[4,11],[5,13],[9,6],[10,18],[11,20],[12,8]],
 lantern:[[3,7],[4,8],[5,18],[9,6],[10,12],[11,25],[12,22]],
 blackglass:[[5,20],[10,10],[11,25],[12,31],[3,6]],
 unmarked:[[5,18],[11,26],[12,38],[4,5],[10,8]]
};
export function chooseSpecies(depth,random=Math.random){
 if(depth>=540&&random()<.012)return 13;
 const table=TABLES[biomeAtDepth(depth).id],total=table.reduce((n,item)=>n+item[1],0);
 let roll=Math.max(0,Math.min(.999999,random()))*total;
 for(const [kind,weight] of table){roll-=weight;if(roll<0)return kind;}
 return table[table.length-1][0];
}
export function seededRandom(seed){
 let s=(Math.trunc(seed)>>>0)||1;
 return ()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
export function generateOceanChunk(index,seed=1,maxDepth=Infinity){
 const chunk=Math.max(0,Math.floor(index));
 const rand=seededRandom(((seed>>>0)^Math.imul(chunk+1,0x9e3779b1))>>>0);
 const lower=chunk*CHUNK_DEPTH,upper=Math.min(lower+CHUNK_DEPTH,maxDepth),fish=[],hazards=[];
 if(upper<=lower)return {index:chunk,fish,hazards};
 const count=4+Math.floor(rand()*3);
 for(let i=0;i<count;i++){
  const d=Math.max(305,lower+58+(i+.5)*(CHUNK_DEPTH-116)/count+(rand()-.5)*44);
  if(d<305||d>=upper-32)continue;
  const kind=chooseSpecies(d,rand),meta=SPECIES[kind],dir=rand()<.5?-1:1;
  fish.push({id:chunk*100+i,x:40+rand()*340,d,kind,dir,speed:meta.speed*(.84+rand()*.32),
   phase:rand()*Math.PI*2,swimY:0,caught:false,bypassed:false,school:chunk});
 }
 if(chunk>0&&(chunk%2===1||rand()<.13)){
  const d=lower+170+rand()*360;
  if(d<upper-28)hazards.push({id:chunk,x:62+rand()*296,d,phase:rand()*Math.PI*2,
   drift:10+rand()*10,radius:21,triggeredAt:-Infinity});
 }
 return {index:chunk,fish,hazards};
}
// Cache only nearby chunks, persisting caught/bypassed states across unload/reload.
export function createOceanStream(maxDepth,seed=1){
 const limit=Math.max(305,Number(maxDepth)||1050),cache=new Map();
 const caught=new Set(),bypassed=new Set(),triggered=new Map();
 function near(depth,span=950){
  const first=Math.max(0,Math.floor((depth-span)/CHUNK_DEPTH));
  const last=Math.max(first,Math.floor(Math.min(limit,depth+span)/CHUNK_DEPTH));
  for(let i=first;i<=last;i++)if(!cache.has(i)){
   const chunk=generateOceanChunk(i,seed,limit);
   for(const f of chunk.fish){f.caught=caught.has(f.id);f.bypassed=bypassed.has(f.id);}
   for(const h of chunk.hazards)h.triggeredAt=triggered.get(h.id)??-Infinity;
   cache.set(i,chunk);
  }
  const fish=[],hazards=[];
  for(const [i,chunk] of cache){
   if(i<first-1||i>last+1){
    for(const f of chunk.fish){if(f.caught)caught.add(f.id);if(f.bypassed)bypassed.add(f.id);}
    for(const h of chunk.hazards)if(h.triggeredAt>-Infinity)triggered.set(h.id,h.triggeredAt);
    cache.delete(i);continue;
   }
   fish.push(...chunk.fish);hazards.push(...chunk.hazards);
  }
  return {fish,hazards};
 }
 return {near,get chunkCount(){return cache.size;}};
}
export function spawnOcean(maxDepth,random=Math.random){
 const limit=Math.max(305,Number(maxDepth)||1050);
 const seed=Math.floor(random()*0xffffffff)>>>0,fish=[],hazards=[];
 for(let i=0;i<=Math.floor(limit/CHUNK_DEPTH);i++){
  const c=generateOceanChunk(i,seed,limit);fish.push(...c.fish);hazards.push(...c.hazards);
 }
 return {fish,hazards};
}
export function advanceFish(f,dt){
 const m=SPECIES[f.kind];if(!m||f.caught)return f;
 const rate=Math.max(0,Math.min(.05,Number(dt)||0));
 f.phase+=rate*(m.behavior==='school'?3.7:2.1+f.kind*.14);
 let factor=1;
 if(m.behavior==='dash')factor=Math.sin(f.phase*2.4)>.5?2.75:.48;
 if(m.behavior==='zigzag')factor=1+.32*Math.sin(f.phase*2.2);
 f.x+=f.dir*f.speed*factor*rate;
 if(f.x<29){f.x=29;f.dir=1;}
 if(f.x>391){f.x=391;f.dir=-1;}
 const magnitude=m.behavior==='zigzag'?15:m.behavior==='drift'?8:
  m.behavior==='school'?3:m.behavior==='dash'?6:4;
 f.swimY=Math.sin(f.phase*1.6+(m.behavior==='school'?0:f.id*.7))*magnitude;
 return f;
}
export function advanceHazard(h,dt){
 const step=Math.max(0,Math.min(.05,Number(dt)||0));
 h.phase+=step*1.8;
 h.x+=Math.sin(h.phase*.55)*h.drift*step;
 h.x=Math.max(36,Math.min(384,h.x));
 return h;
}
export function overlapsHazard(h,hookX,hookDepth){
 return Math.abs(h.d+Math.sin(h.phase)*9-hookDepth)<24&&Math.abs(h.x-hookX)<h.radius+12;
}
