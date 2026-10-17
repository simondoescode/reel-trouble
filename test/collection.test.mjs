import assert from 'node:assert/strict';
import test from 'node:test';
import { SPECIES } from '../src/ocean.js';
import { ACHIEVEMENTS,DISCOVERY_BONUS,createCollection,normalizeCollection,
recordCatch,recordShot,grantAchievements,collectionProgress,fishRarity,fishHabitat
} from '../src/collection.js';

test('legacy saves start with an empty collection and saves round trip',()=>{
 const old=normalizeCollection(undefined);
 assert.deepEqual(old,createCollection());
 recordCatch(old,0);recordShot(old,0,50,2);
 assert.deepEqual(normalizeCollection(JSON.parse(JSON.stringify(old))),old);
});
test('invalid saved records and fish IDs cannot corrupt progress',()=>{
 const c=normalizeCollection({fish:{0:{caught:4,shot:999,earned:-15,bestCombo:80},88:{caught:999}},achievements:{first:true,complete:'true',unknown:true}});
 assert.equal(c.fish[0].caught,4);assert.equal(c.fish[0].shot,4);
 assert.equal(c.fish[0].earned,0);assert.equal(c.fish[0].bestCombo,4);
 assert.equal(c.fish[88],undefined);assert.deepEqual(c.achievements,{first:true});
 assert.equal(recordCatch(c,-1).reward,0);
 assert.equal(recordShot(c,99,1000,4),false);
});
test('discovery pays exactly once for each species',()=>{
 const c=createCollection();
 assert.deepEqual(recordCatch(c,3),{discovered:true,reward:DISCOVERY_BONUS});
 assert.deepEqual(recordCatch(c,3),{discovered:false,reward:0});
 assert.equal(c.fish[3].caught,2);
 assert.equal(collectionProgress(c).percentage,7);
});
test('shooting statistics include earnings and best combo',()=>{
 const c=createCollection();
 recordCatch(c,2);assert.equal(recordShot(c,2,84,3),true);
 assert.equal(recordShot(c,2,100,4),false);
 recordCatch(c,2);assert.equal(recordShot(c,2,112,4),true);
 assert.deepEqual(c.fish[2],{caught:2,shot:2,earned:196,bestCombo:4});
 assert.equal(collectionProgress(c).earned,196);
});
test('achievement rewards are unlocked and paid only once',()=>{
 const c=createCollection();recordCatch(c,0);
 assert.deepEqual(grantAchievements(c).unlocked.map(a=>a.id),['first']);
 assert.equal(grantAchievements(c).reward,0);
 for(let i=1;i<5;i++)recordCatch(c,i);
 assert.ok(grantAchievements(c).unlocked.some(a=>a.id==='explorer'));
 for(let i=5;i<SPECIES.length;i++)recordCatch(c,i);
 const unlocked=grantAchievements(c).unlocked.map(a=>a.id);
 assert.ok(unlocked.includes('complete'));assert.ok(unlocked.includes('golden'));
 assert.equal(collectionProgress(c).percentage,100);
 assert.equal(grantAchievements(c).reward,0);
});
test('long-term caught and successful shot totals unlock separate badges',()=>{
 const c=createCollection();
 for(let i=0;i<51;i++)recordCatch(c,0);
 for(let i=0;i<5;i++)recordShot(c,0,540,i===4?4:1);
 const result=grantAchievements(c).unlocked.map(a=>a.id);
 for(const id of ['hooked','veteran','combo','earnings'])assert.ok(result.includes(id),id);
 assert.equal(grantAchievements(c).reward,0);
});
test('rarity, habitats and achievement count are defined',()=>{
 assert.equal(SPECIES.length,14);assert.equal(ACHIEVEMENTS.length,9);
 for(let i=0;i<SPECIES.length;i++){
  assert.ok(['COMMON','UNCOMMON','RARE','LEGENDARY'].includes(fishRarity(i)));
  assert.ok(fishHabitat(i).length>0);
 }
 assert.equal(fishRarity(13),'LEGENDARY');
 assert.equal(fishHabitat(-1),'UNKNOWN');
});
