import assert from 'node:assert/strict';
import test from 'node:test';
import {TECH_ITEMS,normalizeEquipment,hasTech,techEffects,buyTech,
 activateSonar,sonarSecondsRemaining,SONAR_COOLDOWN,SONAR_DURATION} from '../src/tech-equipment.js';

test('six distinct items with hook choices and passive boat fittings',()=>{
 assert.equal(TECH_ITEMS.length,6);
 assert.equal(new Set(TECH_ITEMS.map(g=>g.id)).size,6);
 assert.equal(TECH_ITEMS.filter(g=>g.slot==='hook').length,3);
 assert.equal(TECH_ITEMS.filter(g=>g.slot==='boat').length,2);
 assert.ok(TECH_ITEMS.every(g=>g.price>0));
});
test('old and malformed saves normalize to no equipment without touching other progress',()=>{
 assert.deepEqual(normalizeEquipment(null),{owned:[],hook:'standard'});
 assert.deepEqual(normalizeEquipment({owned:['sonar','sonar','bad','fins'],hook:'ghost'}),{owned:['sonar','fins'],hook:'standard'});
 const save={cash:800,best:456,collection:{fish:[]}};
 assert.equal(buyTech(save,'sonar'),'purchased');
 assert.equal(save.cash,380);
 assert.deepEqual(save.collection,{fish:[]});
 assert.equal(save.best,456);
});
test('buying hook choices equips one at a time and never charges again to swap',()=>{
 const save={cash:5000,equipment:null};
 assert.equal(buyTech(save,'fins'),'purchased');
 assert.equal(save.equipment.hook,'fins');
 assert.equal(techEffects(save.equipment).steer,1.3);
 assert.equal(buyTech(save,'arc'),'purchased');
 assert.equal(save.equipment.hook,'arc');
 assert.equal(techEffects(save.equipment).catch,20);
 assert.equal(buyTech(save,'ghost'),'purchased');
 assert.equal(techEffects(save.equipment).guard,true);
 const coins=save.cash;
 assert.equal(buyTech(save,'fins'),'equipped');assert.equal(save.cash,coins);
 assert.equal(buyTech(save,'standard'),'equipped');
 assert.equal(save.equipment.hook,'standard');
 assert.equal(save.cash,coins);
 assert.equal(techEffects(save.equipment).guard,false);
});
test('boat modules stack and are paid for exactly once',()=>{
 const save={cash:3000};
 assert.equal(buyTech(save,'stabilizer'),'purchased');
 assert.equal(buyTech(save,'winch'),'purchased');
 assert.equal(buyTech(save,'winch'),'owned');
 const e=techEffects(save.equipment);
 assert.equal(e.current,.4);
 assert.equal(e.jellySlow,.5);
 assert.equal(e.reel,1.22);
 assert.equal(save.cash,770);
});
test('insufficient funds and invalid purchases leave inventory and cash alone',()=>{
 const save={cash:100};
 assert.equal(buyTech(save,'arc'),'funds');
 assert.equal(buyTech(save,'fake'),'invalid');
 assert.equal(save.cash,100);
 assert.equal(save.equipment,undefined);
});
test('sonar fires only on player action, on cooldown, in fishing phases',()=>{
 const gear={owned:['sonar']};
 assert.equal(activateSonar({},12,-Infinity,'descent'),null);
 const first=activateSonar(gear,12,-Infinity,'descent');
 assert.deepEqual(first,{lastUse:12,until:12+SONAR_DURATION});
 assert.equal(activateSonar(gear,14,12,'ascent'),null);
 assert.equal(activateSonar(gear,30,12,'shoot'),null);
 assert.equal(activateSonar(gear,12+SONAR_COOLDOWN,12,'ascent').lastUse,30);
 assert.equal(sonarSecondsRemaining(gear,19,12),11);
 assert.equal(sonarSecondsRemaining({},19,12),null);
});
