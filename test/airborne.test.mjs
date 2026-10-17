import assert from 'node:assert/strict';
import test from 'node:test';
import { AIR_GRAVITY, SHOOT_WATERLINE, makeAirborneCatch, stepAirborneCatch, allCatchResolved } from '../src/airborne.js';

test('launches with upwards velocity and accelerating gravity, then falls', () => {
 const fish=makeAirborneCatch({kind:2,value:40},0,1,()=>.5);
 assert.equal(fish.launched,false);
 assert.ok(fish.vy<0);
 stepAirborneCatch(fish,.1);
 assert.equal(fish.launched,true);
 const vy=fish.vy;
 stepAirborneCatch(fish,.1);
 assert.ok(Math.abs(fish.vy-vy-AIR_GRAVITY*.1)<.0001);
 let descended=false;
 for(let i=0;i<120&&!fish.lost;i++){
  const previousY=fish.y;
  stepAirborneCatch(fish,.05);
  if(fish.y>previousY)descended=true;
 }
 assert.ok(descended,'fish passes the apex and descends');
 assert.equal(fish.lost,true,'fish eventually splashes down');
 assert.equal(fish.y,SHOOT_WATERLINE-12);
 assert.equal(stepAirborneCatch(fish,1),false,'landing fires only once');
});

test('staggered launches remain invisible and untargetable before taking flight', () => {
 const f=makeAirborneCatch({kind:0,value:10},5,8,()=>.5);
 assert.ok(f.launchDelay>.6);
 assert.equal(stepAirborneCatch(f,.2),false);
 assert.equal(f.launched,false);
 assert.equal(f.y,SHOOT_WATERLINE+15);
 stepAirborneCatch(f,1);
 assert.equal(f.launched,true);
});

test('shot fish stop moving and splash-downs can finish a round', () => {
 const a=makeAirborneCatch({kind:0,value:10},0,2,()=>.5);
 const b=makeAirborneCatch({kind:1,value:20},1,2,()=>.5);
 a.shot=true;
 const x=a.x,y=a.y;
 assert.equal(stepAirborneCatch(a,3),false);
 assert.deepEqual([a.x,a.y],[x,y]);
 assert.equal(allCatchResolved([a,b]),false);
 b.lost=true;
 assert.equal(allCatchResolved([a,b]),true);
 assert.equal(allCatchResolved([]),true);
});
