import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');

test('reel to sky uses the same sea surface, actual hook and catch momentum',()=>{
  assert.match(game,/shootCameraOffset=SHOOT_WATERLINE-SEA/);
  assert.match(game,/size:species\[f\.kind\]\.size/);
  assert.match(game,/x:hookX,reelSpeed:/);
  assert.match(game,/shootCameraOffset=stepSkyCamera\(/);
});

test('render, shooting and all hit effects use the same camera projection',()=>{
  assert.match(game,/ctx\.translate\(f\.x,airScreenY\(f\.y\)\)/);
  assert.match(game,/pickShotTargets\(airborne\.map\(f=>\(\{\.\.\.f,y:airScreenY\(f\.y\)/);
  assert.match(game,/const hitY=airScreenY\(f\.y\)/);
  assert.match(game,/impactRings\.push\(\{x:f\.x,y:hitY/);
  assert.match(game,/targets:actual\.length/);
});

test('launch foam and falling fish splashes remain world anchored',()=>{
  assert.match(game,/emitSplash\(hookX,SHOOT_WATERLINE/);
  assert.match(game,/shootWorld\?shootCameraOffset:0/);
  assert.match(game,/emitSplash\(f\.x,SHOOT_WATERLINE,species\[f\.kind\]\.color,force,true\)/);
  assert.match(game,/seaY=airScreenY\(SHOOT_WATERLINE\)/);
});
