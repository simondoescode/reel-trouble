import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {SHOP_ITEM_ASSETS,shopAssetCount,shopItemAsset,getShopItemSprite} from '../src/shop-item-assets.js';

function mockCanvas(){
 const pixels=new Map();
 const ctx={fillStyle:'#000000',imageSmoothingEnabled:true,
  fillRect(x,y,w,h){
   for(let row=Math.max(0,y);row<Math.min(24,y+h);row++)
    for(let col=Math.max(0,x);col<Math.min(24,x+w);col++)
     pixels.set(col+','+row,this.fillStyle);
  }};
 return {width:0,height:0,pixels,getContext:()=>ctx};
}
test('every shop tier and curiosity has its own registered asset',()=>{
 const expected={line:15,net:6,gun:6,light:6,charge:1,map:1,tooth:1,crate:1,token:1};
 const ids=[];
 for(const [type,count] of Object.entries(expected)){
  assert.equal(shopAssetCount(type),count,type);
  assert.equal(SHOP_ITEM_ASSETS[type].length,count);
  for(let tier=0;tier<count;tier++){
   const item=shopItemAsset(type,tier);
   assert.equal(item.tier,tier);
   ids.push(item.id);
   for(const key of ['base','shine','accent'])assert.match(item[key],/^#[\da-f]{6}$/i);
  }
 }
 assert.equal(new Set(ids).size,ids.length,'each item has a distinct asset ID');
 assert.equal(shopItemAsset('line',999).tier,14,'invalid oversized levels clamp');
 assert.equal(shopItemAsset('net',-99).tier,0);
 assert.throws(()=>shopItemAsset('unknown',0),/Unknown shop item/);
});
test('sprites are distinct pixel silhouettes and reusable from thumbnail to inspection',()=>{
 const oldDocument=globalThis.document;
 globalThis.document={createElement:(tag)=>{
  assert.equal(tag,'canvas');
  return mockCanvas();
 }};
 try{
  for(const type of Object.keys(SHOP_ITEM_ASSETS)){
   const imageHashes=new Set();
   for(let tier=0;tier<shopAssetCount(type);tier++){
    const sprite=getShopItemSprite(type,tier);
    assert.equal(sprite.width,24);
    assert.equal(sprite.height,24);
    assert.ok(sprite.pixels.size>=22,type+' tier '+tier+' should have visible pixels');
    // Test physical artwork, not merely a new asset identifier.
    const signature=JSON.stringify([...sprite.pixels].sort((a,b)=>a[0].localeCompare(b[0])));
    assert.ok(!imageHashes.has(signature),type+' tier '+tier+' must not reuse a sprite');
    imageHashes.add(signature);
    assert.equal(getShopItemSprite(type,tier),sprite,'assets are cached');
   }
  }
 }finally{
  if(oldDocument===undefined)delete globalThis.document;
  else globalThis.document=oldDocument;
 }
});
test('equipped hook appearance follows upgrade while old saves remain compatible',()=>{
 const source=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.match(source,/\['nets','HOOKS'\]/);
 assert.match(source,/paintShopItem\(ctx,'net',x,y\+7,.2,save\.upgrades\.net,clock,true\)/);
 assert.match(source,/save\.upgrades\.net\*13/);
 assert.match(source,/upgrades:\{line:0,net:0,gun:0,light:0\}/);
});
