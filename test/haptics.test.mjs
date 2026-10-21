import assert from 'node:assert/strict';
import test from 'node:test';
import { createRumble,RUMBLE_PATTERNS } from '../src/haptics.js';

test('rumble uses short distinct fishing and shooting patterns',()=>{
 const names=['cast','catch','legendary','sting','shot','hit','combo','upgrade','preview'];
 for(const name of names){
  assert.ok(RUMBLE_PATTERNS[name],name);
  assert.ok(RUMBLE_PATTERNS[name].every(n=>n>0&&n<=150),name);
  assert.ok(RUMBLE_PATTERNS[name].reduce((sum,n)=>sum+n,0)<=400,name);
 }
 assert.notDeepEqual(RUMBLE_PATTERNS.sting,RUMBLE_PATTERNS.catch);
 assert.notDeepEqual(RUMBLE_PATTERNS.legendary,RUMBLE_PATTERNS.hit);
});
test('haptic feedback gracefully skips unsupported devices',()=>{
 const rumble=createRumble({vibrate:null,now:()=>1000});
 assert.equal(rumble.supported(),false);
 assert.equal(rumble.play('catch'),false);
 rumble.setEnabled(false);
 rumble.stop();
});
test('enabled rumble sends a copy of an expected vibration pattern',()=>{
 let recorded=null;
 const rumble=createRumble({vibrate:pattern=>{recorded=pattern;return true;},now:()=>1000});
 assert.equal(rumble.supported(),true);
 assert.equal(rumble.play('catch'),true);
 assert.deepEqual(recorded,RUMBLE_PATTERNS.catch);
 recorded[0]=999;
 assert.notEqual(RUMBLE_PATTERNS.catch[0],999);
});
test('cooldown protects against overlapping rapid hits',()=>{
 let now=1000,count=0;
 const rumble=createRumble({vibrate:()=>{count++;return true;},now:()=>now});
 assert.equal(rumble.play('shot'),true);
 now=1030;assert.equal(rumble.play('hit'),false);
 now=1100;assert.equal(rumble.play('combo'),true);
 assert.equal(count,2);
});
test('disable cancels pending vibrations and prevents later rumbles',()=>{
 const received=[];
 const rumble=createRumble({vibrate:pattern=>{received.push(pattern);return true;},now:()=>1000});
 rumble.play('sting');
 rumble.setEnabled(false);
 assert.equal(received.at(-1),0);
 assert.equal(rumble.isEnabled(),false);
 assert.equal(rumble.play('shot'),false);
 rumble.setEnabled(true);
 assert.equal(rumble.isEnabled(),true);
});
test('hidden or paused state prevents vibration',()=>{
 let hidden=true,count=0;
 const rumble=createRumble({vibrate:()=>{count++;return true;},suppressed:()=>hidden,now:()=>1000});
 assert.equal(rumble.play('cast'),false);
 hidden=false;
 assert.equal(rumble.play('cast'),true);
 assert.equal(count,1);
});
test('invalid patterns and API exceptions fail without crashing',()=>{
 const blocked=createRumble({vibrate:()=>false,now:()=>1000});
 assert.equal(blocked.play('hit'),false);
 const broken=createRumble({vibrate:()=>{throw Error('vibration blocked');},now:()=>1000});
 assert.equal(broken.play('sting'),false);
 assert.doesNotThrow(()=>broken.stop());
 assert.equal(broken.play('not-a-pattern'),false);
});

test('initially disabling rumble does not vibrate before a browser gesture',()=>{
 const received=[];
 const rumble=createRumble({vibrate:pattern=>{received.push(pattern);return true;},now:()=>1000});
 rumble.setEnabled(false);
 assert.deepEqual(received,[]);
 rumble.stop();
 assert.deepEqual(received,[]);
});
