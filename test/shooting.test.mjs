import assert from 'node:assert/strict';
import test from 'node:test';
import { weaponForLevel, pickShotTargets, nextCombo, shotPayout } from '../src/shooting.js';

test('upgrade levels unlock six increasingly powerful weapons', () => {
 assert.equal(weaponForLevel(0).name,'POP GUN');
 assert.equal(weaponForLevel(1).maxHits,1);
 assert.equal(weaponForLevel(2).name,'SCATTERGUN');
 assert.equal(weaponForLevel(3).maxHits,3);
 assert.equal(weaponForLevel(4).name,'NEON BLASTER');
 assert.equal(weaponForLevel(5).maxHits,5);
 assert.equal(weaponForLevel(100).tier,2);
});
test('shots need to hit fish rather than the nearest fish across the screen', () => {
 const fish=[{x:70,y:250,size:16,shot:false},{x:320,y:360,size:22,shot:false}];
 assert.deepEqual(pickShotTargets(fish,190,450,weaponForLevel(0)),[]);
 assert.deepEqual(pickShotTargets(fish,70,250,weaponForLevel(0)),[fish[0]]);
 assert.deepEqual(pickShotTargets([{...fish[0],shot:true}],70,250,weaponForLevel(0)),[]);
});
test('larger fish have size-dependent hit boxes and upgrades spread over groups', () => {
 const fish=[{x:160,y:290,size:16,shot:false},{x:210,y:290,size:16,shot:false},{x:255,y:290,size:16,shot:false}];
 assert.equal(pickShotTargets(fish,210,290,weaponForLevel(0)).length,1);
 assert.equal(pickShotTargets(fish,210,290,weaponForLevel(2)).length,2);
 assert.equal(pickShotTargets(fish,210,290,weaponForLevel(4)).length,3);
 assert.deepEqual(pickShotTargets(fish,NaN,290,weaponForLevel(4)),[]);
});
test('combos accumulate within window, cap at four and reset on miss', () => {
 let c=nextCombo(0,-Infinity,1,1);
 assert.equal(c.multiplier,1);
 c=nextCombo(c.count,c.lastHit,3,1);
 assert.equal(c.multiplier,2);
 c=nextCombo(c.count,c.lastHit,3.8,1);
 c=nextCombo(c.count,c.lastHit,4.3,1);
 c=nextCombo(c.count,c.lastHit,4.6,1);
 assert.equal(c.multiplier,4);
 c=nextCombo(c.count,c.lastHit,5,0);
 assert.equal(c.count,0);
 assert.equal(nextCombo(3,5,8,1).multiplier,1);
});
test('payout multiplies hit values safely', () => {
 assert.equal(shotPayout(20,3),60);
 assert.equal(shotPayout(10,1),10);
 assert.equal(shotPayout(-20,3),0);
});

test('every gun upgrade remains worthwhile with unlimited ammo', () => {
 assert.ok(weaponForLevel(1).aimAssist > weaponForLevel(0).aimAssist);
 assert.ok(weaponForLevel(3).spread > weaponForLevel(2).spread);
 assert.ok(weaponForLevel(5).spread > weaponForLevel(4).spread);
});

test('pending and splashed-down fish cannot be shot for cash', () => {
 const gun=weaponForLevel(4);
 const fishes=[
  {x:100,y:240,size:18,launched:false,shot:false,lost:false},
  {x:100,y:240,size:18,launched:true,shot:false,lost:true},
  {x:100,y:240,size:18,launched:true,shot:false,lost:false}
 ];
 assert.deepEqual(pickShotTargets(fishes,100,240,gun),[fishes[2]]);
 assert.deepEqual(pickShotTargets(fishes.slice(0,2),100,240,gun),[]);
});
