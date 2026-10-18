import assert from 'node:assert/strict';
import test from 'node:test';
import {DISCOVERIES,generateDiscoveryChunk,createDiscoveryStream,drawDiscovery} from '../src/discoveries.js';
import {CHUNK_DEPTH} from '../src/ocean.js';

test('discoveries are deterministic, rare, and reward original names',()=>{
 let seen=0;const max=CHUNK_DEPTH*240;
 for(let i=0;i<240;i++){
  const found=generateDiscoveryChunk(i,340,max);
  assert.deepEqual(found,generateDiscoveryChunk(i,340,max));
  assert.ok(found.length<=1);
  for(const relic of found){
   seen++;
   assert.ok(relic.d>=i*CHUNK_DEPTH);
   assert.ok(relic.d<(i+1)*CHUNK_DEPTH);
   assert.ok(relic.x>50&&relic.x<370);
   assert.equal(relic.name,DISCOVERIES[relic.kind].name);
   assert.equal(relic.reward,DISCOVERIES[relic.kind].reward);
  }
 }
 assert.ok(seen>10&&seen<90,'discoveries should be uncommon but discoverable');
 assert.deepEqual(generateDiscoveryChunk(0,340,max),[]);
});
test('hook proximity claims each relic only once across chunk unloads',()=>{
 const max=CHUNK_DEPTH*150,seed=122;
 let curio;
 for(let i=1;i<130;i++){
  const c=generateDiscoveryChunk(i,seed,max);
  if(c.length){curio=c[0];break;}
 }
 assert.ok(curio);
 const world=createDiscoveryStream(max,seed);
 assert.equal(world.claimAt(curio.d,curio.x+70),null);
 assert.equal(world.claimAt(curio.d+65,curio.x),null);
 assert.equal(world.claimAt(curio.d,curio.x)?.id,curio.id);
 assert.equal(world.claimAt(curio.d,curio.x),null);
 for(let d=curio.d+3000;d<max-2000;d+=3000){
  world.near(d);
  assert.ok(world.chunkCount<=7);
 }
 assert.equal(world.near(curio.d)[0]?.found,true);
 assert.equal(world.foundCount,1);
});
test('each discovery renders using inexpensive pixel geometry',()=>{
 const relic={...DISCOVERIES.nest,x:200,d:4000,found:false};
 let pixels=0;
 const ctx={save(){},restore(){},translate(){},fillRect(x,y,w,h){
  assert.ok([x,y,w,h].every(Number.isFinite));pixels++;}};
 drawDiscovery(ctx,relic,325,1.5,{lowFx:false});
 assert.ok(pixels>=6);
 assert.ok(Object.values(DISCOVERIES).every(d=>d.reward>0&&d.name.length>5));
});
