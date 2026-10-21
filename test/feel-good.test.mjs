import assert from 'node:assert/strict';
import test from 'node:test';
import {FISH_SHAPES,fishSilhouette,drawUniqueFish} from '../src/fish-art.js';
import {regionField,REGION_RULES} from '../src/region-mechanics.js';
import {utcDay,dailySeed,dailyCode,normalizeDaily,recordDaily} from '../src/daily-challenge.js';
import {BIOMES,generateOceanChunk,descentCollides,isNearMiss} from '../src/ocean.js';

test('every common surface fish has a different readable pixel silhouette',()=>{
 const ids=[0,1,2,3,4,6,7,8,9,10,13];
 assert.deepEqual(Object.keys(FISH_SHAPES).map(Number).sort((a,b)=>a-b),ids);
 assert.equal(new Set(ids.map(id=>fishSilhouette(id).join('|'))).size,ids.length);
 for(const id of ids)assert.ok(fishSilhouette(id).join('').includes('5'),'eye for '+id);
 assert.equal(fishSilhouette(14),null);
 assert.equal(drawUniqueFish({}, {kind:14}),false);
});
test('all seven ocean regions change timing or steering in a deterministic way',()=>{
 assert.equal(Object.keys(REGION_RULES).length,7);
 const vals=BIOMES.map(b=>regionField(b.start+12,4.9,82));
 assert.equal(new Set(vals.map(v=>v.id)).size,7);
 assert.equal(vals[0].diveRate,1);
 assert.notEqual(vals[1].drift,0);
 assert.ok(vals[2].diveRate<1);
 assert.ok(regionField(BIOMES[3].start,.5,210).visionBoost>0);
 const lumen=regionField(BIOMES[4].start,.5,210);
 assert.ok(regionField(BIOMES[4].start,.5,lumen.laneX).catchBoost>0);
 assert.ok(regionField(BIOMES[5].start,.5,210).diveRate>1);
 assert.ok(Math.abs(vals[6].drift)>0);
 assert.deepEqual(regionField(260,9,80),regionField(260,9,80));
});
test('UTC daily seed is shareable and retry scores retain best, not the latest',()=>{
 assert.equal(utcDay('2026-10-21T23:59:59Z'),'2026-10-21');
 assert.equal(utcDay('2026-10-22T00:00:00Z'),'2026-10-22');
 assert.equal(dailySeed('2026-10-21'),dailySeed('2026-10-21'));
 assert.notEqual(dailySeed('2026-10-21'),dailySeed('2026-10-22'));
 assert.match(dailyCode('2026-10-21'),/^20261021-[0-9A-F]{8}$/);
 const a=recordDaily(null,120,'2026-10-21');
 assert.deepEqual(a,{result:{day:'2026-10-21',dives:1,best:120},newBest:true});
 const b=recordDaily(a.result,70,'2026-10-21');
 assert.deepEqual(b.result,{day:'2026-10-21',dives:2,best:120});
 assert.equal(b.newBest,false);
 assert.deepEqual(normalizeDaily(b.result,'2026-10-22'),{day:'2026-10-22',dives:0,best:0});
});
test('fair descent collision avoids generous ascent hitbox and rewards near misses',()=>{
 const f={id:1,x:200,d:630,kind:8,swimY:0,caught:false};
 assert.equal(descentCollides(f,200,630,626),true);
 assert.equal(descentCollides(f,235,630,626),false);
 assert.equal(isNearMiss(f,235,630,626),true);
 assert.equal(isNearMiss(f,280,630,626),false);
 assert.equal(descentCollides({...f,bypassed:true},200,630,626),false);
});
test('daily procedural ocean chunks are stable, with room to dodge',()=>{
 const seed=dailySeed('2026-10-21');
 assert.deepEqual(generateOceanChunk(4,seed,6500),generateOceanChunk(4,seed,6500));
 assert.ok(generateOceanChunk(4,seed,6500).fish.length<=5);
});
