// Chromium touch-device emulation: genuine canvas hit targets, actual game physics,
// pause/resume, Daily Dive storage and playable results on three Android-sized viewports.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const BASE='http://127.0.0.1:4179/reel-trouble/';
const photos='mobile-playtest-artifacts';
await mkdir(photos,{recursive:true});
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4179','--strictPort'],{
 stdio:['ignore','pipe','pipe'],env:{...process.env}
});
let output='';
for(const stream of [vite.stdout,vite.stderr])stream.on('data',chunk=>{output+=String(chunk).slice(-4000);});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
function metrics(snap,viewport){console.log(JSON.stringify({viewport,phase:snap.state,depthMetres:Math.round(snap.depth/3),
 deepestMetres:Math.round(snap.deepestCast/3),fish:snap.caught,earnings:snap.roundEarnings,
 seed:snap.castSeed,dailyAttempts:snap.dayAttempts}));}
async function tap(page,x,y){
 const rect=await page.locator('#game').boundingBox();
 assert.ok(rect?.width>0&&rect?.height>0,'canvas missing its touch target');
 await page.touchscreen.tap(rect.x+x/420*rect.width,rect.y+y/780*rect.height);
}
async function snap(page){return page.evaluate(()=>window.__reelPlaytest.snapshot());}
async function advance(page,seconds){return page.evaluate(seconds=>window.__reelPlaytest.advance(seconds),seconds);}
async function awaitServer(){
 for(let retry=0;retry<60;retry++){
  try{const result=await fetch(BASE);if(result.ok)return;}catch{}
  await sleep(250);
 }
 throw Error('Vite did not start: '+output);
}
try{
 await awaitServer();
 browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 for(const v of [{width:360,height:780},{width:393,height:852},{width:412,height:915}]){
  const context=await browser.newContext({
   viewport:v,deviceScaleFactor:2,isMobile:true,hasTouch:true,
   reducedMotion:'reduce'
  });
  await context.addInitScript(()=>{
   localStorage.setItem('reel-trouble-input-v1','touch');
   localStorage.setItem('reel-trouble-mobile-settings-v1',JSON.stringify({
    sound:false,music:false,rumble:false,lowFx:true
   }));
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.locator('body.game-ready').waitFor({timeout:15000});
  assert.ok(await page.evaluate(()=>Boolean(window.__reelPlaytest)),'dev-only testing bridge did not load');
  const bounds=await page.locator('#game').boundingBox();
  assert.ok(Math.abs(bounds.width-v.width)<=2,'canvas must fill phone width');
  assert.ok(Math.abs(bounds.height-v.height)<=2,'canvas must fill phone height');
  assert.equal((await snap(page)).state,'menu','game should start at menu after touch preference');
  await page.screenshot({path:`${photos}/menu-${v.width}x${v.height}.png`});
  // All routes are tapped on the real canvas, not invoked directly.
  await tap(page,315,675); // MORE
  assert.equal((await snap(page)).state,'more','More should respond to touch');
  await tap(page,210,568); // DAILY DIVE
  const start=await snap(page);
  assert.equal(start.state,'descent','Daily Dive should start immediately');
  assert.ok(start.dailyRun&&start.castSeed>0);
  const moved=await advance(page,2);
  assert.equal(moved.state,'descent');
  assert.ok(moved.depth>100,'descent should move without waiting on overlay');
  await tap(page,100,510);
  const steer=await advance(page,.6);
  assert.ok(steer.hookX<moved.hookX-25,'touch steering must move the hook left');
  // Pause and resume by tapping the on-canvas buttons.
  await tap(page,381,135);
  const paused=await snap(page);
  assert.equal(paused.paused,true,'pause button should respond');
  const still=await advance(page,3);
  assert.equal(still.depth,paused.depth,'a paused hook must stay at the same depth');
  await tap(page,210,470);
  assert.equal((await snap(page)).paused,false,'resume should respond');
  const ongoing=await advance(page,2);
  assert.ok(ongoing.depth>paused.depth,'resuming must advance the hook');
  const result=await advance(page,45);
  metrics(result,`${v.width}x${v.height}`);
  assert.equal(result.state,'results','a complete daily round should reach results');
  assert.ok(result.deepestCast>=540,'new players should reach the protected 180m opening');
  assert.equal(result.dayAttempts,1,'first Daily Dive increments attempt count once');
  const daily=await page.evaluate(()=>JSON.parse(localStorage.getItem('reel-trouble-daily-v1')));
  assert.equal(daily.dives,1);
  assert.ok(daily.best>=0);
  await page.screenshot({path:`${photos}/results-${v.width}x${v.height}.png`});
  if(v.width===393){
   // Retrying on the same UTC day must retain the same world seed and best score.
   await tap(page,210,600);
   const retry=await snap(page);
   assert.equal(retry.state,'descent');
   assert.equal(retry.castSeed,start.castSeed);
   const second=await advance(page,50);
   assert.equal(second.state,'results');
   assert.equal(second.dayAttempts,2);
   assert.ok(second.dailyBest>=daily.best);
   await page.screenshot({path:`${photos}/daily-retry-${v.width}x${v.height}.png`});
  }
  assert.deepEqual(errors,[],'uncaught browser errors in '+v.width+'x'+v.height);
  await context.close();
 }
 console.log('Mobile canvas touch, progression and daily challenge checks passed.');
}finally{
 await browser?.close();
 vite.kill('SIGTERM');
}
