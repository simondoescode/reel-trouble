import assert from 'node:assert/strict';
import test from 'node:test';
import { createArcadeAudio, melodyNote, noteFrequency,
         ARCADE_MELODY, UNDERWATER_MELODY, SHOT_MELODY } from '../src/audio.js';

test('original melodies have notes, rests and distinct motifs',()=>{
 assert.equal(ARCADE_MELODY.length,16);
 assert.equal(UNDERWATER_MELODY.length,16);
 assert.equal(SHOT_MELODY.length,16);
 assert.notDeepEqual(ARCADE_MELODY,UNDERWATER_MELODY);
 assert.notDeepEqual(SHOT_MELODY,ARCADE_MELODY);
 assert.ok(melodyNote(4,'menu')>0);
 assert.ok(melodyNote(1,'descent')>0);
 assert.ok(melodyNote(0,'shoot')>0);
 assert.equal(melodyNote(16,'menu'),melodyNote(0,'menu'));
});
test('note frequency is tuned and rejects rests',()=>{
 assert.equal(noteFrequency(69),440);
 assert.equal(noteFrequency(0),0);
 assert.equal(noteFrequency(NaN),0);
 assert.ok(Math.abs(noteFrequency(60)-261.63)<.02);
});
test('audio gracefully works in a headless browser or with disabled audio',()=>{
 const player=createArcadeAudio();
 player.setOptions({sound:false,music:false});
 player.unlock();
 player.play('catch',{pitch:2});
 player.pause(true);
 player.update(.016,'descent',true);
 player.pause(false);
 player.setOptions({sound:true,music:true});
 player.update(.016,'shoot',false);
 player.dispose();
});

test('soundtrack retains one consistent tempo across scenes',async()=>{
 const {ARCADE_BASS,MUSIC_STEP_SECONDS}=await import('../src/audio.js');
 assert.equal(ARCADE_BASS.length,16);
 assert.ok(MUSIC_STEP_SECONDS.menu>0 && MUSIC_STEP_SECONDS.menu<.16);
 assert.equal(MUSIC_STEP_SECONDS.shoot,MUSIC_STEP_SECONDS.menu);
 assert.notDeepEqual(ARCADE_BASS,ARCADE_MELODY);
});

test('16-bar song has chord changes, section variations and no repeated 16-step loop',async()=>{
 const {soundtrackStep,SONG_CHORDS,MUSIC_BPM}=await import('../src/audio.js');
 assert.equal(SONG_CHORDS.length,16);
 assert.ok(MUSIC_BPM>=110);
 assert.equal(soundtrackStep(0).bar,0);
 assert.equal(soundtrackStep(16).bar,1);
 assert.equal(soundtrackStep(256).bar,0);
 assert.notEqual(soundtrackStep(0).root,soundtrackStep(16).root);
 assert.notEqual(soundtrackStep(0).lead,soundtrackStep(208).lead);
});
test('music transport continues across menus, shop, dive and shooting without restarting',()=>{
 class Param{
  constructor(){this.value=0;}
  setValueAtTime(v){this.value=v;}
  linearRampToValueAtTime(v){this.value=v;}
  exponentialRampToValueAtTime(v){this.value=v;}
  setTargetAtTime(v){this.value=v;}
  cancelScheduledValues(){}
 }
 class Node{
  constructor(){this.gain=new Param();this.frequency=new Param();this.detune=new Param();}
  connect(){return this;}
  start(){} stop(){}
 }
 class FakeContext{
  constructor(){this.currentTime=0;this.state='running';this.sampleRate=22050;this.destination={};FakeContext.current=this;}
  createGain(){return new Node();}
  createOscillator(){return new Node();}
  createBiquadFilter(){return new Node();}
  createBuffer(_channels,length){return {getChannelData(){return new Float32Array(length)}};}
  createBufferSource(){return new Node();}
  close(){return Promise.resolve();}
 }
 const oldWindow=globalThis.window;
 try{
  globalThis.window={AudioContext:FakeContext};
  const music=createArcadeAudio();
  music.setOptions({sound:false,music:true});
  music.unlock();
  music.update(.016,'menu');
  const menuStep=music.transport().step;
  FakeContext.current.currentTime+=.13;
  music.update(.016,'shop');
  const shopStep=music.transport().step;
  FakeContext.current.currentTime+=.13;
  music.update(.016,'descent');
  const diveStep=music.transport().step;
  FakeContext.current.currentTime+=.13;
  music.update(.016,'shoot');
  assert.ok(menuStep>0);
  assert.ok(shopStep>menuStep);
  assert.ok(diveStep>shopStep);
  assert.ok(music.transport().step>diveStep);
  music.pause(true);
  FakeContext.current.currentTime+=12;
  music.update(.016,'shoot');
  assert.equal(music.transport().step>0,true);
  const pausedStep=music.transport().step;
  music.pause(false);
  music.update(.016,'results');
  assert.ok(music.transport().step>pausedStep);
  music.dispose();
 }finally{
  if(oldWindow===undefined)delete globalThis.window;
  else globalThis.window=oldWindow;
 }
});
