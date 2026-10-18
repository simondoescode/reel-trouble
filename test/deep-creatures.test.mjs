import assert from 'node:assert/strict';
import test from 'node:test';
import {DEEP_CREATURES,isDeepCreature,drawDeepCreature} from '../src/deep-creatures.js';

test('three deep-water fish have unique original silhouettes and fish IDs remain stable',()=>{
 assert.deepEqual(Object.keys(DEEP_CREATURES),['5','11','12']);
 const silhouettes=Object.values(DEEP_CREATURES).map(f=>f.rows.join('|'));
 assert.equal(new Set(silhouettes).size,3);
 for(const fish of Object.values(DEEP_CREATURES)){
  assert.ok(fish.rows.length>=7);
  assert.ok(fish.rows.every(row=>/^[ 1-4]+$/.test(row)));
  assert.ok(fish.palette.every(c=>/^#[0-9a-f]{6}$/.test(c)));
 }
 assert.equal(isDeepCreature(5),true);
 assert.equal(isDeepCreature(10),false);
});
test('deep creatures draw in low effects mode without Canvas-only dependencies',()=>{
 const calls=[];
 const ctx={save(){calls.push('save');},restore(){calls.push('restore');},translate(){},scale(){},
  fillRect(...args){assert.ok(args.every(Number.isFinite));calls.push('pixel');}};
 for(const kind of [5,11,12]){
  assert.equal(drawDeepCreature(ctx,{x:210,y:355,kind,dir:-1,phase:2,size:21,lowFx:true}),true);
 }
 assert.equal(drawDeepCreature(ctx,{x:0,y:0,kind:99}),false);
 assert.ok(calls.filter(c=>c==='pixel').length>200);
 assert.equal(calls.filter(c=>c==='save').length,3);
 assert.equal(calls.filter(c=>c==='restore').length,3);
});
