import assert from 'node:assert/strict';
import test from 'node:test';
import {SPECIES,BIOMES,DEPTH_SCALE,CHUNK_DEPTH,biomeAtDepth,oceanPalette,oceanVisibility,
 chooseSpecies,spawnOcean,generateOceanChunk,createOceanStream,advanceFish,advanceHazard,overlapsHazard,overlapsFish} from '../src/ocean.js';

test('seven original regions use metre-based boundaries and never hit a rendering cap',()=>{
 assert.equal(BIOMES.length,7);
 assert.deepEqual(BIOMES.map(b=>b.start/DEPTH_SCALE),[0,260,640,1230,2160,3850,6700]);
 for(const [i,b] of BIOMES.entries()){
  assert.equal(biomeAtDepth(b.start).id,b.id);
  if(i)assert.equal(biomeAtDepth(b.start-1).id,BIOMES[i-1].id);
 }
 assert.equal(biomeAtDepth(900000).id,'unmarked');
});
test('colour gradients blend at boundaries, remain dim, and fade with depth',()=>{
 const luminance=hex=>{
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
   .map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
 };
 for(const biome of BIOMES)for(const c of biome.colors)assert.ok(luminance(c)<.16,biome.name+' '+c);
 const diff=(a,b)=>[1,3,5].reduce((n,i)=>n+Math.abs(parseInt(a.slice(i,i+2),16)-parseInt(b.slice(i,i+2),16)),0);
 for(const b of BIOMES.slice(1)){
  assert.ok(diff(oceanPalette(b.start-1)[1],oceanPalette(b.start+1)[1])<4,b.name);
 }
 assert.equal(oceanPalette(0).length,4);
 assert.ok(oceanVisibility(0)>.98);
 assert.ok(oceanVisibility(7000*3)<.02);
});
test('fish identities stay compatible with prior saved collections',()=>{
 assert.equal(SPECIES.length,20);
 assert.equal(SPECIES[13].rare,true);
 assert.ok(SPECIES[13].value>SPECIES[12].value);
 assert.equal(chooseSpecies(540,()=>0),13);
 assert.notEqual(chooseSpecies(150,()=>.5),13);
});
test('chunk contents are deterministic, bounded and avoid immediate hook collisions',()=>{
 const c=generateOceanChunk(0,1234,1100);
 assert.deepEqual(c,generateOceanChunk(0,1234,1100));
 assert.notDeepEqual(c,generateOceanChunk(0,1235,1100));
 assert.ok(c.fish.every(f=>f.d>=305&&f.d<1100));
 assert.equal(CHUNK_DEPTH,720);
 assert.equal(generateOceanChunk(200,4,1100).fish.length,0);
 assert.ok(spawnOcean(1050,()=>.42).fish.length>=5);
});
test('streamed catches and hazards persist across chunk unloads without an unbounded cache',()=>{
 const stream=createOceanStream(50000,991);
 const f=stream.near(700,700).fish[0];
 assert.ok(f);
 f.caught=true;
 for(let d=2000;d<=48000;d+=1100){
  stream.near(d,700);
  assert.ok(stream.chunkCount<=6,'too many cached world chunks');
 }
 assert.equal(stream.near(700,700).fish.find(other=>other.id===f.id).caught,true);
 assert.equal(createOceanStream(50000,991).near(700,700).fish.find(other=>other.id===f.id).caught,false);
});
test('fish movement, hazards and jellyfish collisions still work',()=>{
 const fish={id:1,x:200,d:500,kind:10,dir:1,speed:30,phase:0,caught:false};
 advanceFish(fish,.05);assert.ok(fish.x>200);
 const school={id:2,x:200,d:300,kind:8,dir:1,speed:25,phase:0,caught:false};
 advanceFish(school,.05);assert.ok(Number.isFinite(school.swimY));
 const hazard={x:210,d:600,phase:0,drift:15,radius:21};
 assert.equal(overlapsHazard(hazard,210,600),true);
 assert.equal(overlapsHazard(hazard,330,600),false);
 advanceHazard(hazard,.05);assert.ok(Number.isFinite(hazard.x));
});

test('small fish stay recognisable at handheld resolutions with stable species IDs',()=>{
 const undersized=['Guppy','Mackerel','Snapper','Clownfish','Sardine','Riftglimmer','Golden Fish'];
 assert.equal(SPECIES.length,20);
 for(const name of undersized){
  const f=SPECIES.find(species=>species.name===name);
  assert.ok(f&&f.size>=21,`${name} is still too small on phones`);
 }
});
test('fish only collide when inside the hook reach',()=>{
 const fish={id:1,x:210,d:600,kind:8,swimY:0,caught:false};
 assert.equal(overlapsFish(fish,210,600,12,17),true);
 assert.equal(overlapsFish(fish,310,600,12,17),false);
 assert.equal(overlapsFish(fish,210,640,12,17),false);
 assert.equal(overlapsFish({...fish,caught:true},210,600,12,17),false);
 assert.equal(overlapsFish({...fish,swimY:22},210,600,12,17),false);
 assert.equal(overlapsFish(fish,250,600,35,27),true);
});
