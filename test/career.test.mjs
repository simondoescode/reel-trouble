import test from 'node:test';
import assert from 'node:assert/strict';
import {CAREER_TIERS,CAREER_MEDALS,normalizeCareer,captainRank,reelPrice,reelProof,
 canUpgradeReel,recordCareer} from '../src/career.js';

test('reel upgrades require previous-line mastery without trapping the beginner',()=>{
 assert.equal(reelProof(0,350),0);
 assert.equal(reelProof(1,541),390);
 assert.equal(canUpgradeReel(1,360,541),false);
 assert.equal(canUpgradeReel(1,400,541),true);
 assert.equal(canUpgradeReel(0,0,350),true);
 assert.ok(reelProof(7,2200)>reelProof(2,800));
});
test('advanced line upgrades cost more while starter remains accessible',()=>{
 assert.equal(reelPrice(0),65);
 assert.ok(reelPrice(1)>99);
 assert.ok(reelPrice(4)>65*Math.pow(1.52,4));
 for(let i=1;i<14;i++)assert.ok(reelPrice(i+1)>reelPrice(i));
});
test('rank requires skill plus catches, not simply buying line upgrades',()=>{
 assert.equal(captainRank(0,0).title,'DOCK ROOKIE');
 assert.equal(captainRank(1300,2).tier,0);
 assert.equal(captainRank(430,14).title,'REEF NAVIGATOR');
 assert.equal(captainRank(2500,100,0).title,'TRENCH CAPTAIN');
 assert.equal(captainRank(2500,100,1).title,'SEA LEGEND');
 assert.equal(captainRank(80,0).remaining.depth,120);
 assert.equal(CAREER_TIERS.length,6);
});
test('career records never diminish and old/invalid saves migrate cleanly',()=>{
 assert.deepEqual(normalizeCareer(null).medals,[]);
 const past=normalizeCareer({deepest:900,bestHaul:5,medals:['ace-four','ace-four','bad']});
 assert.deepEqual(past.medals,['ace-four']);
 const update=recordCareer(past,{deepest:250,landed:1,combo:1,payout:30},{});
 assert.equal(update.career.deepest,900);
 assert.equal(update.career.bestHaul,5);
 assert.ok(update.career.medals.includes('deep-600'));
 assert.equal(recordCareer(update.career,{},{ }).reward,0);
});
test('medals reward first-time mastery only, even with repeated scoring',()=>{
 const one=recordCareer(null,{deepest:1400,landed:5,combo:4,payout:500,clean:true},
   {goldenShot:1,legendWins:1});
 assert.equal(one.unlocked.length,5);
 assert.equal(one.career.bestPayout,500);
 assert.equal(one.career.cleanHauls,1);
 assert.equal(one.reward,CAREER_MEDALS.slice(0,5).reduce((sum,x)=>sum+x.reward,0));
 const second=recordCareer(one.career,{deepest:1400,landed:5,combo:4,payout:500},
   {goldenShot:1,legendWins:1});
 assert.equal(second.reward,0);assert.equal(second.career.medals.length,5);
 assert.equal(recordCareer(second.career,{deepest:2100},{ }).career.medals.length,6);
});
