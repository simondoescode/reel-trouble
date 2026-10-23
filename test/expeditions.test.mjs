import assert from 'node:assert/strict';
import test from 'node:test';
import {EXPEDITIONS,createExpedition,normalizeExpedition,recordExpeditionDive,expeditionStatus,completeExpeditions} from '../src/expeditions.js';
test('old saves migrate and progress is copied, not mutated',()=>{
 const raw=createExpedition();assert.deepEqual(normalizeExpedition(null),raw);
 assert.equal(normalizeExpedition({chapter:999}).chapter,EXPEDITIONS.length);
 assert.equal(recordExpeditionDive(raw,188).deepest,188);
 assert.equal(raw.dives,0);
});
test('chapters clear sequentially and rewards only pay once',()=>{
 const raw=createExpedition(),stats={caught:5,discovered:4,deepest:190,line:0,shots:0};
 const r=completeExpeditions(raw,stats);
 assert.equal(r.progress.chapter,3);assert.equal(r.reward,350);
 assert.equal(completeExpeditions(r.progress,stats).reward,0);
 assert.equal(expeditionStatus(r.progress,stats).title,'REEL UPGRADE');assert.equal(raw.chapter,0);
});
test('bounties require catches since the previous claimed bounty',()=>{
 const stats={caught:40,discovered:9,deepest:725,line:3,shots:19};
 const story=completeExpeditions(createExpedition(),stats);
 assert.equal(story.progress.chapter,EXPEDITIONS.length);
 assert.equal(story.progress.bountyStart,40);
 assert.equal(completeExpeditions(story.progress,stats).reward,0);
 const next=completeExpeditions(story.progress,{...stats,caught:52});
 assert.equal(next.reward,300);assert.equal(next.progress.bountyStart,52);
 assert.equal(next.progress.bountyCount,1);
 assert.equal(completeExpeditions(next.progress,{...stats,caught:52}).reward,0);
 assert.equal(expeditionStatus(next.progress,{...stats,caught:58}).progress,6);
});

test('repeat bounties become progressively harder but preserve old counters',()=>{
 const stats={caught:100,discovered:20,deepest:4000,line:12,shots:100};
 const start=completeExpeditions(createExpedition(),stats).progress;
 const first=completeExpeditions(start,{...stats,caught:112});
 assert.equal(first.reward,300);assert.equal(first.progress.bountyCount,1);
 const step=expeditionStatus(first.progress,{...stats,caught:128});
 assert.equal(step.goal,18);assert.equal(step.progress,16);
 const notYet=completeExpeditions(first.progress,{...stats,caught:129});
 assert.equal(notYet.reward,0);
 const next=completeExpeditions(first.progress,{...stats,caught:130});
 assert.equal(next.reward,335);
 assert.equal(next.progress.bountyCount,2);
 assert.equal(expeditionStatus(next.progress,{...stats,caught:150}).goal,24);
});
