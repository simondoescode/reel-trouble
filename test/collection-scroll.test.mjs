import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
const part=(start,end)=>{
 const a=game.indexOf(start),b=game.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Missing source region '+start);
 return game.slice(a,b);
};

function scrollModel(fish=15,badges=9){
 const helpers=part('const COLLECTION_LIST_TOP=','function bookCard(');
 return new Function('species','ACHIEVEMENTS','clamp',
  "let collectionTab='fish',collectionScroll={fish:0,badges:0};" + helpers +
  'return {bounds:collectionListBounds,max:collectionMaxScroll,move:collectionScrollTo,'+
  'offset:()=>collectionScroll[collectionTab],choose:tab=>{collectionTab=tab;},row:COLLECTION_ROW};'
 )(Array.from({length:fish}),Array.from({length:badges}),
  (value,min,max)=>Math.max(min,Math.min(max,value)));
}

test('encyclopedia has a continuous scrollable list instead of pagination',()=>{
 const collection=part('function collection(){','function fishDetail(){');
 assert.doesNotMatch(game,/collectionPage|const pageSize=4/);
 assert.doesNotMatch(collection,/← PREV|NEXT →/);
 assert.match(collection,/collectionItemCount\(\)/);
 assert.match(collection,/collectionScroll\[collectionTab\]/);
 assert.match(collection,/ctx\.clip\(\)/);
 assert.match(collection,/bookCard\(index,25,y\)/);
 assert.match(collection,/ACHIEVEMENTS\[index\]/);
 assert.match(collection,/const first=Math\.max\(0,Math\.floor\(offset\/COLLECTION_ROW\)\)/);
 assert.match(collection,/const last=Math\.min\(total-1,Math\.ceil\(/);
 assert.match(collection,/const thumb=/);
 assert.match(collection,/button\('← BACK'/);
});

test('scroll boundaries clamp on both tabs, with independent remembered positions',()=>{
 const m=scrollModel();
 assert.deepEqual(m.bounds(),[228,695]);
 assert.equal(m.row,105);
 assert.equal(m.max(),15*105-(695-228));
 m.move(-120);assert.equal(m.offset(),0);
 m.move(120);assert.equal(m.offset(),120);
 m.move(1000000);assert.equal(m.offset(),m.max());
 m.choose('badges');
 assert.equal(m.offset(),0);
 assert.equal(m.max(),9*105-(695-228));
 m.move(70);assert.equal(m.offset(),70);
 m.choose('fish');
 assert.equal(m.offset(),15*105-(695-228));
 m.choose('badges');assert.equal(m.offset(),70);
});

test('short collections do not scroll past empty space',()=>{
 const m=scrollModel(2,3);
 assert.equal(m.max(),0);
 m.move(200);assert.equal(m.offset(),0);
 m.choose('badges');m.move(200);assert.equal(m.offset(),0);
});

test('touch drag scrolls without accidentally opening fish details',()=>{
 const inputs=part("canvas.addEventListener('pointerdown'","window.addEventListener('keydown'");
 assert.match(inputs,/state==='collection'/);
 assert.match(inputs,/collectionDrag=\{startY:q\.y,startScroll:collectionScroll\[collectionTab\],moved:false\}/);
 assert.match(inputs,/Math\.abs\(dy\)>7/);
 assert.match(inputs,/collectionScrollTo\(collectionDrag\.startScroll-dy\)/);
 assert.match(inputs,/if\(!dragged\)activate\(pos\(e\)\.x,pos\(e\)\.y\)/);
 assert.match(inputs,/collectionDrag=null/);
 assert.match(inputs,/e\.deltaMode===1\?26:e\.deltaMode===2\?b-a:1/);
 const card=part('function bookCard(','function collection(){');
 assert.match(card,/Math\.max\(y,COLLECTION_LIST_TOP\)/);
 assert.match(card,/Math\.min\(y\+height,COLLECTION_LIST_BOTTOM\)/);
 assert.match(card,/selectedFish=kind;state='fishDetail'/);
});

test('keyboard scroll works and fish detail returns to existing list position',()=>{
 const keyboard=part("window.addEventListener('keydown'","window.addEventListener('blur'");
 for(const key of ["ArrowUp","ArrowDown","PageUp","PageDown","Home","End"])
  assert.ok(keyboard.includes(key),key);
 assert.match(keyboard,/collectionScrollTo\(/);
 const detail=part('function fishDetail(){','function installScene(){');
 assert.match(detail,/button\('← ENCYCLOPEDIA'/);
 assert.doesNotMatch(detail,/collectionScroll=\{/);
});
