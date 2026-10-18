import test from 'node:test';
import assert from 'node:assert/strict';
import {SHOP_SECRETS,shopSecretProgress,unlockedShopSecrets,nextShopSecret} from '../src/shop-secrets.js';

test('shop curiosities are locked until real saved progress earns them',()=>{
 const fresh={upgrades:{line:0,light:0},expedition:{deepest:0,chapter:0}};
 assert.equal(unlockedShopSecrets(fresh).length,0);
 assert.equal(nextShopSecret(fresh,[]),null);
 assert.equal(SHOP_SECRETS.length,4);
 const reef={upgrades:{line:2,light:0},expedition:{deepest:50,chapter:0}};
 assert.equal(nextShopSecret(reef,[]).id,'folded-chart');
 assert.equal(nextShopSecret(reef,['folded-chart']),null);
 const abyss={upgrades:{line:11,light:3},expedition:{deepest:4000,chapter:4}};
 assert.deepEqual(unlockedShopSecrets(abyss).map(s=>s.id),SHOP_SECRETS.map(s=>s.id));
 assert.equal(nextShopSecret(abyss,['folded-chart','whispering-tooth']).id,'sealed-crate');
 assert.equal(nextShopSecret(abyss,SHOP_SECRETS.map(s=>s.id)),null);
});
test('shop secret gates tolerate older saves and missing or invalid counters',()=>{
 assert.deepEqual(shopSecretProgress(),{line:0,light:0,deepest:0,chapter:0});
 assert.deepEqual(shopSecretProgress({upgrades:{line:-3},expedition:{deepest:'700',chapter:NaN}}),
  {line:0,light:0,deepest:700,chapter:0});
 assert.equal(nextShopSecret({upgrades:{line:2}},null).id,'folded-chart');
});
