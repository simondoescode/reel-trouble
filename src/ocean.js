// Original Reel Trouble ecosystem: depth-based biomes, fish, spawn weights and swimming.
export const BIOMES = Object.freeze([
 // The water should not compete with the saturated, brightly coloured fish.
 {id:'reef',name:'SUNLIT REEF',start:0,colors:['#17667a','#135a71','#114962','#0c3b55']},
 {id:'kelp',name:'KELP FOREST',start:450,colors:['#205c67','#184e60','#143e55','#102f46']},
 {id:'trench',name:'TWILIGHT TRENCH',start:1080,colors:['#263d71','#1d325c','#17264c','#101b36']}
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
// Depth units are internal pixels; the HUD converts 6 px to 1 metre.
export function biomeAtDepth(depth){
 const value=Math.max(0,Number(depth)||0);
 if(value>=BIOMES[2].start)return BIOMES[2];
 if(value>=BIOMES[1].start)return BIOMES[1];
 return BIOMES[0];
}
function mix(a,b,t){return Math.round(a+(b-a)*t);}
function colour(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
function hex(a){return '#'+a.map(n=>Math.max(0,Math.min(255,n)).toString(16).padStart(2,'0')).join('');}
export function oceanPalette(depth){
 const d=Math.max(0,Number(depth)||0);
 let first=BIOMES[0],second=BIOMES[1],transition=450;
 if(d>BIOMES[2].start-150){first=BIOMES[1];second=BIOMES[2];transition=1080;}
 const t=Math.max(0,Math.min(1,(d-(transition-150))/300));
 if(d>=600&&d<=930)return BIOMES[1].colors;
 if(d>=1230)return BIOMES[2].colors;
 if(d<300)return BIOMES[0].colors;
 return first.colors.map((a,i)=>{
  const rgbA=colour(a),rgbB=colour(second.colors[i]);
  return hex(rgbA.map((v,j)=>mix(v,rgbB[j],t)));
 });
}
const TABLES={
 reef:[[0,17],[1,14],[2,12],[6,19],[7,10],[8,21],[3,7]],
 kelp:[[1,10],[2,12],[3,12],[4,10],[7,10],[8,13],[9,16],[10,17]],
 trench:[[3,8],[4,8],[5,14],[9,6],[10,15],[11,22],[12,20],[2,7]]
};
export function chooseSpecies(depth,random=Math.random){
 const biome=biomeAtDepth(depth);
 // A rare treasure catch with an independently controlled probability.
 if(depth>=540&&random()<.012)return 13;
 const table=TABLES[biome.id];
 const total=table.reduce((acc,item)=>acc+item[1],0);
 let roll=Math.max(0,Math.min(.999999,random()))*total;
 for(const [kind,weight] of table){
  roll-=weight;if(roll<0)return kind;
 }
 return table[table.length-1][0];
}
export function spawnOcean(maxDepth,random=Math.random){
 const limit=Math.max(260,Number(maxDepth)||720);
 const fish=[];
 const count=Math.max(8,Math.floor(limit/43));
 let id=0;
 for(let i=0;i<count;i++){
  const d=165+i*(limit-245)/Math.max(1,count-1);
  const jitter=(random()-.5)*23;
  const depth=Math.min(limit-65,Math.max(155,d+jitter));
  const kind=chooseSpecies(depth,random);
  const meta=SPECIES[kind],direction=random()<.5?-1:1;
  const x=44+random()*330,phase=random()*6.28;
  const school=meta.behavior==='school'&&random()<.58;
  const group=school?3:1;
  for(let k=0;k<group;k++){
   const fx=Math.max(34,Math.min(386,x-direction*k*19));
   fish.push({id:id++,x:fx,d:Math.min(limit-60,depth+k*8),
    kind,dir:direction,speed:meta.speed*(.84+random()*.32),
    phase:phase+(school?0:k*.15),swimY:0,caught:false,school:i});
  }
 }
 // Hazards appear in kelp/trench and become more numerous on longer lines.
 const hazards=[];
 if(limit>=480){
  const countHazards=Math.max(1,Math.round((limit-270)/410));
  for(let i=0;i<countHazards;i++){
   const d=470+i*(limit-540)/Math.max(1,countHazards-1);
   hazards.push({id:i,x:60+random()*300,d:Math.min(limit-70,d),phase:random()*6.28,
     drift:10+random()*10,radius:21,triggeredAt:-Infinity});
  }
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
