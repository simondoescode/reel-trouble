import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AIR_GRAVITY, SHOOT_WATERLINE, SHOOT_SURFACE_INSET, SHOOT_GUN_X,
  SHOOT_GUN_WORLD_Y, SHOOT_GUN_SCALE, shootGunPose, visibleShotTrailStart,
  makeAirborneCatch, stepAirborneCatch, targetSkyCamera,
  stepSkyCamera, skyScreenY, allCatchResolved
} from '../src/airborne.js';

const fish = (i=0, n=1, size=18) => makeAirborneCatch(
  {kind:i, value:40, size}, i, n, () => .5, {x:210,reelSpeed:205}
);

test('a catch erupts close to the real hook rather than spawning across the sky', () => {
  const school = Array.from({length:24}, (_, i) => fish(i,24));
  assert.ok(school.every(f => f.y > SHOOT_WATERLINE && Math.abs(f.x-210) <= 21));
  assert.ok(school.every(f => f.launchDelay <= .07));
  assert.ok(school.some(f => f.vx<0) && school.some(f => f.vx>0));
});

test('gravity creates an arc, upward launch, apex and single water return', () => {
  const f=fish();
  assert.ok(f.vy<0);
  let apex=false, splash=0, previousY=f.y;
  for(let i=0;i<800;i++){
    const before=f.vy;
    if(stepAirborneCatch(f,.01)) splash++;
    if(before<0&&f.vy>=0) apex=true;
    previousY=f.y;
  }
  assert.ok(apex);
  assert.equal(splash,1);
  assert.equal(f.lost,true);
  assert.equal(previousY,SHOOT_WATERLINE-SHOOT_SURFACE_INSET);
  assert.equal(stepAirborneCatch(f,1),false);
});

test('fish positions are effectively frame-rate independent', () => {
  const positions=[30,60,120].map(fps=>{
    const f=fish();
    for(let i=0;i<fps*2;i++)stepAirborneCatch(f,1/fps);
    return {x:f.x,y:f.y,vx:f.vx,vy:f.vy,angle:f.angle};
  });
  for(const p of positions.slice(1))
    for(const k of Object.keys(p))assert.ok(Math.abs(p[k]-positions[0][k])<.0001,k);
});

test('larger fish have less launch energy and spin than light fish', () => {
  const small=fish(0,1,12), huge=fish(0,1,57);
  assert.ok(small.vy<huge.vy);
  assert.ok(Math.abs(small.spin)>=Math.abs(huge.spin));
});

test('reel momentum affects the launch, and starts at the actual hook', () => {
  const slow=makeAirborneCatch({kind:0,value:10},0,1,()=>.5,{x:90,reelSpeed:120});
  const fast=makeAirborneCatch({kind:0,value:10},0,1,()=>.5,{x:90,reelSpeed:250});
  assert.equal(slow.x,90);
  assert.ok(fast.vy<slow.vy);
});

test('camera opens on the reel waterline and smoothly follows aerial targets', () => {
  const f=fish();
  let camera=SHOOT_WATERLINE-192;
  assert.equal(skyScreenY(SHOOT_WATERLINE,camera),192);
  stepAirborneCatch(f,.5);
  for(let i=0;i<35;i++)camera=stepSkyCamera(camera,targetSkyCamera([f]),1/60,true);
  assert.ok(camera<SHOOT_WATERLINE-192);
  assert.ok(Number.isFinite(skyScreenY(f.y,camera)));
  assert.ok(targetSkyCamera([])===0);
});

test('24 fish remain within the viewport throughout their flight', () => {
  const school=Array.from({length:24},(_,i)=>fish(i,24,i%2?57:12));
  for(let i=0;i<600;i++){
    for(const f of school)stepAirborneCatch(f,.01);
    assert.ok(school.every(f=>f.x>=34&&f.x<=386));
  }
  assert.ok(allCatchResolved(school));
});

test('no target launches, moves or pays twice after being shot', () => {
  const a=fish(0,2), b=fish(1,2);
  stepAirborneCatch(a,.5);
  a.shot=true;
  const prev=[a.x,a.y];
  stepAirborneCatch(a,.2);
  assert.deepEqual([a.x,a.y],prev);
  assert.equal(allCatchResolved([a,b]),false);
  b.lost=true;
  assert.equal(allCatchResolved([a,b]),true);
  assert.equal(allCatchResolved([]),true);
});

test('boat-mounted gun preserves a world position while the camera climbs', () => {
  const initialOffset=SHOOT_WATERLINE-192;
  const start=shootGunPose(initialOffset,210,40);
  const midway=shootGunPose(0,210,40);
  const high=shootGunPose(-455,210,40);
  assert.equal(start.x,SHOOT_GUN_X);
  assert.equal(start.y,SHOOT_GUN_WORLD_Y-initialOffset);
  assert.equal(midway.y-start.y,initialOffset);
  assert.equal(high.y,SHOOT_GUN_WORLD_Y+455);
  assert.ok(high.y>780,'gun leaves camera along with its deck');
  assert.equal(SHOOT_GUN_SCALE,.55);
});

test('muzzle stays on the cannon barrel and points toward the tap', () => {
  const p=shootGunPose(0,120,150,1);
  const distance=Math.hypot(p.muzzleX-p.x,p.muzzleY-p.y);
  assert.ok(Math.abs(distance-SHOOT_GUN_SCALE*89)<1e-8);
  assert.ok(p.muzzleY<p.y);
  assert.ok(p.muzzleX<p.x);
  assert.equal(shootGunPose(0,SHOOT_GUN_X,SHOOT_GUN_WORLD_Y).angle,0,'zero-distance target aims up');
});

test('shots enter from the viewport edge when the deck cannon is offscreen', () => {
  const from=visibleShotTrailStart(260,1100,130,240);
  assert.equal(from.y,780);
  assert.ok(from.x<260&&from.x>130);
  assert.deepEqual(visibleShotTrailStart(260,600,130,240),{x:260,y:600});
  assert.equal(visibleShotTrailStart(260,1100,130,960),null);
  assert.deepEqual(visibleShotTrailStart(200,-80,200,200),{x:200,y:0});
  assert.equal(visibleShotTrailStart(NaN,100,200,200),null);
});
