import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {BOAT_HULLS,BOAT_FLAGS,boatOptions,normalizeBoatStyle,boatPurchase} from '../src/boat-customisation.js';
const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const section=(start,end)=>{
 const a=game.indexOf(start),b=game.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Missing region '+start);return game.slice(a,b);
};

test('boat vanity provides original selectable pixel palettes and separate flags',()=>{
 assert.equal(BOAT_HULLS.length,6);
 assert.equal(BOAT_FLAGS.length,5);
 assert.equal(BOAT_HULLS[0].price,0);
 assert.equal(BOAT_FLAGS[0].price,0);
 for(const list of [BOAT_HULLS,BOAT_FLAGS]){
  assert.equal(new Set(list.map(item=>item.id)).size,list.length);
  assert.ok(list.every(item=>Number.isInteger(item.price)&&item.price>=0&&item.name&&item.detail));
  assert.ok(list.every(item=>/^#[\da-f]{6}$/i.test(item.main)));
 }
 assert.deepEqual(boatOptions('hull'),BOAT_HULLS);
 assert.deepEqual(boatOptions('flag'),BOAT_FLAGS);
 assert.deepEqual(boatOptions('unknown'),[]);
});

test('legacy, invalid and tampered boat customisation saves migrate safely',()=>{
 assert.deepEqual(normalizeBoatStyle(null),{hull:'coral',flag:'none',ownedHulls:['coral'],ownedFlags:['none']});
 assert.deepEqual(normalizeBoatStyle({hull:'ghost',flag:'glow',ownedHulls:['coral','ghost','ghost','evil'],ownedFlags:['glow','none','bad']}),{
  hull:'ghost',flag:'glow',ownedHulls:['coral','ghost'],ownedFlags:['none','glow']
 });
 const invalid=normalizeBoatStyle({hull:'sunburst',flag:'sun',ownedHulls:'not an array',ownedFlags:[null]});
 assert.equal(invalid.hull,'coral');
 assert.equal(invalid.flag,'none');
 assert.match(game,/boatStyle:normalizeBoatStyle\(d\.boatStyle\)/);
 assert.match(game,/boatStyle:normalizeBoatStyle\(\)/);
 assert.match(game,/reel-trouble-save-v1/);
});

test('purchasing boat looks spends only wallet cash and owned looks are free to re-equip',()=>{
 const save={cash:1000,total:13750,best:9000,upgrades:{line:2,net:3,gun:1,light:0},boatStyle:normalizeBoatStyle()};
 assert.equal(boatPurchase(save,'hull','seafoam'),'purchased');
 assert.equal(save.cash,750);
 assert.equal(save.boatStyle.hull,'seafoam');
 assert.ok(save.boatStyle.ownedHulls.includes('seafoam'));
 assert.equal(boatPurchase(save,'flag','skull'),'purchased');
 assert.equal(save.cash,575);
 assert.equal(save.boatStyle.flag,'skull');
 assert.equal(boatPurchase(save,'hull','coral'),'equipped');
 assert.equal(boatPurchase(save,'hull','seafoam'),'equipped');
 assert.equal(save.cash,575,'previously purchased cosmetic cannot charge twice');
 assert.deepEqual(save.upgrades,{line:2,net:3,gun:1,light:0});
 assert.equal(save.total,13750);
 assert.equal(save.best,9000);
});

test('cosmetic purchases block insufficient money and unknown categories',()=>{
 const save={cash:20,boatStyle:normalizeBoatStyle()};
 const before=JSON.stringify(save);
 assert.equal(boatPurchase(save,'hull','ghost'),'funds');
 assert.equal(boatPurchase(save,'flag','glow'),'funds');
 assert.equal(boatPurchase(save,'hull','not-real'),'invalid');
 assert.equal(boatPurchase(save,'weapon','coral'),'invalid');
 assert.equal(JSON.stringify(save),before);
});

test('boat silhouette uses owned colours and flags without changing gameplay',()=>{
 const boat=section('function boat(','function hook(');
 assert.match(boat,/BOAT_HULLS\.find/);
 assert.match(boat,/BOAT_FLAGS\.find/);
 assert.match(boat,/paint\.main/);
 assert.match(boat,/paint\.cabin/);
 assert.match(boat,/flag\.id!=='none'/);
 assert.match(boat,/const arm=Math\.round\(Math\.sin\(clock\*8\)\*4\)/);
 assert.match(boat,/ctx\.restore\(\)/);
 const title=section('function menu(){','function cabinRow(');
 assert.match(title,/boat\(210,seaY\)/);
 assert.match(title,/captainBubble\(\)/);
});

test('boat yard offers previews, scrolling and explicit buy-or-equip confirmation',()=>{
 const yard=section('function boatYard(){','function shop(){');
 assert.match(yard,/shopView='counter'/);
 assert.match(yard,/boatYardScroll\[boatYardTab\]/);
 assert.match(yard,/ctx\.clip\(\)/);
 assert.match(yard,/boat\(85,y\+55/);
 assert.match(yard,/const hitY=Math\.max\(top,y\+3\)/);
 assert.match(yard,/shopInspect=\{kind:'boat'/);
 assert.match(yard,/BOAT_YARD_ROW/);
 const detail=section('function boatInspectOverlay(){','function shopInspectOverlay(){');
 assert.match(detail,/hits\.length=0/);
 assert.match(detail,/boatPurchase\(save,request\.slot,item\.id\)/);
 assert.match(detail,/persist\(\)/);
 assert.match(detail,/result==='funds'/);
 assert.match(detail,/if\(equipped\)/);
 assert.match(game,/if\(item\.kind==='boat'\)\{boatInspectOverlay\(\);return;\}/);
 assert.match(game,/shopButton\('BOAT YARD',215,660/);
});

test('boat yard touch drag, wheel and keys preserve tap-to-inspect',()=>{
 const input=section("canvas.addEventListener('pointerdown'","window.addEventListener('blur'");
 assert.match(input,/boatYardDrag=\{startY:q\.y,startScroll:boatYardScroll\[boatYardTab\],moved:false\}/);
 assert.match(input,/if\(boatYardDrag\.moved\)boatYardScrollTo/);
 assert.match(input,/if\(!dragged\)activate\(pos\(e\)\.x,pos\(e\)\.y\)/);
 assert.match(input,/boatYardDrag=null/);
 assert.match(input,/boatYardScrollTo\(boatYardScroll\[boatYardTab\]\+e\.deltaY\*factor\)/);
 assert.match(input,/PageDown/);
});

test('captain has occasional dialogue and a tap-to-chat action on title screen',()=>{
 const speech=section('function captainSay(','function settleExpedition(){');
 assert.match(speech,/function captainQuip\(/);
 assert.match(speech,/function updateCaptainQuips\(/);
 assert.match(speech,/state!=='menu'/);
 assert.match(speech,/captainLineNext/);
 assert.match(game,/updateCaptainQuips\(\)/);
 assert.match(game,/captainLineUntil=clock\+duration/);
 const menu=section('function captainBubble(){','function cabinRow(');
 assert.match(menu,/pixelPlate\(45,252,326,65/);
 assert.match(menu,/storyCopy\(captainLine/);
 assert.match(menu,/hits\.push\(\{x:78,y:320,w:275,h:164/);
});

test('offline PWA includes boat cosmetics source',()=>{
 assert.match(sw,/src\/boat-customisation\.js/);
 assert.match(sw,/const CACHE='reel-trouble-offline-v[1-9]\d*';/);
 assert.match(sw,/k!==CACHE/);
});
