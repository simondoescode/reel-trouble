import assert from 'node:assert/strict';
import test from 'node:test';
import {ARCADE_STAGES, STAGE_DURATION, easeOutCubic, stageFrame, startStage} from '../src/arcade-ui.js';

test('all fishing phases get readable, distinct interstitial cues',()=>{
 assert.deepEqual(Object.keys(ARCADE_STAGES),['dive','reel','shoot','results']);
 for(const stage of Object.values(ARCADE_STAGES)){
  assert.ok(stage.title.length<=20);
  assert.ok(stage.subtitle.length<=28);
  assert.match(stage.accent,/^#[0-9a-f]{6}$/i);
 }
});
test('stage animation starts and ends transparent, peaks between',()=>{
 const start=stageFrame(0),middle=stageFrame(STAGE_DURATION*.45),end=stageFrame(STAGE_DURATION);
 assert.equal(start.visibility,0);
 assert.equal(end.visibility,0);
 assert.ok(middle.visibility>.99);
 assert.ok(start.slide>middle.slide);
 assert.equal(stageFrame(-1).progress,0);
 assert.equal(stageFrame(10).progress,1);
});
test('stage animation can be disabled for reduced effects',()=>{
 assert.equal(startStage('dive',true),null);
 assert.equal(startStage('missing'),null);
 assert.deepEqual(startStage('shoot'),{kind:'shoot',elapsed:0,duration:STAGE_DURATION});
 assert.equal(easeOutCubic(0),0);
 assert.equal(easeOutCubic(1),1);
 assert.equal(easeOutCubic(2),1);
});
