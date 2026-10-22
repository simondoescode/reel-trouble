// Functional fittings stay separate from cosmetic boats, saved fish IDs and upgrades.
export const TECH_ITEMS=Object.freeze([
 {id:'sonar',name:'ECHO FINDER',price:420,slot:'utility',detail:'PULSE REVEALS HIDDEN TARGETS',story:'Ping the deep. Every 18 seconds, if ye dare.'},
 {id:'fins',name:'CURRENT FINS',price:350,slot:'hook',detail:'FASTER, CLEANER STEERING',story:'Fins fight the water so ye can choose yer lane.'},
 {id:'arc',name:'WIDE ARC',price:575,slot:'hook',detail:'BIGGER ASCENT CATCH SWEEP',story:'Wide enough to snag a fish or three.'},
 {id:'ghost',name:'GHOST TIP',price:850,slot:'hook',detail:'ONE FREE DESCENT SAVE / DIVE',story:'That ghost hook slips by one unlucky collision.'},
 {id:'stabilizer',name:'KEEL STABILISER',price:980,slot:'boat',detail:'CUT DRIFT & JELLYFISH DRAG',story:'Makes the boat feel like it knows the tides.'},
 {id:'winch',name:'POWER WINCH',price:1250,slot:'boat',detail:'REEL FISH UP 22% FASTER',story:'The engine does the hauling. Ye take the glory.'}
]);
const IDS=new Set(TECH_ITEMS.map(item=>item.id));
const HOOKS=new Set(['fins','arc','ghost']);
export const SONAR_COOLDOWN=18,SONAR_DURATION=4.5;
export function normalizeEquipment(raw){
 const r=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const owned=Array.isArray(r.owned)?[...new Set(r.owned.filter(id=>IDS.has(id)))]:[];
 return {owned,hook:HOOKS.has(r.hook)&&owned.includes(r.hook)?r.hook:'standard'};
}
export function hasTech(raw,id){return normalizeEquipment(raw).owned.includes(id);}
export function techEffects(raw){
 const kit=normalizeEquipment(raw);
 return {
  sonar:kit.owned.includes('sonar'),
  steer:kit.hook==='fins'?1.3:1,
  current:kit.owned.includes('stabilizer')?.4:1,
  catch:kit.hook==='arc'?20:0,
  guard:kit.hook==='ghost',
  jellySlow:kit.owned.includes('stabilizer')?.5:1,
  reel:kit.owned.includes('winch')?1.22:1
 };
}
// Mutates the existing save just like other in-game purchases.
export function buyTech(save,id){
 if(!save||!Number.isFinite(save.cash))return 'invalid';
 const kit=normalizeEquipment(save.equipment);
 if(id==='standard'){kit.hook='standard';save.equipment=kit;return 'equipped';}
 const item=TECH_ITEMS.find(gear=>gear.id===id);
 if(!item)return 'invalid';
 if(kit.owned.includes(id)){
  if(item.slot==='hook'){kit.hook=id;save.equipment=kit;return 'equipped';}
  save.equipment=kit;return 'owned';
 }
 if(save.cash<item.price)return 'funds';
 save.cash-=item.price;kit.owned.push(id);
 if(item.slot==='hook')kit.hook=id;
 save.equipment=kit;return 'purchased';
}
export function activateSonar(raw,clock,lastUse,phase){
 if(!hasTech(raw,'sonar')||!['descent','ascent'].includes(phase))return null;
 if(clock-lastUse<SONAR_COOLDOWN)return null;
 return {lastUse:clock,until:clock+SONAR_DURATION};
}
export function sonarSecondsRemaining(raw,clock,lastUse){
 if(!hasTech(raw,'sonar'))return null;
 return Math.max(0,SONAR_COOLDOWN-(clock-lastUse));
}
// Compact independent equipment silhouettes drawn at whole-pixel positions.
export function drawTechIcon(ctx,id,x,y,scale=1,time=0){
 const s=Math.max(1,Math.floor(scale)),dots=(c,rects)=>{ctx.fillStyle=c;for(const [a,b,w,h] of rects)ctx.fillRect(a*s,b*s,w*s,h*s);};
 ctx.save();ctx.translate(Math.round(x),Math.round(y));
 dots('#081b29',[[-11,-11,22,22]]);
 if(id==='sonar'){
  dots('#56b8c1',[[-8,-8,16,16],[-5,-11,10,3]]);
  dots('#d6fff3',[[-1,-5,2,11],[-6,0,12,2]]);
  dots('#ffdd82',[[3,-6,3,3],[-7,5,3,3]]);
  if(Math.sin(time*4)>.1){ctx.strokeStyle='#a6fff7';ctx.lineWidth=s;ctx.strokeRect(-10*s,-10*s,20*s,20*s);}
 }else if(id==='fins'||id==='arc'||id==='ghost'||id==='standard'){
  dots('#d6ddd0',[[-1,-9,3,15]]);
  dots(id==='ghost'?'#bb9cec':'#eecb93',[[-3,3,9,3],[4,3,3,6]]);
  if(id==='fins')dots('#5df0d9',[[-9,-1,8,4],[2,-1,8,4],[-7,4,5,3]]);
  if(id==='arc')dots('#ffe19a',[[-9,3,5,8],[7,-5,3,12],[9,6,3,5]]);
  if(id==='ghost')dots('#bda4f4',[[-7,-8,4,5],[7,-5,3,8],[-7,6,4,4]]);
 }else if(id==='stabilizer'){
  dots('#6dd8cf',[[-10,-5,20,8],[-7,3,14,6]]);
  dots('#f9e4aa',[[-11,0,5,5],[7,0,5,5],[-2,-10,5,7]]);
 }else if(id==='winch'){
  dots('#96b7d2',[[-9,-4,18,15],[-7,-9,14,5]]);
  dots('#ffdf8e',[[-6,-1,12,7],[-2,-10,4,18]]);
  dots('#13546a',[[-3,0,6,5]]);
 }
 ctx.restore();
}
