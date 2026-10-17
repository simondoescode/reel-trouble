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

test('upbeat soundtrack uses distinct bass and faster scene tempos',async()=>{
 const {ARCADE_BASS,MUSIC_STEP_SECONDS}=await import('../src/audio.js');
 assert.equal(ARCADE_BASS.length,16);
 assert.ok(MUSIC_STEP_SECONDS.menu>=.16);
 assert.ok(MUSIC_STEP_SECONDS.shoot<MUSIC_STEP_SECONDS.menu);
 assert.notDeepEqual(ARCADE_BASS,ARCADE_MELODY);
});
