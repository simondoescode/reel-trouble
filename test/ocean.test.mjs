import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SPECIES,BIOMES,biomeAtDepth,oceanPalette,chooseSpecies,spawnOcean,
  advanceFish,advanceHazard,overlapsHazard
} from '../src/ocean.js';

test('three depth biomes blend smoothly and remain accessible',()=>{
 assert.equal(BIOMES.length,3);
 assert.equal(biomeAtDepth(0).id,'reef');
 assert.equal(biomeAtDepth(449).id,'reef');
 assert.equal(biomeAtDepth(450).id,'kelp');
 assert.equal(biomeAtDepth(1080).id,'trench');
 assert.equal(oceanPalette(0).length,4);
 assert.deepEqual(oceanPalette(600),BIOMES[1].colors);
 assert.deepEqual(oceanPalette(1240),BIOMES[2].colors);
 assert.notDeepEqual(oceanPalette(449),oceanPalette(600));
});
test('eight new species are distinct, valuable and constrained by depth tables',()=>{
 assert.equal(SPECIES.length,14);
 for(const name of ['Clownfish','Pufferfish','Sardine','Lionfish','Tuna','Lanternfish','Anglerfish','Golden Fish']){
  assert.ok(SPECIES.some(s=>s.name===name),name);
 }
 assert.equal(SPECIES[13].rare,true);
 assert.ok(SPECIES[13].value>SPECIES[12].value);
 assert.notEqual(chooseSpecies(150,()=>.5),13);
 assert.equal(chooseSpecies(600,()=>0),13);
 assert.equal(chooseSpecies(1500,()=>0),13);
});
test('spawned fish and hazards fit the available line length',()=>{
 let seed=49;
 const rng=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const short=spawnOcean(720,rng);
 assert.ok(short.fish.length>=8);
 assert.ok(short.hazards.length>=1);
 assert.ok(short.fish.every(f=>f.d>=295&&f.d<=660&&f.kind>=0&&f.kind<14));
 assert.ok(short.hazards.every(h=>h.d>400&&h.d<720));
 const deep=spawnOcean(1920,rng);
 assert.ok(deep.fish.some(f=>biomeAtDepth(f.d).id==='trench'));
 assert.ok(deep.hazards.length>short.hazards.length);
});
test('dash, zigzag, schooling and hazard movement update predictably',()=>{
 const fish={id:1,x:200,d:500,kind:10,dir:1,speed:30,phase:0,caught:false};
 advanceFish(fish,.05);assert.ok(fish.x>200);
 const school={id:2,x:200,d:300,kind:8,dir:1,speed:25,phase:0,caught:false};
 advanceFish(school,.05);assert.ok(Number.isFinite(school.swimY));
 const hazard={x:210,d:600,phase:0,drift:15,radius:21};
 assert.equal(overlapsHazard(hazard,210,600),true);
 assert.equal(overlapsHazard(hazard,330,600),false);
 advanceHazard(hazard,.05);
 assert.ok(Number.isFinite(hazard.x));
});

test('fish stand out against muted biome palettes and transitions stay smooth',()=>{
 const luminance=hex=>{
  const linear=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
   .map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
  return .2126*linear[0]+.7152*linear[1]+.0722*linear[2];
 };
 for(const biome of BIOMES){
  for(const colour of biome.colors)assert.ok(luminance(colour)<.16,
    biome.name+' '+colour+' too bright');
 }
 for(const d of [0,300,450,600,930,1080,1230,2500]){
  assert.equal(oceanPalette(d).length,4);
  assert.ok(oceanPalette(d).every(c=>/^#[0-9a-f]{6}$/.test(c)));
 }
 const difference=(a,b)=>[1,3,5].reduce((sum,i)=>sum+Math.abs(parseInt(a.slice(i,i+2),16)-parseInt(b.slice(i,i+2),16)),0);
 for(const boundary of [450,1080])assert.ok(difference(oceanPalette(boundary-1)[1],oceanPalette(boundary)[1])<3,
   'abrupt colour jump at '+boundary);
});

test('depth distribution leaves the shallows clear and thins out fish encounters',()=>{
 const rng=()=>.5;
 const shallow=spawnOcean(720,rng);
 assert.ok(shallow.fish.every(f=>f.d>=295));
 assert.ok(shallow.fish.length<=12);
 const deep=spawnOcean(1920,rng);
 assert.ok(deep.fish.length<1920/43);
 assert.ok(deep.fish.some(f=>f.d>=1080));
});
