// Skipper's original story campaign: one-time chapters followed by repeatable bounties.
export const EXPEDITIONS=Object.freeze([
 {id:'first-haul',title:'FIRST HAUL',task:'LAND 3 FISH',metric:'caught',target:3,reward:90,story:"Three fish, then we'll talk business."},
 {id:'reef-ledger',title:'THE REEF LEDGER',task:'DISCOVER 4 SPECIES',metric:'discovered',target:4,reward:120,story:"I want names for the things nibbling me toes."},
 {id:'kelp-edge',title:'KELP IS CALLING',task:'DIVE TO 180M',metric:'deepest',target:180,reward:140,story:"That kelp hides more than old boots."},
 {id:'new-reel',title:'REEL UPGRADE',task:'BUY A BETTER LINE',metric:'line',target:1,reward:180,story:"Your old line is practically wet spaghetti."},
 {id:'dark-water',title:'INTO DARK WATER',task:'DIVE TO 410M',metric:'deepest',target:410,reward:260,story:"Bring a lamp. Darkness doesn't refund."},
 {id:'sharp-shooter',title:'SHARP SHOOTER',task:'SHOOT 12 FISH',metric:'shots',target:12,reward:320,story:"Aim for fish, not my shop windows."},
 {id:'the-trench',title:'THE TWILIGHT TRENCH',task:'DIVE TO 700M',metric:'deepest',target:700,reward:650,story:"Whatever you see below, don't wave."},
 {id:'old-sea-legend',title:'OLD SEA LEGEND',task:'LAND 35 FISH',metric:'caught',target:35,reward:800,story:"They'll write ballads. Terrible ones, mind."}
]);
const count=n=>Number.isFinite(Number(n))?Math.max(0,Math.min(1e9,Math.floor(Number(n)))):0;
export function createExpedition(){return {chapter:0,deepest:0,dives:0,bountyStart:0,bountyCount:0};}
export function normalizeExpedition(raw){
 const s=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 return {chapter:Math.min(EXPEDITIONS.length,count(s.chapter)),deepest:count(s.deepest),
  dives:count(s.dives),bountyStart:count(s.bountyStart),bountyCount:count(s.bountyCount)};
}
export function recordExpeditionDive(raw,depthMetres){
 const p=normalizeExpedition(raw);p.dives++;p.deepest=Math.max(p.deepest,count(depthMetres));return p;
}
export function expeditionStatus(raw,stats={}){
 const p=normalizeExpedition(raw),m=EXPEDITIONS[p.chapter];
 if(m)return {...m,progress:Math.min(m.target,count(stats[m.metric])),goal:m.target,
  label:'CHAPTER '+String(p.chapter+1).padStart(2,'0')+' / '+EXPEDITIONS.length,completed:p.chapter};
 const goal=12+Math.min(48,p.bountyCount*6);
 return {id:'bounty',title:"SKIPPER'S BOUNTY",task:'LAND '+goal+' MORE FISH',metric:'caught',
  progress:Math.min(goal,Math.max(0,count(stats.caught)-p.bountyStart)),goal,
  reward:300+Math.min(12,p.bountyCount)*35,completed:EXPEDITIONS.length,
  story:"No retirement for legends, matey. Another haul!",label:'BOUNTY #'+(p.bountyCount+1)};
}
export function completeExpeditions(raw,stats={}){
 const p=normalizeExpedition(raw),done=[],wasStory=p.chapter<EXPEDITIONS.length;
 while(p.chapter<EXPEDITIONS.length){
  const m=EXPEDITIONS[p.chapter];if(count(stats[m.metric])<m.target)break;
  done.push(m);p.chapter++;
 }
 if(wasStory&&p.chapter===EXPEDITIONS.length)p.bountyStart=count(stats.caught);
 else if(!wasStory&&count(stats.caught)-p.bountyStart>=12+Math.min(48,p.bountyCount*6)){
  done.push(expeditionStatus(p,stats));p.bountyStart=count(stats.caught);p.bountyCount++;
 }
 return {progress:p,completed:done,reward:done.reduce((n,m)=>n+m.reward,0)};
}
