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
   // Test v0.4 equipment with actual touch shopping and a live sonar press.
   await page.evaluate(()=>{
    const save=JSON.parse(localStorage.getItem('reel-trouble-save-v1'));
    save.cash=6500;localStorage.setItem('reel-trouble-save-v1',JSON.stringify(save));
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('body.game-ready').waitFor({timeout:15000});
   await tap(page,150,675); // Gear Shop
   assert.equal((await snap(page)).state,'shop');
   await tap(page,340,681); // NEW TECH
   assert.equal((await snap(page)).shopView,'tech');
   await page.screenshot({path:`${photos}/outfitter-${v.width}x${v.height}.png`});
   await tap(page,200,375); // Echo Finder
   assert.ok((await snap(page)).equipment.owned.includes('sonar'));
   await tap(page,200,475); // Current Fins
   assert.equal((await snap(page)).equipment.hook,'fins');
   await tap(page,200,570); // Wide Arc
   assert.equal((await snap(page)).equipment.hook,'arc');
   const box=await page.locator('#game').boundingBox(),cx=box.x+box.width/2;
   await page.mouse.move(cx,box.y+box.height*640/780);
   await page.mouse.down();
   await page.mouse.move(cx,box.y+box.height*345/780,{steps:10});
   await page.mouse.up();
   assert.ok((await snap(page)).techScroll>100,'outfitter must scroll');
   await page.screenshot({path:`${photos}/outfitter-scrolled-${v.width}x${v.height}.png`});
   await tap(page,210,130); // Shop counter
   await tap(page,205,735); // Back to results
   assert.equal((await snap(page)).state,'results');
   await tap(page,210,735); // Main menu
   assert.equal((await snap(page)).state,'menu');
   await tap(page,210,585); // Start a real cast
   assert.equal((await snap(page)).state,'descent');
   await tap(page,85,134); // Sonar Ping
   const ping=await snap(page);
   assert.equal(ping.sonarActive,true);
   assert.ok(ping.sonarCooldown>17);
   await tap(page,85,134); // No cooldown reset
   assert.equal((await snap(page)).sonarLast,ping.sonarLast);
   await page.screenshot({path:`${photos}/sonar-active-${v.width}x${v.height}.png`});

   // Deep-scene integration: use the real live game update loop but jump over
   // the long, unrelated dive so every echo and relic is exercised in CI.
   await page.evaluate(()=>{
    const save=JSON.parse(localStorage.getItem('reel-trouble-save-v1'));
    save.upgrades.line=4;save.upgrades.light=2;
    localStorage.setItem('reel-trouble-save-v1',JSON.stringify(save));
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('body.game-ready').waitFor({timeout:15000});
   await tap(page,210,585); // Real CAST LINE button
   assert.equal((await snap(page)).state,'descent');
   await page.evaluate(()=>window.__reelPlaytest.stageDeepScene('relic',0));
   await advance(page,.06);
   assert.equal((await snap(page)).legendRelics,1,'Tide Compass should persist after physical pickup');
   await page.evaluate(()=>window.__reelPlaytest.stageDeepScene('echo',-1));
   await advance(page,.06);
   assert.equal((await snap(page)).legendSeen,true,'entering the warning region reveals the legend');
   for(let gate=0;gate<3;gate++){
    await page.evaluate(gate=>window.__reelPlaytest.stageDeepScene('echo',gate),gate);
    if(gate===2){
     await page.screenshot({path:`${photos}/bellwraith-${v.width}x${v.height}.png`});
    }
    await advance(page,.06);
    assert.equal((await snap(page)).legendSeals,gate+1,'each echo gate must score a signal');
    if(gate===1){
     await page.evaluate(()=>window.__reelPlaytest.stageDeepScene('relic',1));
     await advance(page,.06);
     assert.equal((await snap(page)).legendRelics,2,'Echo Pearl should remain in the saved journal');
    }
   }
   const beaten=await snap(page);
   assert.equal(beaten.legendDefeated,true,'three signals must clear Bellwraith');
   assert.equal(beaten.legendWins,1);
   assert.ok(beaten.roundEarnings>=960,'first legend clear must award its actual payout');
   const legend=await page.evaluate(()=>JSON.parse(localStorage.getItem('reel-trouble-legend-v1')));
   assert.equal(legend.defeated,true);
   assert.deepEqual(legend.relics.sort(),['echo-pearl','tide-compass']);
   const complete=await advance(page,55);
   assert.equal(complete.state,'results');
   await page.screenshot({path:`${photos}/legend-clear-${v.width}x${v.height}.png`});
   console.log('Deep encounter integration:',JSON.stringify({win:complete.legendWins,
    seals:complete.legendSeals,relics:complete.legendRelics,payout:complete.roundEarnings}));

  }
  assert.deepEqual(errors,[],'uncaught browser errors in '+v.width+'x'+v.height);
  await context.close();
 }
 console.log('Mobile canvas touch, progression and daily challenge checks passed.');
}finally{
 await browser?.close();
 vite.kill('SIGTERM');
}
