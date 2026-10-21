import assert from 'node:assert/strict';
import test from 'node:test';
import {BELLWRAITH,LEGEND_KEY,OCEAN_RELICS,createBellwraith,encounterEvents,
 normalizeLegend,awardLegend,createRelicTrail,claimRelics} from '../src/legendary.js';
import {SPECIES,BIOMES} from '../src/ocean.js';

test('legendary challenge appears in The Hush, leaves original fish indices unchanged',()=>{
 assert.equal(BELLWRAITH.start,BIOMES[3].start);
 assert.equal(SPECIES.length,20);
 assert.equal(LEGEND_KEY,'reel-trouble-legend-v1');
 assert.ok(BELLWRAITH.gateOffsets.at(-1)<900);
});
test('three signal gates are stable for a shared seed and readable at mobile sizes',()=>{
 const a=createBellwraith(748),b=createBellwraith(748);
 assert.deepEqual(a,b);
 assert.notDeepEqual(a.gates,createBellwraith(749).gates);
 assert.equal(a.gates.length,3);
 assert.ok(a.gates.every(g=>g.x>=95&&g.x<=320));
});
test('following three echo gates defeats the Bellwraith without creating a fish catch',()=>{
 const enc=createBellwraith(123),events=[];
 events.push(...encounterEvents(enc,BELLWRAITH.warning-20,BELLWRAITH.warning+20,210));
 assert.equal(events[0].type,'reveal');
 for(const g of enc.gates)events.push(...encounterEvents(enc,g.d-6,g.d+6,g.x));
 assert.deepEqual(events.map(e=>e.type),['reveal','seal','seal','seal','victory']);
 assert.equal(enc.finished,true);
 assert.equal(enc.success,true);
 assert.deepEqual(encounterEvents(enc,0,100000,210),[]);
});
test('missed signals cannot be converted to a win or replayed in one cast',()=>{
 const enc=createBellwraith(123),events=[];
 for(const g of enc.gates)events.push(...encounterEvents(enc,g.d-6,g.d+6,g.x===210?30:420));
 assert.ok(events.some(e=>e.type==='miss'));
 assert.equal(events.at(-1).type,'escape');
 assert.equal(enc.success,false);
 assert.deepEqual(encounterEvents(enc,BELLWRAITH.start,9000,enc.gates[0].x),[]);
});
test('relic collection is positional, persistent and works during ascent too',()=>{
 const list=createRelicTrail(60);
 assert.equal(list.length,2);
 assert.deepEqual(list,createRelicTrail(60));
 assert.ok(list.every(i=>i.x>=86&&i.x<=334));
 const r=list[0],out=claimRelics(list,r.d-30,r.d+30,r.x+120);
 assert.equal(out.length,0);
 const first=claimRelics(list,r.d+30,r.d-30,r.x);
 assert.equal(first.length,1);
 assert.equal(claimRelics(list,r.d+30,r.d-30,r.x).length,0);
 assert.deepEqual(normalizeLegend({relics:[r.id,r.id,'bogus']}).relics,[r.id]);
 assert.equal(OCEAN_RELICS.length,2);
});
test('legend victory is recorded once at full reward, smaller on repeat',()=>{
 const fresh=normalizeLegend({relics:['echo-pearl']});
 const one=awardLegend(fresh);
 assert.equal(one.first,true);assert.equal(one.reward,960);
 assert.equal(one.progress.relics[0],'echo-pearl');
 const two=awardLegend(one.progress);
 assert.equal(two.first,false);assert.equal(two.reward,145);
 assert.equal(two.progress.wins,2);
 assert.equal(normalizeLegend({seen:1,defeated:'yes',attempts:-5,relics:['fake']}).defeated,false);
});
