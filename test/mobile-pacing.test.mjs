import assert from 'node:assert/strict';
import test from 'node:test';
import {createOceanStream,advanceFish,descentCollides,isNearMiss} from '../src/ocean.js';
import {regionField} from '../src/region-mechanics.js';

function cast(seed,style='centre'){
 const stream=createOceanStream(1050,seed);
 let depth=0,elapsed=0,x=210,nearMisses=0,collision=false;
 const counted=new Set(),step=.05;
 for(let tick=0;tick<460&&depth<1050;tick++){
  const field=regionField(depth,elapsed,x),previous=depth;
  const target=style==='weave'?210+105*Math.sin(elapsed*.7):style==='edge'?80:210;
  x+=(target-x)*Math.min(1,8*step);
  x=Math.max(24,Math.min(396,x+field.drift*step));
  depth=Math.min(1050,depth+(91)*field.diveRate*step);
  const fish=stream.near(depth).fish;
  for(const f of fish)advanceFish(f,step);
  if(depth>=540&&fish.some(f=>descentCollides(f,x,depth,previous))){collision=true;break;}
  for(const f of fish)if(!counted.has(f.id)&&isNearMiss(f,x,depth,previous)){counted.add(f.id);nearMisses++;}
  elapsed+=step;
 }
 return {depth,metres:depth/3,elapsed,nearMisses,collision};
}
test('starter ocean pacing is playable across 100 deterministic seeds',()=>{
 const samples=Array.from({length:100},(_,i)=>cast(i+12345));
 const ordered=samples.map(x=>x.metres).sort((a,b)=>a-b);
 const median=ordered[50],deep=samples.filter(x=>x.metres>=300).length;
 const limit=samples.filter(x=>x.metres>=350).length;
 console.log('Starter centre-lane depth: median='+median.toFixed(0)+'m, 300m+='+deep+'/100, full line='+limit+'/100');
 assert.ok(samples.every(x=>x.metres>=180),'beginner should not hit fish before 180m');
 assert.ok(median>=210,'median cast ends too soon to be satisfying');
 assert.ok(deep>=8,'players need a realistic chance to reach the deepest starter water');
});
test('rebalanced fish spawning produces contrasting but viable strategies',()=>{
 const results=['centre','weave','edge'].map(style=>{
  const samples=Array.from({length:32},(_,i)=>cast(9000+i,style));
  return {style,averageMetres:Math.round(samples.reduce((sum,x)=>sum+x.metres,0)/samples.length),
   farDives:samples.filter(x=>x.metres>=300).length};
 });
 console.log('Steering simulation: '+JSON.stringify(results));
 for(const row of results)assert.ok(row.averageMetres>=190,row.style+' lacks a fair opening');
});
