import { SPECIES } from './ocean.js';

// Persistent player progression. Existing saves that do not have a collection
// are migrated without changing their currency, upgrades or best score.
export const DISCOVERY_BONUS=35;
export const ACHIEVEMENTS=Object.freeze([
 {id:'first',title:'FIRST DISCOVERY',description:'Catch your first species',reward:50},
 {id:'explorer',title:'REEF EXPLORER',description:'Discover 5 fish species',reward:100},
 {id:'naturalist',title:'OCEAN NATURALIST',description:'Discover 10 fish species',reward:200},
 {id:'complete',title:'MASTER COLLECTOR',description:'Discover all 14 species',reward:1000},
 {id:'hooked',title:'HOOKED!',description:'Catch 10 fish',reward:100},
 {id:'veteran',title:'MASTER ANGLER',description:'Catch 50 fish',reward:250},
 {id:'combo',title:'SHARP SHOOTER',description:'Reach a 4x shooting combo',reward:150},
 {id:'golden',title:'GOLDEN MOMENT',description:'Catch a Golden Fish',reward:500},
 {id:'earnings',title:'BIG EARNER',description:'Earn $2500 shooting fish',reward:300}
]);
const nonneg=(n)=>Number.isFinite(Number(n))?Math.min(1e9,Math.max(0,Math.floor(Number(n)))):0;
const valid=(n)=>Number.isInteger(n)&&n>=0&&n<SPECIES.length;
const obj=(n)=>n&&typeof n==='object'&&!Array.isArray(n)?n:{};
export function createCollection(){return {fish:{},achievements:{}};}
export function normalizeCollection(raw){
 const input=obj(raw),entries=obj(input.fish),badges=obj(input.achievements);
 const fish={};
 for(let k=0;k<SPECIES.length;k++){
  const entry=obj(entries[k]),caught=nonneg(entry.caught);
  if(!caught)continue;
  fish[k]={caught,shot:Math.min(caught,nonneg(entry.shot)),
    earned:nonneg(entry.earned),bestCombo:Math.min(4,nonneg(entry.bestCombo))};
 }
 const achievements={};
 for(const {id} of ACHIEVEMENTS)if(badges[id]===true)achievements[id]=true;
 return {fish,achievements};
}
export function fishRarity(kind){
 if(!valid(kind))return 'UNKNOWN';
 const f=SPECIES[kind];
 return f.rare?'LEGENDARY':f.value>=90?'RARE':f.value>=40?'UNCOMMON':'COMMON';
}
export function fishHabitat(kind){
 if(!valid(kind))return 'UNKNOWN';
 if(kind===13)return 'KELP + TRENCH';
 if([5,11,12].includes(kind))return 'TWILIGHT TRENCH';
 if([4,9,10].includes(kind))return 'KELP + TRENCH';
 if([0,6,7,8].includes(kind))return 'SUNLIT REEF';
 return 'MULTIPLE BIOMES';
}
export function collectionProgress(collection){
 const fish=obj(collection?.fish),achievements=obj(collection?.achievements);
 let discovered=0,caught=0,shot=0,earned=0,bestCombo=0;
 for(let k=0;k<SPECIES.length;k++){
  const entry=obj(fish[k]),n=nonneg(entry.caught);
  if(!n)continue;
  discovered++;caught+=n;shot+=nonneg(entry.shot);
  earned+=nonneg(entry.earned);bestCombo=Math.max(bestCombo,nonneg(entry.bestCombo));
 }
 return {discovered,total:SPECIES.length,percentage:Math.round(discovered/SPECIES.length*100),
   caught,shot,earned,bestCombo,unlocked:ACHIEVEMENTS.filter(a=>achievements[a.id]===true).length,
   totalAchievements:ACHIEVEMENTS.length};
}
export function recordCatch(collection,kind){
 if(!valid(kind))return {discovered:false,reward:0};
 const entry=collection.fish[kind]||{caught:0,shot:0,earned:0,bestCombo:0};
 const discovered=entry.caught===0;
 entry.caught++;collection.fish[kind]=entry;
 return {discovered,reward:discovered?DISCOVERY_BONUS:0};
}
export function recordShot(collection,kind,earned,combo){
 if(!valid(kind))return false;
 const entry=collection.fish[kind];
 if(!entry||entry.shot>=entry.caught)return false;
 entry.shot++;entry.earned+=nonneg(earned);
 entry.bestCombo=Math.max(entry.bestCombo,Math.min(4,nonneg(combo)));
 return true;
}
export function grantAchievements(collection){
 const progress=collectionProgress(collection);
 const conditions={
  first:progress.discovered>=1,
  explorer:progress.discovered>=5,
  naturalist:progress.discovered>=10,
  complete:progress.discovered===SPECIES.length,
  hooked:progress.caught>=10,
  veteran:progress.caught>=50,
  combo:progress.bestCombo>=4,
  golden:Boolean(collection.fish[13]?.caught),
  earnings:progress.earned>=2500
 };
 const unlocked=[];
 for(const badge of ACHIEVEMENTS){
  if(!conditions[badge.id]||collection.achievements[badge.id]===true)continue;
  collection.achievements[badge.id]=true;
  unlocked.push(badge);
 }
 return {unlocked,reward:unlocked.reduce((sum,b)=>sum+b.reward,0)};
}
