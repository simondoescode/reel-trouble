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
 assert.ok(short.fish.length>=16);
 assert.ok(short.hazards.length>=1);
 assert.ok(short.fish.every(f=>f.d>=150&&f.d<=660&&f.kind>=0&&f.kind<14));
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
