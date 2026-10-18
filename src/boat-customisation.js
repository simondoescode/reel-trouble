// Original pixel-boat paint jobs and pennants. Pure data + save migration.
export const BOAT_HULLS=Object.freeze([
 {id:'coral',name:'CORAL RUNNER',price:0,main:'#f05b60',shade:'#a92d50',shine:'#ff9f90',trim:'#ffe2a3',cabin:'#fff2db',detail:'THE ORIGINAL WORKHORSE'},
 {id:'seafoam',name:'SEAFOAM',price:250,main:'#35c5b4',shade:'#187986',shine:'#93f5d9',trim:'#fff4b5',cabin:'#f6ffdf',detail:'FRESH FROM THE HARBOUR'},
 {id:'midnight',name:'NIGHT TIDE',price:650,main:'#364a8a',shade:'#1c2b5a',shine:'#8791d8',trim:'#b8eaff',cabin:'#dcdeff',detail:'DARK WATER, BRIGHT STARS'},
 {id:'sunburst',name:'GOLD RUSH',price:1250,main:'#f8ad3b',shade:'#bf622b',shine:'#ffe275',trim:'#fff6dd',cabin:'#fff6d5',detail:'SHINE LIKE A LEGEND'},
 {id:'shark',name:'SHARK BAIT',price:2100,main:'#738da1',shade:'#3c5269',shine:'#b6d9e2',trim:'#f9f4dc',cabin:'#e8f1f1',detail:'A BITE OF ATTITUDE'},
 {id:'ghost',name:'GHOST SHIP',price:3650,main:'#785c96',shade:'#43355e',shine:'#ca9ed9',trim:'#9ff7d4',cabin:'#eee4f3',detail:'THE DEEP REMEMBERS'}
]);
export const BOAT_FLAGS=Object.freeze([
 {id:'none',name:'PLAIN MAST',price:0,main:'#f8e9c4',mark:'#f8e9c4',detail:'KEEP A LOW PROFILE'},
 {id:'skull',name:'JOLLY ROGER',price:175,main:'#1f2c3b',mark:'#fff3d9',detail:'A LITTLE BIT PIRATE'},
 {id:'fish',name:'LUCKY FISH',price:425,main:'#29cdbd',mark:'#fff1a0',detail:'A FISHERMAN\'S CHARM'},
 {id:'sun',name:'GOLDEN PENNANT',price:800,main:'#ffcf58',mark:'#bf573f',detail:'THE HARBOUR WILL NOTICE'},
 {id:'glow',name:'GHOST LIGHT',price:1550,main:'#604381',mark:'#a6ffe3',detail:'A SIGNAL FROM BELOW'}
]);
export const DEFAULT_BOAT_STYLE=Object.freeze({
 hull:'coral',flag:'none',ownedHulls:['coral'],ownedFlags:['none']
});
export function boatOptions(slot){
 if(slot==='hull')return BOAT_HULLS;
 if(slot==='flag')return BOAT_FLAGS;
 return [];
}
export function normalizeBoatStyle(value){
 const input=value&&typeof value==='object'?value:{};
 const owned=(list,items,fallback)=>{
  const ids=Array.isArray(list)?list.filter(id=>items.some(item=>item.id===id)):[];
  return [fallback,...new Set(ids.filter(id=>id!==fallback))];
 };
 const ownedHulls=owned(input.ownedHulls,BOAT_HULLS,'coral');
 const ownedFlags=owned(input.ownedFlags,BOAT_FLAGS,'none');
 return {
  hull:ownedHulls.includes(input.hull)?input.hull:'coral',
  flag:ownedFlags.includes(input.flag)?input.flag:'none',
  ownedHulls,ownedFlags
 };
}
export function boatPurchase(save,slot,id){
 const options=boatOptions(slot),item=options.find(option=>option.id===id);
 if(!item)return 'invalid';
 const style=normalizeBoatStyle(save.boatStyle);
 const ownedKey=slot==='hull'?'ownedHulls':'ownedFlags';
 const equippedKey=slot;
 if(style[ownedKey].includes(id)){
  style[equippedKey]=id;save.boatStyle=style;
  return 'equipped';
 }
 if(!Number.isFinite(save.cash)||save.cash<item.price)return 'funds';
 save.cash-=item.price;
 style[ownedKey].push(id);
 style[equippedKey]=id;
 save.boatStyle=style;
 return 'purchased';
}
