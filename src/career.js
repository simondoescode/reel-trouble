// v0.5 long-term progression: measured skill, not expensive gear alone.
// Existing reel levels and saved collection entries are NEVER downgraded.
export const CAREER_TIERS=Object.freeze([
 {id:'rookie',name:'DOCK ROOKIE',depth:0,shot:0},
 {id:'deckhand',name:'DECKHAND',depth:200,shot:4},
 {id:'navigator',name:'REEF NAVIGATOR',depth:420,shot:12},
 {id:'mariner',name:'DEEP MARINER',depth:800,shot:25},
 {id:'captain',name:'TRENCH CAPTAIN',depth:1300,shot:45},
 {id:'legend',name:'SEA LEGEND',depth:2000,shot:80,legendWins:1}
]);
export const CAREER_MEDALS=Object.freeze([
 {id:'deep-600',name:'BEYOND THE REEF',hint:'REACH 600M',reward:65},
 {id:'ace-four',name:'CLEAN SWEEP',hint:'SHOOT 4 FISH IN ONE HAUL',reward:90},
 {id:'deep-1200',name:'THE HUSH CALLS',hint:'REACH 1200M',reward:130},
 {id:'golden',name:'GOLDEN HUNTER',hint:'SHOOT A GOLDEN FISH',reward:180},
 {id:'bellwraith',name:'ECHO BREAKER',hint:'DEFEAT THE BELLWRAITH',reward:230},
 {id:'deep-2000',name:'ABYSS VETERAN',hint:'REACH 2000M',reward:350}
]);
const safeInt=(n)=>Number.isFinite(Number(n))?Math.max(0,Math.min(1e9,Math.floor(Number(n)))):0;
export function normalizeCareer(raw){
 const r=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const allowed=new Set(CAREER_MEDALS.map(m=>m.id));
 return {deepest:safeInt(r.deepest),bestHaul:safeInt(r.bestHaul),
  bestCombo:safeInt(r.bestCombo),bestPayout:safeInt(r.bestPayout),
  cleanHauls:safeInt(r.cleanHauls),
  medals:Array.isArray(r.medals)?[...new Set(r.medals.filter(id=>allowed.has(id)))]:[]};
}
export function captainRank(deepest,shots,legendWins=0){
 const d=safeInt(deepest),s=safeInt(shots),wins=safeInt(legendWins);
 let tier=0;
 for(let i=1;i<CAREER_TIERS.length;i++){
  const entry=CAREER_TIERS[i];
  if(d>=entry.depth&&s>=entry.shot&&wins>=(entry.legendWins||0))tier=i;
 }
 const next=CAREER_TIERS[tier+1]||null;
 return {tier,title:CAREER_TIERS[tier].name,next,
  remaining:next?{depth:Math.max(0,next.depth-d),shots:Math.max(0,next.shot-s),
   legend:Math.max(0,(next.legendWins||0)-wins)}:null};
}
export function reelPrice(level){
 const l=Math.max(0,Math.min(14,safeInt(level)));
 // Free access to the first upgrade, greater commitment for later equipment.
 return Math.round(65*Math.pow(1.52,l)*(l===0?1:1.15+Math.min(1.05,(l-1)*.10)));
}
export function reelProof(level,previousLineMetres){
 const l=safeInt(level);
 if(l===0)return 0;
 const ratio=Math.min(.84,.70+Math.min(7,l-1)*.02);
 return Math.ceil(safeInt(previousLineMetres)*ratio);
}
export function canUpgradeReel(level,deepest,previousLineMetres){
 return safeInt(deepest)>=reelProof(level,previousLineMetres);
}
export function recordCareer(raw,session={},lifetime={}){
 const data=normalizeCareer(raw);
 const deepest=safeInt(session.deepest);
 data.deepest=Math.max(data.deepest,deepest);
 data.bestHaul=Math.max(data.bestHaul,safeInt(session.landed));
 data.bestCombo=Math.max(data.bestCombo,safeInt(session.combo));
 data.bestPayout=Math.max(data.bestPayout,safeInt(session.payout));
 if(session.clean&&deepest>=180)data.cleanHauls++;
 const flags={
  'deep-600':data.deepest>=600,
  'ace-four':data.bestHaul>=4,
  'deep-1200':data.deepest>=1200,
  golden:safeInt(lifetime.goldenShot)>=1,
  bellwraith:safeInt(lifetime.legendWins)>=1,
  'deep-2000':data.deepest>=2000
 };
 const unlocked=CAREER_MEDALS.filter(m=>flags[m.id]&&!data.medals.includes(m.id));
 for(const item of unlocked)data.medals.push(item.id);
 return {career:data,unlocked,reward:unlocked.reduce((sum,m)=>sum+m.reward,0)};
}
