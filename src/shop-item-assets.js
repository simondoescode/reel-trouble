// Hand-authored pixel recipes for every piece of merchandise. Each entry has
// its own identity, three-colour palette and silhouette/details at 24x24 pixels.
// No network images or generic emoji; the same art appears in lists and inspection.
const definitions={
 line:[
  'skipper-string|#a9784c|#e9c98e|#47778e',
  'shelfwalker|#7298a5|#d7eee1|#dba354',
  'bluewander|#477db2|#b3e4ff|#e1b75f',
  'kelp-cutter|#43886e|#a8e2a9|#e9ad66',
  'hush-runner|#8664a1|#d5b8ec|#81d5ce',
  'rift-rider|#b86d60|#f0c3a7|#91dde0',
  'deep-reach|#3e8f9a|#b6ede8|#e8c16c',
  'blackglass|#4e5277|#c9cbe7|#80f1e7',
  'void-runner|#5a426b|#d2a8f6|#f3ad73',
  'ghost-thread|#8cbcbf|#f0ffed|#83b4df',
  'unmarked|#656972|#d5dbe2|#f4cf85',
  'dark-drifter|#4e7598|#9fd7ff|#a18dd0',
  'deep-spool|#aa7149|#f1d099|#6ed5e0',
  'starless|#464e69|#b7c0e8|#d6bcff',
  'endless-reel|#b7a769|#fff1b3|#60f1d9'
 ],
 net:[
  'bare-hook|#8ba7b2|#f1f3df|#bd795c',
  'barbed-hook|#c08a54|#ffe0a1|#4e9b9b',
  'twin-prong|#659abb|#daf8f6|#e4b45b',
  'triple-rig|#8b78b5|#e5dcff|#e9ab70',
  'magnet-hook|#b06e70|#ffd8b0|#9cece5',
  'abyss-grapnel|#3b9c9b|#c1fff2|#f1c96b'
 ],
 gun:[
  'pop-gun|#b46c4b|#f6c783|#819fb2',
  'quickshot|#587ca3|#d5ebfa|#e7af62',
  'scattergun|#987f53|#f1d99c|#8fc3c9',
  'twin-scatter|#9372a5|#e0bfea|#eda77b',
  'neon-blaster|#408eac|#c4faff|#e8dc70',
  'storm-cannon|#637093|#eef0ff|#8ef9d8'
 ],
 light:[
  'no-lantern|#7c7777|#c9c7b1|#a05c58',
  'glow-lantern|#c68c4f|#ffeab0|#e2a54e',
  'deep-beam|#678ca3|#d6f5ff|#ffdc83',
  'rift-lamp|#8c73a5|#eadcff|#96f5e6',
  'blackglass-beam|#4b6881|#cfecff|#d1bcff',
  'starless-lamp|#c3ad65|#fff8c7|#88f9e3'
 ],
 charge:['blast-charge|#b35d4d|#ffda88|#e8ad63'],
 map:['folded-chart|#ccbc84|#f1e3b5|#448da0'],
 tooth:['glass-tooth|#74b5af|#efffff|#7bdde4'],
 crate:['saltwater-crate|#94633e|#ecc482|#608893'],
 token:['blackglass-token|#536b91|#c2e5ff|#90eddb']
};
export const SHOP_ITEM_ASSETS=Object.freeze(Object.fromEntries(
 Object.entries(definitions).map(([type,items])=>[type,Object.freeze(items.map((entry,tier)=>{
  const [id,base,shine,accent]=entry.split('|');
  return Object.freeze({id,type,tier,base,shine,accent});
 }))])
));
export const shopAssetCount=(type)=>SHOP_ITEM_ASSETS[type]?.length||0;
export function shopItemAsset(type,level=0){
 const items=SHOP_ITEM_ASSETS[type];
 if(!items)throw new Error('Unknown shop item: '+type);
 const tier=Math.max(0,Math.min(items.length-1,Math.floor(Number(level)||0)));
 return items[tier];
}
const cache=new Map(),INK='#152336',DARK='#31475a',CREAM='#fff9e6';
const tile=(ctx,x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
function reel(r,n,a){
 const rim=n%5,bodyX=3+(rim===3?1:0),bodyY=4+(n%3===1?1:0);
 // Different housing profiles, projecting grips, spool wings and handles.
 r(bodyX,bodyY+4,18,14,INK);r(bodyX+2,bodyY+1,14,20,INK);
 r(bodyX+3,bodyY+2,12,17,a.base);r(bodyX+2,bodyY+6,14,10,a.base);
 if(rim===0){r(3,8,3,9,a.shine);r(18,8,3,9,a.shine);}
 if(rim===1){r(2,9,5,3,a.shine);r(18,13,4,4,a.accent);}
 if(rim===2){r(6,2,11,3,a.accent);r(8,20,9,3,a.shine);}
 if(rim===3){r(2,5,3,5,a.accent);r(19,13,3,7,a.shine);}
 if(rim===4){r(6,3,12,3,a.shine);r(5,19,14,3,a.accent);}
 r(6,8,12,10,INK);r(7,9,10,8,a.accent);
 r(9,10,6,6,DARK);r(10,11,4,4,a.shine);r(11,12,2,2,INK);
 // Each reel has its own banding, line tension and a tier-coded crest.
 const bands=1+n%4;
 for(let i=0;i<bands;i++)r(7+i*3,7,2,1,a.shine);
 if(n>=5)r(8,18,9,2,a.shine);
 if(n>=9){r(5,6,2,2,a.accent);r(17,17,3,2,a.accent);}
 if(n>=12){r(7,3,3,2,a.shine);r(14,3,3,2,a.shine);}
 r(19,5+n%4,3,3,INK);r(20,6+n%4,2,2,a.shine);
 r(21,3+n%4,2,3,a.accent);
 // Tiny runic tally is part of the item, not a colour swap.
 for(let b=0;b<4;b++)if((n+1)&(1<<b))r(5+b*3,20,2,2,a.shine);
}
function hookRig(r,n,a){
 // Real fishing hooks, not nets: six clearly different rigs.
 r(10,1,4,5,INK);r(11,2,2,4,a.shine);
 if(n===0){
  r(11,5,3,11,INK);r(12,6,1,9,a.base);r(11,15,8,4,INK);
  r(17,12,3,5,INK);r(18,12,2,2,a.shine);r(16,18,3,2,a.base);
 }else if(n===1){
  r(11,5,4,12,INK);r(12,6,2,10,a.base);r(10,16,10,4,INK);
  r(18,11,3,7,INK);r(18,11,2,3,a.shine);r(16,16,4,3,a.base);
  r(16,12,4,3,a.accent);
 }else if(n===2){
  r(11,5,3,10,INK);r(12,6,1,9,a.base);
  for(const s of [-1,1]){const x=s<0?3:14;
   r(x,13,7,4,INK);r(s<0?3:18,9,3,6,INK);
   r(x+2,14,4,2,a.shine);r(s<0?4:18,9,2,2,a.accent);}
 }else if(n===3){
  r(11,5,3,13,a.base);r(10,9,5,4,INK);r(11,9,3,4,a.accent);
  for(let i=0;i<3;i++){
   const x=2+i*7;r(x,14,5,5,INK);r(x+1,15,3,3,a.shine);
   r(x+(i===0?0:3),11,2,4,a.base);
  }
 }else if(n===4){
  r(7,6,10,11,INK);r(8,7,3,9,a.base);r(14,7,3,9,a.base);
  r(6,14,5,5,INK);r(14,14,5,5,INK);
  r(6,14,4,3,a.accent);r(15,14,4,3,a.accent);
  r(10,5,4,3,a.shine);r(9,17,6,2,a.shine);
 }else{
  r(10,5,5,11,INK);r(11,6,3,10,a.base);
  for(const [x,dir] of [[1,-1],[11,1]]){
   r(x+3,13,8,3,INK);r(x+3,16,3,5,INK);
   r(x+3,17,3,2,a.shine);r(x+5,14,5,1,a.accent);
  }
  r(9,18,6,4,INK);r(10,18,4,3,a.accent);
  r(10,9,5,3,a.shine);
 }
 r(10,0,5,2,a.accent);
}
function weapon(r,n,a){
 // Six independent weapon silhouettes, from a pocket popper to a rotary cannon.
 if(n===0){
  r(4,8,14,8,INK);r(5,9,12,6,a.base);r(15,10,7,3,INK);
  r(18,10,3,2,a.shine);r(7,15,6,7,INK);r(8,16,4,5,a.base);
  r(5,7,7,2,a.shine);
 }else if(n===1){
  r(2,7,18,8,INK);r(4,8,16,6,a.base);r(18,8,5,4,INK);
  r(20,9,3,2,a.shine);r(8,14,6,9,INK);r(9,15,4,7,a.accent);
  r(4,5,11,3,a.shine);r(3,14,5,3,a.base);
 }else if(n===2){
  r(2,6,18,10,INK);r(3,7,15,8,a.base);
  r(14,5,10,4,INK);r(15,5,8,2,a.shine);
  r(14,11,10,4,INK);r(15,11,8,2,a.shine);
  r(8,15,8,8,INK);r(10,16,5,7,a.accent);
  r(4,10,10,2,a.shine);
 }else if(n===3){
  for(let y of [5,11]){r(5,y,17,5,INK);r(7,y+1,16,2,a.shine);}
  r(2,7,11,11,INK);r(3,8,9,9,a.base);
  r(7,16,8,7,INK);r(8,17,6,5,a.accent);r(18,8,5,3,a.accent);
 }else if(n===4){
  r(2,8,20,8,INK);r(3,9,19,6,a.base);r(17,9,6,4,a.accent);
  r(6,5,12,4,INK);r(8,6,9,2,a.shine);
  r(8,15,9,8,INK);r(10,16,6,6,a.accent);
  r(5,10,13,2,a.shine);r(21,7,2,2,a.shine);
 }else{
  r(2,6,20,12,INK);r(3,7,18,10,a.base);
  for(let y of [7,11,15]){r(15,y,9,3,INK);r(17,y,5,1,a.shine);}
  r(3,4,11,4,a.accent);r(6,8,7,7,DARK);
  r(7,9,5,5,a.shine);r(8,10,3,3,INK);
  r(8,17,10,6,INK);r(10,18,7,4,a.accent);
  r(1,10,4,4,a.shine);
 }
 r(4,11,2,2,a.accent);
}
function lantern(r,n,a){
 if(n===0){
  // The starter slot is an unlit, cracked storm lamp.
  r(6,6,12,15,INK);r(7,7,10,12,a.base);
  r(9,4,6,3,INK);r(10,5,4,1,a.shine);
  r(8,9,8,7,DARK);r(9,10,6,5,a.accent);
  r(7,17,10,2,INK);r(11,10,2,6,INK);
 }else if(n===1){
  r(7,6,10,15,INK);r(8,7,8,12,a.base);
  r(9,8,6,9,a.accent);r(10,9,4,7,a.shine);
  r(9,3,6,4,INK);r(10,4,4,2,a.shine);
  r(6,19,12,3,INK);r(7,20,10,1,a.base);
  r(6,11,2,5,a.shine);
 }else if(n===2){
  r(4,9,15,10,INK);r(5,10,12,8,a.base);
  r(11,8,10,13,INK);r(13,9,7,11,a.shine);
  r(14,11,4,7,a.accent);r(5,11,6,3,a.shine);
  r(7,4,6,5,INK);r(8,5,4,4,a.base);
 }else if(n===3){
  r(4,6,16,17,INK);r(6,8,12,13,a.base);
  r(10,2,4,5,a.accent);r(7,4,10,4,INK);
  r(11,8,3,10,a.shine);r(8,12,8,3,a.accent);
  r(7,20,10,2,a.shine);r(4,13,3,5,a.shine);
 }else if(n===4){
  r(5,6,14,16,INK);r(6,8,12,13,a.base);
  r(8,8,8,11,DARK);r(9,9,6,9,a.accent);
  r(10,10,4,7,a.shine);r(7,4,10,3,a.shine);
  r(3,10,4,8,INK);r(17,10,4,8,INK);r(5,20,14,2,a.shine);
 }else{
  r(7,3,10,20,INK);r(8,4,8,18,a.base);
  r(10,6,4,13,a.shine);r(8,11,8,3,a.accent);
  r(4,8,3,11,a.accent);r(17,8,3,11,a.accent);
  r(10,0,4,4,a.shine);r(6,20,12,3,a.shine);
  r(9,6,6,2,INK);
 }
}
function curiosity(r,type,a){
 if(type==='charge'){
  r(6,4,13,18,INK);r(7,6,11,14,a.base);
  r(9,6,6,14,a.shine);r(5,8,15,3,a.accent);
  r(5,17,15,3,a.accent);r(9,10,7,7,INK);
  r(11,12,3,3,CREAM);r(12,2,2,4,INK);
  r(13,1,4,2,a.shine);r(15,0,2,2,CREAM);
 }else if(type==='map'){
  r(3,4,19,17,INK);r(4,5,17,15,a.base);
  r(6,6,1,12,a.accent);r(11,6,1,12,a.accent);
  r(8,11,3,2,a.shine);r(12,12,3,2,a.shine);
  r(16,10,3,4,a.accent);r(17,11,1,2,INK);
  r(2,3,20,2,a.shine);r(3,20,18,2,a.shine);
 }else if(type==='tooth'){
  r(7,2,10,6,INK);r(4,6,16,7,INK);r(6,10,12,8,INK);
  r(8,16,3,6,INK);r(14,16,3,5,INK);
  r(8,4,8,8,a.shine);r(6,8,12,4,a.base);
  r(8,12,9,4,a.accent);r(9,16,2,5,CREAM);
  r(15,15,2,5,CREAM);r(10,5,3,3,CREAM);
 }else if(type==='crate'){
  r(3,5,19,16,INK);r(4,6,17,14,a.base);
  r(5,7,15,2,a.shine);r(5,17,15,2,a.shine);
  r(5,9,3,8,INK);r(16,9,3,8,INK);
  r(8,11,8,3,a.accent);r(10,11,4,3,INK);
  r(7,3,11,3,INK);r(8,4,9,1,a.shine);
 }else if(type==='token'){
  r(7,2,10,2,INK);r(4,4,16,4,INK);r(2,8,20,9,INK);
  r(4,17,16,4,INK);r(7,21,10,2,INK);
  r(6,5,12,14,a.base);r(4,9,16,6,a.accent);
  r(9,7,6,10,a.shine);r(11,9,3,6,INK);
  r(7,20,10,1,a.shine);r(8,5,7,1,a.shine);
 }
}
export function getShopItemSprite(type,level=0){
 const a=shopItemAsset(type,level),key=a.type+'-'+a.id;
 if(cache.has(key))return cache.get(key);
 const c=document.createElement('canvas');c.width=24;c.height=24;
 const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
 const r=(x,y,w,h,color)=>tile(ctx,x,y,w,h,color);
 if(type==='line')reel(r,a.tier,a);
 else if(type==='net')hookRig(r,a.tier,a);
 else if(type==='gun')weapon(r,a.tier,a);
 else if(type==='light')lantern(r,a.tier,a);
 else curiosity(r,type,a);
 cache.set(key,c);
 return c;
}
