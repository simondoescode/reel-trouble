import assert from 'node:assert/strict';
import test from 'node:test';
import { tiltAxis, tiltVelocity } from '../src/tilt.js';

test('portrait sensor gamma steers horizontally', () => {
  assert.equal(tiltAxis(45,12,0),12);
  assert.equal(tiltAxis(45,12,180),-12);
  assert.equal(tiltAxis(null,null,0),null);
});
test('landscape maps beta to horizontal tilt', () => {
  assert.equal(tiltAxis(18,5,90),18);
  assert.equal(tiltAxis(18,5,270),-18);
});
test('neutral is calibrated and small movements have dead zone', () => {
  assert.equal(tiltVelocity(10,10),0);
  assert.equal(tiltVelocity(12,10),0);
  assert.ok(tiltVelocity(23,10)>0);
  assert.ok(tiltVelocity(-3,10)<0);
  assert.equal(tiltVelocity(50,10),350);
  assert.equal(tiltVelocity(-50,10),-350);
  assert.equal(tiltVelocity(NaN,10),0);
});
