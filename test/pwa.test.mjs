import assert from 'node:assert/strict';
import test from 'node:test';
import { installGuide,canInstall,isInstalled,requestInstall,setupPwa,serviceWorkerStatus } from '../src/pwa.js';
test('installation guidance is specific to Android, iOS and desktop',()=>{
 assert.match(installGuide('Mozilla Android Chrome').steps.join(' '),/THREE-DOT MENU/);
 assert.match(installGuide('Mozilla iPhone Safari').steps.join(' '),/ADD TO HOME SCREEN/);
 assert.match(installGuide('Mozilla Windows Chrome').steps.join(' '),/CHROME OR EDGE/);
});
test('manual install is never falsely claimed when browser does not offer prompt',async()=>{
 const oldWindow=globalThis.window,oldNav=globalThis.navigator;
 try{
  globalThis.window={matchMedia:()=>({matches:false})};
  globalThis.navigator={standalone:false};
  assert.equal(isInstalled(),false);
  assert.equal(canInstall(),false);
  assert.equal(await requestInstall(),false);
 }finally{
  if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
  if(oldNav===undefined)delete globalThis.navigator;else globalThis.navigator=oldNav;
 }
});
test('worker status API starts with a meaningful value',()=>{
 assert.equal(serviceWorkerStatus(),'checking');
});
