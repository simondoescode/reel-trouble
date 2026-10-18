import { tiltAxis, tiltVelocity } from './tilt.js';
import { paintShopBackdrop, paintSkipper, paintShopItem } from './shop-art.js';
import { SHOP_SECRETS, unlockedShopSecrets, nextShopSecret } from './shop-secrets.js';
import { createArcadeAudio } from './audio.js';
import { createExpedition, normalizeExpedition, recordExpeditionDive, expeditionStatus, completeExpeditions, EXPEDITIONS } from './expeditions.js';
import { createRumble } from './haptics.js';
import { SPECIES as species, BIOMES, biomeAtDepth, oceanPalette, spawnOcean, advanceFish, advanceHazard, overlapsHazard } from './ocean.js';
import { createOceanStream, oceanVisibility } from './ocean.js';
import { drawSeaScape } from './seascape.js';
import { isDeepCreature, drawDeepCreature } from './deep-creatures.js';
import { createDiscoveryStream, drawDiscovery } from './discoveries.js';
import { createCollection, normalizeCollection, recordCatch, recordShot, grantAchievements, collectionProgress, fishRarity, fishHabitat, ACHIEVEMENTS } from './collection.js';
import { setupPwa, canInstall, isInstalled, requestInstall, installGuide, serviceWorkerStatus, refreshGameFiles } from './pwa.js';
import { weaponForLevel, pickShotTargets, nextCombo, shotPayout } from './shooting.js';
import { SHOOT_WATERLINE, SHOOT_GUN_SCALE, shootGunPose, visibleShotTrailStart, makeAirborneCatch, stepAirborneCatch, targetSkyCamera, stepSkyCamera, skyScreenY, allCatchResolved } from './airborne.js';
import { ARCADE_STAGES, STAGE_DURATION, easeOutCubic, stageFrame, startStage } from './arcade-ui.js';
(() => {
'use strict';
const W=420,H=780,SEA=192, MAXLVL=5, LINE_MAXLVL=14, LIGHT_MAXLVL=5;
const canvas=document.getElementById('game'), display=canvas.getContext('2d',{alpha:false});
// Render glyphs at their real logical size: the old 210x390 buffer rasterised
// 12-16px labels at only 6-8 physical pixels before blowing them back up.
const sceneCanvas=document.createElement('canvas');
sceneCanvas.width=W;sceneCanvas.height=H;
const ctx=sceneCanvas.getContext('2d',{alpha:false});
const shade=document.createElement('canvas');shade.width=W;shade.height=H;const shadeCtx=shade.getContext('2d');
const titleLogo=new Image();
titleLogo.decoding='async';
titleLogo.src='./assets/title-logo.webp';
ctx.imageSmoothingEnabled=false; // Original blocky fish sprites remain pixel art.
display.imageSmoothingEnabled=true; // Smooth final presentation, not font rasterisation.
// Saturated colours remain in the art and outlines. UI labels are solid white.
const C={navy:'#081a32',deep:'#094567',ocean:'#19aed1',teal:'#27f4dd',mint:'#d6fff4',cream:'#ffffff',white:'#ffffff',yellow:'#ffed76',coral:'#ff667f',pink:'#ff9be7',muted:'#ffffff',ink:'#071b31'};

const initial={cash:0,total:0,best:0,upgrades:{line:0,net:0,gun:0,light:0},charges:0,collection:createCollection(),expedition:createExpedition()};
function loadSave(){try{const d=JSON.parse(localStorage.getItem('reel-trouble-save-v1')||localStorage.getItem('deep-end-save-v1'));if(!d||!d.upgrades)return structuredClone(initial);
return {cash:Math.max(0,Number(d.cash)||0),total:Math.max(0,Number(d.total)||0),best:Math.max(0,Number(d.best)||0),charges:clamp(Number(d.charges)||0,0,3),upgrades:{line:clamp(Number(d.upgrades.line)||0,0,LINE_MAXLVL),net:clamp(Number(d.upgrades.net)||0,0,MAXLVL),gun:clamp(Number(d.upgrades.gun)||0,0,MAXLVL),light:clamp(Number(d.upgrades.light)||0,0,LIGHT_MAXLVL)},collection:normalizeCollection(d.collection),expedition:normalizeExpedition(d.expedition)};
}catch(_){return structuredClone(initial);}}
// Ask touch-screen players which steering method to use on first launch.
const mobileInput = window.matchMedia?.('(pointer: coarse)').matches ?? false;
setupPwa();
const reducedMotionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
function readPreferences(){
 try{
  const saved=JSON.parse(localStorage.getItem('reel-trouble-mobile-settings-v1') || '{}');
  return {sound:saved.sound!==false,music:saved.music!==false,rumble:typeof saved.rumble==='boolean'?saved.rumble:!reducedMotionPreference,lowFx:typeof saved.lowFx==='boolean'?saved.lowFx:reducedMotionPreference};
 }catch(_){return {sound:true,music:true,rumble:!reducedMotionPreference,lowFx:reducedMotionPreference};}
}
const preferences=readPreferences();
let soundEnabled=preferences.sound, musicEnabled=preferences.music, lowFx=preferences.lowFx, rumbleEnabled=preferences.rumble;
const sound=createArcadeAudio();
const rumble=createRumble({suppressed:()=>document.hidden||paused});
rumble.setEnabled(rumbleEnabled);
sound.setOptions({sound:soundEnabled,music:musicEnabled});
let installMessage='INSTALL AS AN APP FOR OFFLINE PLAY';
function savePreferences(){try{localStorage.setItem('reel-trouble-mobile-settings-v1',JSON.stringify({sound:soundEnabled,music:musicEnabled,rumble:rumbleEnabled,lowFx}));}catch(_){}}
function toggleSound(){soundEnabled=!soundEnabled;savePreferences();sound.setOptions({sound:soundEnabled,music:musicEnabled});sound.unlock();}
function toggleMusic(){musicEnabled=!musicEnabled;savePreferences();sound.setOptions({sound:soundEnabled,music:musicEnabled});sound.unlock();}
function toggleEffects(){lowFx=!lowFx;savePreferences();shake=0;if(lowFx)sceneTransition=null;}
function toggleRumble(){
 if(!rumble.supported())return;
 rumbleEnabled=!rumbleEnabled;
 rumble.setEnabled(rumbleEnabled);
 savePreferences();
 if(rumbleEnabled)rumble.play('preview');
}
function installGame(){
 if(isInstalled()){installMessage='ALREADY INSTALLED';return;}
 if(canInstall()){
  installMessage='OPENING INSTALL PROMPT';
  requestInstall().then(ok=>{installMessage=ok?'INSTALL REQUESTED':'SEE INSTALL HELP';if(!ok){state='install';age=0;}});
 }else{
  // A browser cannot force an install prompt when none was provided.
  state='install';age=0;installMessage='OPEN IN CHROME OR SAFARI';
 }
}
async function copyGameLink(){
 try{
  const url=new URL('./',document.baseURI).href;
  await navigator.clipboard.writeText(url);
  installMessage='GAME LINK COPIED';
 }catch(_){installMessage='COPY URL FROM YOUR ADDRESS BAR';}
}

const rotateNotice=document.getElementById('rotate-notice');
document.getElementById('play-landscape')?.addEventListener('click',()=>{
 document.body.classList.add('landscape-dismissed');
 rotateNotice?.setAttribute('aria-hidden','true');
});
window.matchMedia?.('(orientation: portrait)')?.addEventListener?.('change',()=>{
 document.body.classList.remove('landscape-dismissed');
 rotateNotice?.removeAttribute('aria-hidden');
});
function loadInputChoice(){try{const value=localStorage.getItem('reel-trouble-input-v1');return value==='touch'||value==='tilt'?value:null;}catch(_){return null;}}
let inputChoice=loadInputChoice();
const permissionPrompt=typeof window.DeviceOrientationEvent?.requestPermission==='function';
let inputMode=inputChoice==='tilt'&&!permissionPrompt?'tilt':'touch';
let sensorStatus=inputChoice==='tilt'?'ENABLE TILT TO STEER':'CHOOSE HOW TO STEER';
let tiltValue=0, tiltNeutral=null, tiltUpdatedAt=-1e6, tiltStartedAt=-1e6, lastRotation=null, requestSerial=0;
function persistInput(){try{localStorage.setItem('reel-trouble-input-v1',inputChoice);}catch(_){}}
function sensorFresh(){return inputMode==='tilt'&&clock-tiltUpdatedAt<1.4;}
function useTouch(){requestSerial++;inputMode='touch';inputChoice='touch';sensorStatus='TOUCH STEERING SELECTED';persistInput();}
function activateTilt(){
  inputMode='tilt';inputChoice='tilt';persistInput();
  tiltNeutral=null;tiltUpdatedAt=-1e6;tiltStartedAt=clock;
  sensorStatus='WAITING FOR MOTION SENSOR';
}
function enableTilt(){
  const serial=++requestSerial;
  if(!window.isSecureContext || typeof window.DeviceOrientationEvent==='undefined'){
    sensorStatus='TILT NEEDS HTTPS + A SENSOR';return;
  }
  const permission=window.DeviceOrientationEvent.requestPermission;
  if(typeof permission==='function'){
    sensorStatus='REQUESTING MOTION PERMISSION';
    // Calling this synchronously within pointerdown preserves iOS's user gesture.
    try{Promise.resolve(permission.call(window.DeviceOrientationEvent)).then(result=>{
      if(serial!==requestSerial)return;
      if(result==='granted')activateTilt();
      else sensorStatus='MOTION PERMISSION DENIED - USE TOUCH';
    }).catch(()=>{if(serial===requestSerial)sensorStatus='PERMISSION FAILED - USE TOUCH';});}
    catch(_){sensorStatus='PERMISSION FAILED - USE TOUCH';}
  }else activateTilt();
}
function recenterTilt(){
  if(inputMode!=='tilt')return;
  if(sensorFresh()){tiltNeutral=tiltValue;targetX=W/2;sensorStatus='TILT RECENTERED';}
  else sensorStatus='MOVE PHONE TO CONNECT SENSOR';
}
window.addEventListener('deviceorientation', event=>{
  if(inputMode!=='tilt')return;
  const rotation=Number(window.screen?.orientation?.angle ?? window.orientation ?? 0);
  const value=tiltAxis(event.beta,event.gamma,rotation);
  if(value===null)return;
  if(lastRotation!==rotation){tiltNeutral=null;lastRotation=rotation;}
  tiltValue=value;tiltUpdatedAt=clock;
  if(tiltNeutral===null)tiltNeutral=value;
  if(sensorStatus==='WAITING FOR MOTION SENSOR'||sensorStatus==='NO SENSOR DATA - DRAG TO STEER'||sensorStatus==='ENABLE TILT TO STEER')sensorStatus='TILT READY';
});
let combo=0, bestRoundCombo=0, lastComboHit=-Infinity, landed=0, escaped=0, shotEffects=[], recoil=0, muzzleFlash=0;
let shootCameraOffset=SHOOT_WATERLINE-192;
const airScreenY=worldY=>skyScreenY(worldY,shootCameraOffset);
let finisherSlow=0, hitFreeze=0, impactRings=[], impactGhosts=[], coinBursts=[], payoutPulse=0;
let paused=false,pauseReason='';
function liveRound(){return state==='descent'||state==='ascent'||state==='shoot';}
function pauseGame(reason='MANUAL'){
 if(!liveRound()||paused)return;
 paused=true;pauseReason=reason;pointerDown=false;keys.clear();sound.pause(true);rumble.stop();
}
function resumeGame(){paused=false;pauseReason='';last=0;pointerDown=false;sound.pause(false);sound.unlock();}
function menuFromPause(){paused=false;pauseReason='';state='menu';age=0;last=0;sceneTransition=null;sound.pause(false);rumble.stop();}
let shopTab='lines',shopView='counter',chargeArmed=false;
let shopScroll={lines:0,nets:0,guns:0,gadgets:0},shopDrag=null;
let splashes=[],ripples=[],sceneFlash=0,collectionTab='fish',collectionPage=0,selectedFish=0;
let sceneTransition=null;
let newFishThisCast=0,newBadgesThisCast=0,bonusThisCast=0,missionRewardThisCast=0,missionsCompletedThisCast=0;
let deepestCast=0,discoveriesThisCast=0,lastBiomeId='sunskip',cameraY=0,zoneNotice=null;
let save=loadSave(), state=mobileInput&&(inputChoice===null||(inputChoice==='tilt'&&permissionPrompt))?'settings':'menu', age=0, clock=0, depth=0, maxDepth=720, hookX=W/2,targetX=W/2, fishes=[], hazards=[], hazardSlow=0, caught=[], airborne=[], particles=[], labels=[], hits=[], roundEarnings=0, fired=0, shootTime=0, castNumber=0, message='', messageTimer=0, pointerDown=false, pointer={x:W/2,y:H/2}, keys=new Set(), waveT=0, shake=0;
function persist(){try{localStorage.setItem('reel-trouble-save-v1',JSON.stringify(save));}catch(_){}}
function expeditionStats(){
 const p=collectionProgress(save.collection);
 return {caught:p.caught,discovered:p.discovered,shots:p.shot,deepest:save.expedition.deepest,
  line:save.upgrades.line,earned:save.total};
}
function currentJob(){return expeditionStatus(save.expedition,expeditionStats());}
function settleExpedition(){
 save.expedition=recordExpeditionDive(save.expedition,deepestCast/DEPTH_PIXELS_PER_METRE);
 const result=completeExpeditions(save.expedition,expeditionStats());
 save.expedition=result.progress;
 missionRewardThisCast=result.reward;missionsCompletedThisCast=result.completed.length;
 if(result.reward){
  save.cash+=result.reward;save.total+=result.reward;roundEarnings+=result.reward;
  sound.play('upgrade');rumble.play('upgrade');sceneFlash=.3;
 }
}
function awardBonus(value){
 if(!value)return;
 save.cash+=value;save.total+=value;roundEarnings+=value;bonusThisCast+=value;
}
function updateAchievements(){
 const granted=grantAchievements(save.collection);
 if(!granted.unlocked.length)return;
 awardBonus(granted.reward);newBadgesThisCast+=granted.unlocked.length;
 floatLabel(granted.unlocked.length===1?granted.unlocked[0].title:'BADGES +'+granted.unlocked.length,210,207,C.yellow);
 sound.play('upgrade');
}
function openCollection(tab='fish'){collectionTab=tab;collectionPage=0;sceneTransition=null;state='collection';age=0;}
let expeditionReturn='more';
function openExpeditions(){expeditionReturn=state;sceneTransition=null;state='expeditions';age=0;}
function stageCue(_kind){sceneTransition=null;} // Go straight into each phase: no full-screen interruptions.
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
const rand=(a,b)=>a+Math.random()*(b-a);
const irand=(a,b)=>Math.floor(rand(a,b+1));
// Rounded modern arcade chrome, always drawn at full-resolution for sharp text.
function roundRect(x,y,w,h,r=0,fill,stroke,lw=2){
 x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);
 const radius=Math.max(0,Math.min(r,w/2,h/2));
 ctx.beginPath();
 ctx.moveTo(x+radius,y);ctx.lineTo(x+w-radius,y);
 ctx.quadraticCurveTo(x+w,y,x+w,y+radius);
 ctx.lineTo(x+w,y+h-radius);ctx.quadraticCurveTo(x+w,y+h,x+w-radius,y+h);
 ctx.lineTo(x+radius,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-radius);
 ctx.lineTo(x,y+radius);ctx.quadraticCurveTo(x,y,x+radius,y);
 ctx.closePath();
 if(fill){ctx.fillStyle=fill;ctx.fill();}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}
}
function text(s,x,y,size=20,color=C.white,align='center',_weight=900,_letter=0,maxWidth=null){
 const label=String(s);
 ctx.save();ctx.textAlign=align;ctx.textBaseline='middle';
 const available=maxWidth??(align==='left'?W-x-16:align==='right'?x-16:Math.min(W-32,2*x-16,2*(W-x)-16));
 const width=Math.max(20,available);
 let fontSize=Math.max(10,size);
 const setFont=()=>{ctx.font='400 '+fontSize+'px "Press Start 2P",monospace';};setFont();
 const measured=ctx.measureText(label).width;
 if(measured>width){
  fontSize=Math.max(13,Math.floor(fontSize*width/measured));setFont();
  while(fontSize>13&&ctx.measureText(label).width>width){fontSize--;setFont();}
 }
 let fitted=label;
 if(ctx.measureText(fitted).width>width){
  while(fitted.length>1&&ctx.measureText(fitted+'…').width>width)fitted=fitted.slice(0,-1);
  fitted=fitted.trimEnd()+'…';
 }
 ctx.lineJoin='round';ctx.strokeStyle='#031523';
 ctx.lineWidth=fontSize>=32?3:fontSize>=17?2:1.2;
 ctx.strokeText(fitted,x,y);
 ctx.fillStyle=color||C.white;ctx.fillText(fitted,x,y);
 ctx.restore();
}
// Readable narrative lettering, while Press Start 2P owns headings and controls.
function storyCopy(message,x,y,maxWidth=320,size=16,ink='#f8eed2',lineHeight=23,maxLines=3){
 ctx.save();ctx.font='700 '+size+'px Verdana,Geneva,sans-serif';
 ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';
 const lines=[''];
 for(const word of String(message).split(/\s+/)){
  const i=lines.length-1,next=(lines[i]+' '+word).trim();
  if(ctx.measureText(next).width>maxWidth&&lines[i]){
   if(lines.length===maxLines){lines[i]+=' '+word;break;}
   lines.push(word);
  }else lines[i]=next;
 }
 const last=lines.length-1;
 while(lines[last].length>1&&ctx.measureText(lines[last]).width>maxWidth)
  lines[last]=lines[last].slice(0,-2).trimEnd()+'…';
 for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],x,y+i*lineHeight);
 ctx.restore();
}
function line(x1,y1,x2,y2,color,width=2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function polygon(points,fill){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
// Crisp stepped-corner buttons and panels shared by the entire arcade.
function pixelPlate(x,y,w,h,fill='#102b43',edge='#72dace',cut=8,shadow=true){
 const c=Math.max(0,Math.min(cut,w/5,h/4));
 const shape=(yy)=>{ctx.beginPath();ctx.moveTo(x+c,yy);ctx.lineTo(x+w-c,yy);
  ctx.lineTo(x+w,yy+c);ctx.lineTo(x+w,yy+h-c);
  ctx.lineTo(x+w-c,yy+h);ctx.lineTo(x+c,yy+h);
  ctx.lineTo(x,yy+h-c);ctx.lineTo(x,yy+c);ctx.closePath();};
 ctx.save();
 if(shadow){ctx.translate(0,4);shape(y);ctx.fillStyle='#031221a8';ctx.fill();ctx.translate(0,-4);}
 shape(y);ctx.fillStyle=fill;ctx.fill();
 if(edge){ctx.strokeStyle=edge;ctx.lineWidth=2;ctx.stroke();}
 ctx.fillStyle='#ffffff20';ctx.fillRect(x+c+5,y+4,Math.max(0,w-2*c-10),2);
 ctx.restore();
}
function button(title,x,y,w,h,action,accent=C.coral,secondary=''){
 const primary=accent===C.yellow;
 const base=primary?'#ffd45c':'#0e3048';
 const edge=primary?'#fff0aa':accent===C.cream?'#c2d9e3':accent;
 pixelPlate(x,y,w,h,base,edge,Math.min(9,Math.round(h/7)));
 if(!primary){ctx.fillStyle=accent===C.cream?'#b5d1dc':accent;ctx.fillRect(x+8,y+12,4,Math.max(0,h-24));}
 else{ctx.fillStyle='#c88524';ctx.fillRect(x+13,y+h-7,w-26,3);}
 const labelY=y+h/2-(secondary?10:0);
 text(title,x+w/2,labelY,secondary?21:(h<41?14:h>=60?20:17),primary?'#152637':C.white,'center',900,0,w-32);
 if(secondary)text(secondary,x+w/2,y+h/2+16,12,primary?'#263548':'#e2f3f8','center',800,0,w-32);
 hits.push({x,y,w,h,action});
}
function neonPanel(x,y,w,h,accent=C.teal,radius=17){
 pixelPlate(x,y,w,h,'#09253bea','#3a9ea8',Math.min(10,radius));
}
function panel(x,y,w,h){neonPanel(x,y,w,h);}
function arcadePill(label,x,y,w,accent=C.teal){
 pixelPlate(x,y,w,32,'#123a51',accent,5,false);
 text(label,x+w/2,y+16,13,C.white,'center',900,0,w-20);
}
function arcadeRule(x1,y,x2,accent=C.teal){
 ctx.fillStyle='#bdd5d852';ctx.fillRect(x1,y,x2-x1,2);
 ctx.fillStyle=accent;ctx.fillRect(x1,y,Math.min(48,x2-x1),2);
}
function ambient(t,submerged=true){
 const bands=submerged?
 ['#218eab','#1d83ab','#1c76a1','#186b98','#185e8c','#174f7d','#123f6d','#092c52']:
 ['#3c70a4','#377caf','#3186ac','#267b9e','#20688c','#195779','#124369','#0b3155'];
 for(let i=0;i<bands.length;i++){ctx.fillStyle=bands[i];ctx.fillRect(0,i*98,W,99);}
 // Distant pixel skyline and glowing sea grass anchor the menu and shop.
 for(let layer=0;layer<3;layer++){
  ctx.fillStyle=['#1b9cb7','#147991','#115774'][layer];
  const baseline=646+layer*48;
  for(let x=0;x<W;x+=24){const top=baseline-((x*11+layer*53)%74);ctx.fillRect(x,top,24,H-top);}
 }
 for(let i=0;i<31;i++){
  const x=Math.floor(((i*157+34)%W)/4)*4;
  const y=Math.floor(((i*101+t*(9+i%3*5))%(H+18))/4)*4;
  ctx.fillStyle=i%5===0?'#fff4a8c0':i%3===0?'#42fae08c':'#9feefa8c';
  ctx.fillRect(x,y,i%5?4:6,i%5?4:6);
  if(i%5===0){ctx.fillRect(x-4,y+2,3,2);ctx.fillRect(x+7,y+2,3,2);}
 }
 // Original blocky reef highlights (not external assets).
 for(let i=0;i<6;i++){
  const x=i*77+8,y=H-44-(i%3)*12;
  ctx.fillStyle=i%2?'#ff638899':'#26c9baaa';
  ctx.fillRect(x,y,8,H-y);ctx.fillRect(x-8,y+13,24,6);
  ctx.fillRect(x+(i%2?9:-9),y-10,7,23);
 }
}
// An original hand-authored 20-column pixel sprite with six colour palettes.
const FISH_SPRITE=[
 '        66666       ',
 '       661666      ',
 '       111111111    ',
 '  66  122333333211 ',
 ' 6666 1234444333211',
 '1666661233333333511',
 '1666661233333333511',
 ' 6666 1233333333211',
 '  66  122222222211 ',
 '       11111666     ',
 '         6666       '
];
const fishPalette=[
 ['#833f38','#e68a36','#ffbd43','#fff3a2'], // Guppy
 ['#104f82','#178ebd','#24dbea','#b3ffff'], // Mackerel
 ['#7b345e','#d8406d','#ff6473','#ffc0ae'], // Snapper
 ['#482b7b','#8552c8','#b18bff','#f3d1ff'], // Moonfish
 ['#4e6b2f','#88bf42','#d1f76a','#fdffa4'], // Sunfish
 ['#176b82','#48bec3','#a9fff0','#ffffff'], // Phantom
 ['#8b3a3d','#e67533','#ffad45','#fff9dc'], // Clownfish
 ['#786332','#d6b646','#fff279','#fffed2'], // Pufferfish
 ['#165677','#2994a8','#88f6e6','#dcfffb'], // Sardine
 ['#75344e','#e36267','#ff9975','#ffe2a8'], // Lionfish
 ['#1c4d74','#258ba6','#58e6ea','#c7ffff'], // Tuna
 ['#184c5e','#258978','#7dffca','#e4ffcf'], // Lanternfish
 ['#422458','#7855a8','#c69cff','#e6d6ff'], // Anglerfish
 ['#a05e19','#e8a731','#ffe35b','#ffffff']  // Legendary Golden Fish
];

// Individually drawn big-fish silhouettes, rather than stretching the tiny fish sprite.
// 0 is transparent; 1 outline, 2 shadow, 3 body, 4 highlight, 5 eye, 6 accent.
const GIANT_SPRITES={
 14:['            1     1             ','           1331  131            ','  11     13333311331           ',' 1331111133333333333111111111  ','13333333333333333333333333531 ',' 1333333333333333333333311111  ','  111113333333333311111       ','        1111111111             '],
 15:['    1                   1        ','   1331                 131      ','  133331111111111111111331111111',' 133333333333333333333333335311','  13333333333333333333333111111','   133111113333333331111        ','    1      11111111            '],
 16:['        1111111                 ','      11333333311               ',' 111113333344433331111111      ','13333333333333333333333333511  ','133333333333333333333333333311 ',' 111113333333333333333331111   ','      11111111111111111        '],
 17:['     111111        111111       ','   113333331      133333311     ','  1333333331111113333333331    ',' 13333333333333333333333333511 ','  1333333333333333333333333311 ','   113333333311113333333311    ','     1111111      1111111      '],
 18:['               111              ','       111111133311            ','   111133333333333331111       ','11133333334333333333333335111  ','133333333333333333333333333311 ','1113333333333333333333333111   ','   111133333333333331111       ','       11111111111             '],
 19:['       1111111111111            ','     11333333333333311          ','    1333344333333344331         ','   133333333333333333331        ','    111133311133311111         ','       131   131   131         ','       131   131   131         ','       131   131   131         ','       131   131   131         ','       111   111   111         ']
};
const GIANT_PALETTES={
 14:['#122c45','#4c7c9c','#91b7d1','#d8ecf6','#0b1b2a','#e8f6ff'],
 15:['#102c4c','#2a719e','#64bde8','#c9efff','#061b30','#9deaff'],
 16:['#513221','#a56b45','#e5a66a','#ffdfaa','#1b1720','#ffd48a'],
 17:['#203344','#667f94','#a7bbc9','#e7f3fa','#0b1a24','#f5fcff'],
 18:['#153c59','#347b9a','#70b1cf','#c6e9f4','#0b2136','#e9ffff'],
 19:['#49294d','#915b9d','#d78ed6','#f2c7eb','#160f28','#a1fffa']
};
function drawGiantFish(x,y,kind,dir,scale,phase){
 const rows=GIANT_SPRITES[kind],palette=GIANT_PALETTES[kind],width=Math.max(...rows.map(r=>r.length));
 const unit=species[kind].size*scale/17;
 ctx.save();ctx.translate(Math.round(x),Math.round(y+Math.sin(phase)*2));ctx.scale(dir*unit,unit);
 for(let pass=0;pass<2;pass++)for(let j=0;j<rows.length;j++)for(let i=0;i<rows[j].length;i++){
  const glyph=rows[j][i];if(glyph===' '||glyph==='0')continue;
  const sway=(i<5?Math.round(Math.sin(phase*2.5)):0),px=i-width/2+sway,py=j-rows.length/2;
  ctx.fillStyle=pass===0?'#071b2c':palette[Math.max(0,Math.min(5,Number(glyph)-1))];
  if(pass===0)ctx.fillRect(px-.26,py-.26,1.53,1.53);
  else ctx.fillRect(px,py,1.04,1.04);
 }
 if(kind===18){ctx.fillStyle='#dcf8ff';for(let i=0;i<13;i++){const px=-10+(i*7)%24,py=-2+(i*3)%5;ctx.fillRect(px,py,.9,.9);}}
 if(kind===19){ctx.fillStyle='#8cf6ec';ctx.fillRect(9,-1,2,1);}
 ctx.restore();
}
function fish(x,y,kind=0,dir=1,scale=1,phase=0){
  if(GIANT_SPRITES[kind]){drawGiantFish(x,y,kind,dir,scale,phase);return;}
 if(isDeepCreature(kind)){
  drawDeepCreature(ctx,{x,y,kind,dir,scale,phase,size:species[kind].size,lowFx});
  return;
 }
 const r=species[kind].size*scale,step=r/8,palette=fishPalette[kind];
 const tail=Math.sin(phase*2.5)>0?1:-1,fin=Math.sin(phase*1.8)>0?1:-1;
 ctx.save();ctx.translate(Math.round(x),Math.round(y+Math.sin(phase)*2));ctx.scale(dir,1);
 // An actual joined, hard-edged outline, not a blurry canvas shadow.
 const border=Math.max(1.5,Math.min(3,step*.72));
 ctx.fillStyle='#061321';
 for(let row=0;row<FISH_SPRITE.length;row++){
  const glyphs=FISH_SPRITE[row];
  for(let col=0;col<glyphs.length;col++){
   if(glyphs[col]===' ')continue;
   const dx=(col-10)*step+(col<7?tail*step:0),dy=(row-5)*step+(col<7?tail*step*.48:0);
   ctx.fillRect(dx-border,dy-border,step+border*2+.1,step+border*2+.1);
  }
 }
 for(let row=0;row<FISH_SPRITE.length;row++){
  const glyphs=FISH_SPRITE[row];
  for(let col=0;col<glyphs.length;col++){
   const tile=glyphs[col];if(tile===' ')continue;
   let color=tile==='1'?palette[0]:tile==='2'?palette[1]:tile==='3'?palette[2]:tile==='4'?palette[3]:tile==='5'?C.ink:kind===5?'#d6f8f4':palette[2];
   if(tile==='3'&&kind===1&&col%4===0)color=palette[0];
   if(tile==='3'&&kind===2&&(row+col)%5===0)color=palette[3];
   if(tile==='3'&&kind===3&&col%4===1)color=palette[1];
   if(tile==='3'&&kind===4&&(col+row)%5===0)color=palette[3];
   if(tile==='3'&&kind===5&&(col+row)%3===0)color=palette[3];
   const dx=(col-10)*step+(col<7?tail*step:0),dy=(row-5)*step+(col<7?tail*step*.48:0);
   ctx.fillStyle=color;ctx.fillRect(dx,dy,step+.1,step+.1);
  }
 }
 // Flexible dorsal and pectoral fins make the original fish sprites expressive.
 ctx.fillStyle=palette[1];
 ctx.fillRect(-r*.2,-r*.7+fin*step,Math.max(2,step*2.2),Math.max(2,step*1.4));
 ctx.fillStyle=palette[3];
 ctx.fillRect(-r*.15,r*.3-fin*step*.5,Math.max(2,step*1.8),Math.max(2,step));
 if(kind===5){
   ctx.fillStyle='#e9fff1bd';
   ctx.fillRect(-r*1.05,-r*.3,Math.max(2,step),Math.max(2,step));
 }
 // Distinctive original pixel features for the new species.
 if(kind===6){ // Clownfish: two bright bands
  ctx.fillStyle='#fff7ee';
  ctx.fillRect(-r*.45,-r*.58,step*1.4,r*1.18);
  ctx.fillRect(r*.22,-r*.4,step,r*.79);
 }
 if(kind===7){ // Pufferfish: round shell and little spikes
  ctx.fillStyle=palette[2];
  ctx.fillRect(-r*.58,-r*.7,r*1.25,r*1.42);
  ctx.fillStyle=palette[0];
  for(let i=-2;i<=2;i++){ctx.fillRect(i*step*1.7,-r*.84,step,step*1.5);ctx.fillRect(i*step*1.7,r*.74,step,step*1.4);}
  ctx.fillStyle=palette[3];ctx.fillRect(-step*2,-step*1.2,step*3,step);
 }
 if(kind===9){ // Lionfish: bright fan spines
  ctx.fillStyle=palette[3];
  for(let i=0;i<4;i++){ctx.fillRect(-r*.65+i*step*2,-r*.8-i%2*step*1.5,step,r*.38);ctx.fillRect(-r*.65+i*step*2,r*.5,step,r*.33);}
 }
 if(kind===10){ // Tuna: long racing fins
  ctx.fillStyle=palette[3];ctx.fillRect(-r*.55,-r*.87,r*.22,r*.55);
  ctx.fillRect(-r*.38,r*.49,r*.22,r*.44);
 }
 if(kind===11||kind===12){ // Deep-sea glowing organs
  ctx.fillStyle=palette[3];
  ctx.fillRect(-r*.5,-r*.15,step*2,step*1.5);
  ctx.fillRect(-r*.2,r*.1,step*1.5,step);
  if(kind===12){
   ctx.fillStyle=palette[1];ctx.fillRect(r*.4,-r*1.2,step,r*.75);
   ctx.fillStyle='#fff6a4';ctx.fillRect(r*.3,-r*1.28,step*2,step*2);
  }
 }
 if(kind===13){ // Goldfish gleams with sparkling pixels
  ctx.fillStyle='#fffdf0';ctx.fillRect(-r*.8,-r*.15,step*1.8,step*1.3);
  ctx.fillRect(r*.1,-r*.66,step*1.5,step*1.5);
 }
 // A contrasting eye glint and a species-specific pixel flash stay crisp.
 ctx.fillStyle='#fff9e0';ctx.fillRect(7*step,-1.3*step,Math.max(1.3,step*.7),Math.max(1.3,step*.7));
 ctx.fillStyle=kind%2===0?'#fffde4':palette[3];
 ctx.fillRect(-3*step,-2*step,1.3*step,Math.max(1,step*.7));
 ctx.fillRect(-1*step,2*step,1.8*step,Math.max(1,step*.5));
 ctx.restore();
}
function boat(x,seaY){
 // Compact, hand-drawn pixel trawler: shaped hull, wheelhouse and working deck.
 ctx.save();
 ctx.translate(Math.round(x),Math.round(seaY+Math.sin(waveT*2)*2));
 const rect=(c,x,y,w,h)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
 const poly=(c,points)=>{ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.closePath();ctx.fill();};
 // Dark cutout under the hull adds weight against the bright sea.
 poly('#082639',[[-73,-5],[72,-5],[64,15],[49,24],[-44,24],[-64,15]]);
 poly('#152b45',[[-69,-3],[68,-3],[60,12],[47,19],[-44,19],[-59,11]]);
 // Painted hull, pixel-stepped prow, and separate shadow band.
 poly('#f05b60',[[-68,-4],[69,-4],[61,10],[45,17],[-44,17],[-59,10]]);
 poly('#ad345b',[[-59,10],[61,10],[45,19],[-44,19]]);
 rect('#ff9591',-63,-3,125,4);
 rect('#ffe2a3',-55,7,108,3);
 rect('#762b50',-38,15,78,4);
 // Gunwale and open fishing deck.
 rect('#0b3045',-69,-10,139,7);
 rect('#f7d390',-65,-11,130,3);
 rect('#347d89',-56,-8,112,4);
 rect('#fef2d5',-52,-13,9,3);
 rect('#fef2d5',47,-13,9,3);
 // Rub rail, bolts, portholes and painted name stripe.
 rect('#132f4b',-53,3,106,3);
 for(const px of [-44,-23,0,23,44]){
  rect('#10283d',px-4,1,9,8);
  rect('#8eeaf1',px-2,2,5,4);
  rect('#fff5dc',px-2,2,2,1);
 }
 // Tall little wheelhouse with roof overhang, tinted panes and doorway.
 rect('#172f47',-35,-44,67,33);
 rect('#fff3d4',-32,-43,61,30);
 rect('#edca9b',-32,-17,61,4);
 rect('#13344c',-39,-49,75,7);
 rect('#f96169',-38,-51,72,5);
 rect('#ffb77a',-31,-50,55,2);
 rect('#216074',-26,-37,22,16);
 rect('#216074',3,-37,20,16);
 rect('#80dce3',-24,-35,18,12);
 rect('#80dce3',5,-35,16,12);
 rect('#d8ffff',-23,-34,6,6);
 rect('#d8ffff',6,-34,5,5);
 rect('#10394e',-1,-41,3,27);
 rect('#203950',24,-28,4,15);
 rect('#ffecb9',-29,-12,59,3);
 // Wheelhouse roof beacon and radio aerial.
 rect('#173149',-9,-59,4,9);
 rect('#ffe29b',-12,-62,10,5);
 rect('#fff5d4',-7,-66,3,4);
 rect('#173149',18,-68,3,18);
 rect('#fef2d5',17,-71,5,3);
 // Deck fittings: rope spool and tackle box on the bow.
 rect('#17334b',-62,-25,5,15);
 rect('#ffe4ab',-66,-25,12,4);
 rect('#f7bf6b',-61,-19,13,8);
 rect('#1c4555',-63,-21,17,3);
 rect('#ffde8b',-51,-20,10,7);
 rect('#143e4d',-52,-14,13,3);
 // A lively angler at the stern with a moving reeling hand.
 const arm=Math.round(Math.sin(clock*8)*4);
 rect('#10263d',39,-36,17,23);
 rect('#2de0cb',41,-34,13,17);
 rect('#14283d',41,-18,5,11);
 rect('#14283d',49,-18,5,11);
 rect('#ffd49d',41,-51,12,15);
 rect('#ff6870',37,-56,21,7);
 rect('#ffd9a0',53,-52,7,3);
 rect('#10263d',49,-46,3,3);
 rect('#ffd49d',52,-30+arm,6,10);
 rect('#ffebae',53,-22+arm,7,4);
 // Rod, line guide and tackle hook silhouette stay clear of the cabin.
 rect('#182c42',59,-30,3,14);
 rect('#fff1bd',61,-37,2,12);
 rect('#fff1bd',63,-45,2,10);
 rect('#fff1bd',65,-51,2,8);
 // Tiny sparkling wake, kept behind the boat rather than obscuring the game.
 const wake=Math.round(Math.sin(waveT*3)*2);
 rect('#dcfff0',-79,12+wake,12,2);
 rect('#dcfff0',70,9-wake,11,2);
 rect('#9ce8e8',-86,17+wake,9,2);
 ctx.restore();
}
function hook(x,y){
 // The actual hook on the line now matches the player's equipped hook rig.
 ctx.save();ctx.translate(Math.round(x),Math.round(y));
 ctx.fillStyle='#08283c';ctx.fillRect(-3,-25,7,23);
 ctx.fillStyle='#fff3da';ctx.fillRect(-1,-24,3,21);
 ctx.restore();
 paintShopItem(ctx,'net',x,y+7,.2,save.upgrades.net,clock,true);
}
function bgUndersea(camera){
 const surf=SEA-camera;
 // Continuous depth-aware gradient. World-depth samples smoothly cross biomes
 // as the camera travels; no 35px stripes or palette resets.
 const water=ctx.createLinearGradient(0,0,0,H);
 for(let i=0;i<=16;i++){
  const fraction=i/16,depthAtPixel=Math.max(0,camera+fraction*H-SEA);
  const palette=oceanPalette(depthAtPixel);
  const a=palette[1],b=palette[2],mix=.24+fraction*.53;
  const stop='#'+[1,3,5].map(k=>{
   const low=parseInt(a.slice(k,k+2),16),high=parseInt(b.slice(k,k+2),16);
   return Math.round(low+(high-low)*mix).toString(16).padStart(2,'0');
  }).join('');
  water.addColorStop(fraction,stop);
 }
 ctx.fillStyle=water;ctx.fillRect(0,0,W,H);

 if(surf>0){
  const sky=ctx.createLinearGradient(0,0,0,Math.max(1,surf));
  sky.addColorStop(0,'#68b5ce');sky.addColorStop(1,'#b2e4d8');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,Math.min(H,surf));
  ctx.fillStyle='#52b8bd';ctx.fillRect(0,surf,W,5);
  ctx.fillStyle='#d4fff1';
  for(let x=0;x<W;x+=28)ctx.fillRect(x,surf+Math.floor(x/28+waveT*2)%3*2,16,2);
 }
 // Low-intensity sunbeams fade out below the surface; never sit on top of fish.
 if(surf>-400){
  const top=Math.max(0,surf),bottom=Math.min(H,Math.max(top+1,surf+470));
  if(bottom>top){
   const ray=ctx.createLinearGradient(0,top,0,bottom);
   ray.addColorStop(0,'rgba(218,255,240,0.095)');
   ray.addColorStop(1,'rgba(218,255,240,0)');
   ctx.save();ctx.beginPath();ctx.rect(0,top,W,bottom-top);ctx.clip();
   ctx.fillStyle=ray;
   for(let i=0;i<3;i++){
    const x=54+i*150+Math.sin(waveT*.24+i)*8;
    ctx.beginPath();ctx.moveTo(x-13,surf);ctx.lineTo(x+20,surf);
    ctx.lineTo(x+103,surf+470);ctx.lineTo(x+16,surf+470);
    ctx.closePath();ctx.fill();
   }
   ctx.restore();
  }
 }
 // Procedural scenery is generated only around the current camera.
 drawSeaScape(ctx,camera,{width:W,height:H,sea:SEA,time:waveT,lowFx,seed:castNumber});
 const vignette=ctx.createRadialGradient(W/2,H*.43,W*.25,W/2,H*.43,H*.79);
 vignette.addColorStop(0,'rgba(3,14,30,0)');
 vignette.addColorStop(1,'rgba(3,14,30,0.30)');
 ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
}
function jellyfish(h,y){
 const bob=Math.sin(h.phase)*9;
 ctx.save();ctx.translate(Math.round(h.x),Math.round(y+bob));
 ctx.fillStyle='#f4a4fc60';ctx.fillRect(-22,-20,44,29);
 ctx.fillStyle='#ab84ec';ctx.fillRect(-20,-17,40,23);
 ctx.fillStyle='#dfaaff';ctx.fillRect(-14,-23,28,11);
 ctx.fillStyle='#fff3ff';ctx.fillRect(-11,-18,8,5);
 ctx.fillStyle='#582f8f';ctx.fillRect(8,-6,4,4);
 for(let i=0;i<5;i++){
  const dx=-16+i*8+Math.round(Math.sin(h.phase*2+i)*4);
  ctx.fillStyle=i%2?'#b8b5ff':'#ff93d0';
  ctx.fillRect(dx,6,4,22+i%3*6);
  ctx.fillRect(dx+Math.round(Math.sin(h.phase*3+i)*4),24,3,10+i%2*4);
 }
 ctx.restore();
}
const DEPTH_PIXELS_PER_METRE=3;
const START_LINE_DEPTH=1050;
function maxLineDepth(level){
 const l=clamp(level,0,LINE_MAXLVL);
 return Math.round(3*(350+150*l+38*l*l+3*l*l*l));
}
function meter(n){return `${Math.round(n/DEPTH_PIXELS_PER_METRE)}m`;}
function beginCast(){
 paused=false;pauseReason='';sound.pause(false);
 splashes=[];ripples=[];emitSplash(210,SEA+5,'#d8ffff',1.6);sceneFlash=.23;
 sound.play('splash');rumble.play('cast');
 castNumber++;state='descent';age=0;roundEarnings=0;discoveriesThisCast=0;lastBiomeId='sunskip';zoneNotice=null;cameraY=0;newFishThisCast=0;newBadgesThisCast=0;bonusThisCast=0;missionRewardThisCast=0;missionsCompletedThisCast=0;fired=0;combo=0;bestRoundCombo=0;lastComboHit=-Infinity;landed=0;escaped=0;finisherSlow=0;hitFreeze=0;shotEffects=[];impactRings=[];impactGhosts=[];coinBursts=[];recoil=0;muzzleFlash=0;maxDepth=maxLineDepth(save.upgrades.line);depth=0;deepestCast=0;chargeArmed=save.charges>0;hookX=210;targetX=210;fishes=[];caught=[];airborne=[];particles=[];labels=[];
const worldSeed=Math.floor(Math.random()*0xffffffff);
 oceanStream=createOceanStream(maxDepth,worldSeed);
 discoveryStream=createDiscoveryStream(maxDepth,worldSeed);
 ({fish:fishes,hazards}=oceanStream.near(depth));hazardSlow=0;
 message='DIVE DEEP • DODGE FISH';messageTimer=2.4;stageCue('dive');}
function startAscent(hitFish,stung=false){if(state!=='descent')return;
 deepestCast=Math.max(deepestCast,depth);
 state='ascent';age=0;message='REEL THEM IN!';messageTimer=1.9;if(hitFish)catchFish(hitFish);
 else if(!caught.length&&!stung){const nearest=fishes.filter(f=>!f.caught).sort((a,b)=>Math.abs(a.d-depth)-Math.abs(b.d-depth))[0];if(nearest)catchFish(nearest);}
 sound.play('reel');sceneFlash=.16;stageCue('reel');}
function catchFish(f){
 if(f.caught)return;f.caught=true;
 caught.push({kind:f.kind,value:species[f.kind].value});
 const found=recordCatch(save.collection,f.kind);
 if(found.discovered){
  newFishThisCast++;awardBonus(found.reward);
  floatLabel('NEW! +$'+found.reward,hookX,245,C.yellow);
  sound.play('upgrade');
 }
 updateAchievements();persist();
 if(species[f.kind].rare){
  floatLabel('GOLDEN CATCH!',210,158,C.yellow);
  sceneFlash=.35;sound.play('combo');
 }
 const camera=cameraY,hy=SEA+depth-camera;
 burst(hookX,hy,C.yellow,12);emitSplash(hookX,hy,species[f.kind].color,.55);
 sound.play('catch',{pitch:f.kind});rumble.play(species[f.kind].rare?'legendary':'catch');
}
function beginShoot(){
 state='shoot';age=0;shootTime=16;endDelay=0;
 shootCameraOffset=SHOOT_WATERLINE-SEA;
 // Point toward the sky at breach instead of into the ocean.
 pointer={x:W/2,y:SEA-100};
 combo=0;bestRoundCombo=0;lastComboHit=-Infinity;landed=0;escaped=0;
 shotEffects=[];impactRings=[];impactGhosts=[];coinBursts=[];
 finisherSlow=0;hitFreeze=0;recoil=0;muzzleFlash=0;
 const gun=weaponForLevel(save.upgrades.gun);
 message=gun.tier===0?'SHOOT BEFORE THEY SPLASH!':gun.name+' READY!';
 messageTimer=2;
 airborne=caught.map((f,i)=>({...makeAirborneCatch({...f,size:species[f.kind].size},i,caught.length,Math.random,{x:hookX,reelSpeed:hazardSlow>0?125:205}),hp:species[f.kind].hp||1}));
 if(!caught.length){endRound();return;}
 stageCue('shoot');
 emitSplash(hookX,SHOOT_WATERLINE,C.cream,Math.min(3,1.4+caught.length*.11),true);
 burst(hookX,SEA,C.white,Math.min(48,14+caught.length*2));
 shake=lowFx?0:Math.min(10,3+caught.length*.38);
 rumble.play('cast');sceneFlash=.23;sound.play('splash');
}
function shootAt(x,y){
 if(state!=='shoot'||endDelay>0||sceneTransition)return;
 const gun=weaponForLevel(save.upgrades.gun);
 fired++;recoil=1;muzzleFlash=.16;sound.play('shot',{pitch:gun.tier});
 pointer={x,y};
 const targets=pickShotTargets(airborne.map(f=>({...f,y:airScreenY(f.y),size:species[f.kind].size,original:f})),x,y,gun);
 const actual=targets.map(t=>t.original);
 const defeated=actual.filter(f=>f.hp<=Math.max(1,gun.tier+1));
  const streak=nextCombo(combo,lastComboHit,clock,defeated.length);
 combo=streak.count;lastComboHit=streak.lastHit;
 bestRoundCombo=Math.max(bestRoundCombo,combo);
 // Fire from the boat itself. Store the muzzle and targets in world space
 // so bullet traces remain correctly anchored while the sky camera travels.
 const mount=shootGunPose(shootCameraOffset,x,y,Math.sin(waveT*2)*2);
 shotEffects.push({x:mount.muzzleX,y:mount.muzzleY+shootCameraOffset,targets:actual.length
   ?actual.map(f=>({x:f.x,y:f.y})):[{x,y:y+shootCameraOffset}],
   life:.25,max:.25,color:gun.color,tier:gun.tier});
 if(actual.length){
  for(const f of actual){
    const hitY=airScreenY(f.y);
    f.hp=Math.max(0,(f.hp??1)-Math.max(1,gun.tier+1));
    if(f.hp>0){
      burst(f.x,hitY,C.white,9);
      impactRings.push({x:f.x,y:hitY,radius:4,speed:120,life:.23,max:.23,color:C.white});
      floatLabel('ARMOUR '+f.hp+' LEFT',f.x,hitY-30,C.white);
      continue;
    }
    landed++;
    f.shot=true;
   const money=shotPayout(f.value,streak.multiplier);
   roundEarnings+=money;save.cash+=money;save.total+=money;payoutPulse=Math.min(1.25,payoutPulse+.5);
   recordShot(save.collection,f.kind,money,streak.multiplier);
   burst(f.x,hitY,species[f.kind].color,streak.multiplier>=3?38:27);
   coinBurst(f.x,hitY,streak.multiplier,gun.tier);
   impactRings.push({x:f.x,y:hitY,radius:5,speed:streak.multiplier>=3?330:235,
     life:.43,max:.43,color:streak.multiplier>=3?C.yellow:gun.color});
   impactGhosts.push({x:f.x,y:hitY,kind:f.kind,vx:f.vx*.25,vy:-65,
     angle:f.angle||0,life:.42,max:.42});
   floatLabel('+$'+money+(streak.multiplier>1?' x'+streak.multiplier:''),f.x,hitY-29,C.yellow);
  }
  shake=lowFx?0:clamp(shake+3+actual.length*2+(streak.multiplier>=3?2:0),0,12);
  hitFreeze=lowFx?0:.045;
  sceneFlash=Math.max(sceneFlash,streak.multiplier>=3?.2:.11);
  sound.play('hit',{pitch:gun.tier});rumble.play(combo>=2?'combo':'hit');
  updateAchievements();
  if(combo>=2&&defeated.length){
    floatLabel('COMBO x'+streak.multiplier+'!',210,230,C.yellow);
   sound.play('combo');
   if(streak.multiplier>=3)burst(210,250,C.yellow,26);
  }
  if(allCatchResolved(airborne)){
   finisherSlow=lowFx?0:.8;hitFreeze=lowFx?0:.09;
   impactGhosts.forEach(ghost=>{ghost.life=Math.max(ghost.life,.78);ghost.max=Math.max(ghost.max,.78);});
   shake=lowFx?0:12;sceneFlash=Math.max(sceneFlash,.3);
   burst(210,330,C.yellow,50);coinBurst(210,330,4,gun.tier);
   floatLabel('FINISHER!',210,300,C.cream);
   sound.play('finisher');rumble.play('legendary');
   setTimeoutSafe(endRound,lowFx?500:1100);
  }
  persist();
 }else{
  burst(x,y,'#e8f6e7',6);floatLabel('MISS',x,y-18,C.cream);
  shake=lowFx?0:clamp(shake+1.5,0,12);
  sound.play('miss');rumble.play('shot');
 }
}
let oceanStream=null,discoveryStream=null;
let endDelay=0;function setTimeoutSafe(_fn,seconds){endDelay=Math.max(endDelay,seconds/1000);}
function endRound(){if(state!=='shoot')return;settleExpedition();state='results';age=0;endDelay=0;shotEffects=[];impactRings=[];impactGhosts=[];coinBursts=[];finisherSlow=0;hitFreeze=0;recoil=0;muzzleFlash=0;particles=[];labels=[];save.best=Math.max(save.best,roundEarnings);persist();sound.play('results');stageCue('results');}
function purchase(type){const cfg=upgradeConfig(type);if(cfg.level>=(type==='line'?LINE_MAXLVL:MAXLVL)||save.cash<cfg.cost){skipperReply(type,false);return;}
 save.cash-=cfg.cost;save.upgrades[type]++;skipperReply(type,true);persist();burst(210,350,C.yellow,18);sound.play('upgrade');rumble.play('upgrade');}
const LINE_NAMES=['SKIPPER STRING','SHELFWALKER','BLUEWANDER','KELP CUTTER','HUSH RUNNER','RIFT RIDER','DEEP REACH','BLACKGLASS','VOID RUNNER','GHOST THREAD','UNMARKED','DARK DRIFTER','DEEP SPOOL','STARLESS','ENDLESS REEL'];
const GUN_NAMES=['POP GUN','QUICKSHOT','SCATTERGUN','TWIN SCATTER','NEON BLASTER','STORM CANNON'];
function upgradeConfig(type){
 const base={line:65,net:90,gun:85},lvl=save.upgrades[type];
 return {title:{line:'FISHING LINES',net:'FISHING HOOKS',gun:'GUN COLLECTION'}[type],
 level:lvl,cost:Math.round(base[type]*Math.pow(type==='line'?1.52:1.75,lvl)),
 desc:{line:'MORE DEPTH WITH EVERY REEL',net:'Wider rigs catch more fish',gun:'AIM BOOST | NEW GUNS L2/L4'}[type]};
}
function buyLight(){
 const level=save.upgrades.light,costs=[180,420,900,1800,3700];
 if(level>=LIGHT_MAXLVL||save.cash<costs[level]){skipperReply('light',false);return;}
 save.cash-=costs[level];save.upgrades.light++;skipperReply('light',true);persist();sound.play('upgrade');rumble.play('upgrade');
}
function deepDarkness(y){
 const opacity=1-oceanVisibility(depth);
 if(!opacity)return;
 const level=save.upgrades.light,radius=[0,105,165,240,315,390][level],d=shadeCtx;
 d.clearRect(0,0,W,H);d.fillStyle='rgba(0,3,14,'+opacity+')';d.fillRect(0,0,W,H);
 if(level){
  d.globalCompositeOperation='destination-out';
  const glow=d.createRadialGradient(hookX,y,12,hookX,y,radius);
  glow.addColorStop(0,'rgba(0,0,0,1)');glow.addColorStop(.45,'rgba(0,0,0,.96)');
  glow.addColorStop(1,'rgba(0,0,0,0)');
  d.fillStyle=glow;d.fillRect(hookX-radius,y-radius,radius*2,radius*2);
  d.globalCompositeOperation='source-over';
 }
 ctx.drawImage(shade,0,0);
}
function buyCharge(){
 if(save.charges>=3||save.cash<110)return;
 save.cash-=110;save.charges++;persist();sound.play('upgrade');rumble.play('upgrade');
}
function burst(x,y,color,count){
 if(lowFx)count=Math.min(count,7);
 // A few high-contrast gold and aqua sparkles make catches and shots satisfying.
 const sparks=[color,C.yellow,C.teal,C.cream,C.pink];
 for(let i=0;i<count;i++){
  const a=Math.random()*Math.PI*2,s=rand(48,165);
  particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,
    life:rand(.38,.82),max:.82,color:sparks[i%sparks.length],r:rand(2,5)});
 }
}
function coinBurst(x,y,multiplier=1,tier=0){
 const count=lowFx?4:Math.min(17,5+multiplier*2+tier*2);
 for(let i=0;i<count;i++){
  const angle=rand(-Math.PI+.25,-.12),speed=rand(95,270)*(multiplier>=3?1.2:1);
  const duration=rand(.8,1.22);
  coinBursts.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
   life:duration,max:duration,spin:rand(0,6),size:rand(9,14)});
 }
}
function drawPixelCoin(x,y,size,spin,alpha=1){
 const width=Math.max(2,Math.round(size*Math.max(.19,Math.abs(Math.cos(spin)))));
 const h=Math.round(size),left=Math.round(x-width/2),top=Math.round(y-h/2);
 ctx.save();ctx.globalAlpha=alpha;
 ctx.fillStyle='#563019';ctx.fillRect(left-2,top+2,width+4,h-2);
 ctx.fillStyle='#a86118';ctx.fillRect(left-1,top,width+2,h);
 ctx.fillStyle='#ffce48';ctx.fillRect(left,top+1,width,h-2);
 ctx.fillStyle='#ffef9d';ctx.fillRect(left+1,top+2,Math.max(1,Math.floor(width*.32)),Math.max(2,h*.35));
 ctx.fillStyle='#d88323';ctx.fillRect(left+width-2,top+2,2,h-4);
 if(width>=7){
  ctx.fillStyle='#92511b';ctx.font='900 '+Math.max(7,Math.floor(h*.77))+'px monospace';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('$',Math.round(x),Math.round(y)+1);
 }
 ctx.restore();
}
function drawShotCelebration(){
 for(const ghost of impactGhosts){
  ctx.save();ctx.globalAlpha=clamp(ghost.life/ghost.max,0,.75);
  ctx.translate(ghost.x,ghost.y);ctx.rotate(ghost.angle);
  fish(0,0,ghost.kind,ghost.vx<0?-1:1,1.65,clock*8);
  ctx.restore();
 }
 for(const ring of impactRings){
  ctx.save();ctx.globalAlpha=clamp(ring.life/ring.max,0,1)*.85;
  ctx.strokeStyle=ring.color;ctx.lineWidth=ring.life/ring.max>.5?6:3;
  ctx.beginPath();ctx.arc(ring.x,ring.y,ring.radius,0,Math.PI*2);ctx.stroke();
  ctx.restore();
 }
 for(const coin of coinBursts){
  const alpha=clamp(coin.life/.2,0,1);
  drawPixelCoin(coin.x,coin.y,coin.size,coin.spin,alpha);
  if(!lowFx&&coin.life>coin.max*.4){
   ctx.save();ctx.globalAlpha=alpha*.7;ctx.fillStyle='#fff5ad';
   ctx.fillRect(Math.round(coin.x+coin.size*.6),Math.round(coin.y-coin.size*.55),2,2);ctx.restore();
  }
 }
}
function floatLabel(value,x,y,color){labels.push({value,x,y,color,life:1.1});}

function update(dt){
 const realDt=dt;
 if(state==='shoot'&&!lowFx){
  hitFreeze=Math.max(0,hitFreeze-realDt);
  finisherSlow=Math.max(0,finisherSlow-realDt);
  dt*=hitFreeze>0?.1:finisherSlow>0?.24:1;
 }
 sound.update(realDt,state,document.hidden);
 payoutPulse=Math.max(0,payoutPulse-realDt*2.2);
 // The brief stage card freezes all gameplay timers and fish motion.
 if(sceneTransition){
  sceneTransition.elapsed+=realDt;
  if(sceneTransition.elapsed>=sceneTransition.duration)sceneTransition=null;
  return;
 }
 clock+=realDt;if(!lowFx)waveT+=dt;age+=realDt;
 shake=lowFx?0:Math.max(0,shake-realDt*23);if(messageTimer>0)messageTimer-=realDt;
 sceneFlash=Math.max(0,sceneFlash-dt*1.7);
 for(const splash of splashes)splash.life-=dt;
 splashes=splashes.filter(s=>s.life>0);
 for(const ripple of ripples)ripple.life-=dt;
 ripples=ripples.filter(r=>r.life>0);
 if(inputMode==='tilt'&&tiltStartedAt>-1e5&&clock-tiltStartedAt>3&&clock-tiltUpdatedAt>2&&sensorStatus==='WAITING FOR MOTION SENSOR')sensorStatus='NO SENSOR DATA - DRAG TO STEER';
 if(state==='descent'||state==='ascent'){
 // Hold the phone level for neutral, tilt sideways for acceleration.
 // Drag always overrides tilt while a finger is on the screen.
 if(!pointerDown&&sensorFresh())targetX+=tiltVelocity(tiltValue,tiltNeutral)*dt;
 if(keys.has('ArrowLeft')||keys.has('a'))targetX-=270*dt;
 if(keys.has('ArrowRight')||keys.has('d'))targetX+=270*dt;
 targetX=clamp(targetX,24,W-24);hookX+=(targetX-hookX)*clamp((pointerDown?14:9)*dt,0,1);
 if(oceanStream)({fish:fishes,hazards}=oceanStream.near(depth));
 for(const f of fishes)advanceFish(f,dt);
 for(const h of hazards)advanceHazard(h,dt);
 hazardSlow=Math.max(0,hazardSlow-dt);
 const touchingHazard=hazards.find(h=>overlapsHazard(h,hookX,depth)&&clock-h.triggeredAt>1.8);
 const triggerHazard=()=>{
  if(!touchingHazard)return;
  touchingHazard.triggeredAt=clock;
  const camera=cameraY,y=SEA+touchingHazard.d-camera;
  burst(touchingHazard.x,y,'#d7b3ff',14);
  floatLabel('JELLYFISH!',touchingHazard.x,y-27,C.pink);
  sceneFlash=.17;shake=lowFx?0:3;
  sound.play('miss');rumble.play('sting');
 };
 if(state==='descent'){
 depth+= (91+save.upgrades.line*3)*dt;
 const collided=depth<540?null:fishes.find(f=>!f.caught&&!f.bypassed&&Math.abs(f.d+(f.swimY||0)-depth)<17&&Math.abs(f.x-hookX)<(12+species[f.kind].size*.52));
 if(collided&&chargeArmed){
  chargeArmed=false;save.charges=Math.max(0,save.charges-1);persist();
  // Clear the fish from the collision path without adding it to the catch.
  collided.bypassed=true;
  const cam=cameraY,cy=SEA+depth-cam;
  burst(hookX,cy,C.yellow,32);emitSplash(hookX,cy,C.coral,1.1);
  floatLabel('BLAST SAVE!',hookX,cy-44,C.yellow);
  sceneFlash=.38;shake=lowFx?0:9;sound.play('finisher');rumble.play('legendary');
  message='CHARGE USED • KEEP DIVING';messageTimer=2;
 }
 else if(collided)startAscent(collided);
 else if(touchingHazard){triggerHazard();startAscent(null,true);}
 else if(depth>=maxDepth){depth=maxDepth;startAscent(null);}
 }else{
 depth-=(hazardSlow>0?125:205)*dt;
 if(touchingHazard){triggerHazard();hazardSlow=1.2;}
 const radius=24+save.upgrades.net*13;
 for(const f of fishes)if(!f.caught&&Math.abs(f.d+(f.swimY||0)-depth)<27&&Math.abs(f.x-hookX)<radius+species[f.kind].size*.5)catchFish(f);
 if(depth<=0){depth=0;beginShoot();}
 }
 // Ease the world camera without artificial region-boundary snapping.
 cameraY+=(clamp(depth-230,0,maxDepth+100)-cameraY)*clamp(dt*6.5,0,1);
 const discovered=discoveryStream?.claimAt(depth,hookX);
 if(discovered){
  discoveriesThisCast++;awardBonus(discovered.reward);persist();
  const fy=SEA+discovered.d-cameraY;
  burst(discovered.x,fy,discovered.color,lowFx?5:16);
  floatLabel('+$'+discovered.reward,discovered.x,fy-44,C.yellow);
  message='FOUND '+discovered.name;messageTimer=3.2;
  sceneFlash=.18;sound.play('upgrade');rumble.play('upgrade');
 }
 if(state==='descent'){
  const region=biomeAtDepth(depth);
  if(region.id!==lastBiomeId){
   lastBiomeId=region.id;
   const regionIndex=BIOMES.findIndex(item=>item.id===region.id);
   const nextRegion=BIOMES[regionIndex+1];
   const rangeStart=Math.round(region.start/DEPTH_PIXELS_PER_METRE);
   const rangeEnd=nextRegion?Math.round(nextRegion.start/DEPTH_PIXELS_PER_METRE)-1:null;
   zoneNotice={name:region.name,range:rangeEnd===null?rangeStart+'m +':rangeStart+'–'+rangeEnd+'m',started:clock};
  }
 }
 }
 if(state==='shoot'){
  recoil=Math.max(0,recoil-dt*7);
  muzzleFlash=Math.max(0,muzzleFlash-dt);
  for(const fx of shotEffects)fx.life-=dt;
  shotEffects=shotEffects.filter(fx=>fx.life>0);
  for(const ring of impactRings){ring.life-=dt;ring.radius+=ring.speed*dt;}
  impactRings=impactRings.filter(ring=>ring.life>0);
  for(const ghost of impactGhosts){ghost.x+=ghost.vx*dt;ghost.y+=ghost.vy*dt;ghost.vy+=125*dt;ghost.life-=dt;}
  impactGhosts=impactGhosts.filter(ghost=>ghost.life>0);
  for(const coin of coinBursts){
   coin.life-=dt;coin.spin+=dt*18;
   if(coin.life>coin.max*.48){coin.x+=coin.vx*dt;coin.y+=coin.vy*dt;coin.vy+=330*dt;coin.vx*=Math.pow(.55,dt);}
   else{const pull=Math.min(1,(8+18*(1-coin.life/coin.max))*dt);coin.x+=(210-coin.x)*pull;coin.y+=(190-coin.y)*pull;}
  }
  coinBursts=coinBursts.filter(coin=>coin.life>0);
  if(combo&&clock-lastComboHit>2.4){combo=0;lastComboHit=-Infinity;}
  shootTime-=realDt;
  for(const f of airborne){
   if(f.shot||f.lost)continue;
   const waiting=!f.launched;
   if(stepAirborneCatch(f,dt)){
    escaped++;
    const force=Math.min(2.7,.8+f.mass*.85+Math.max(0,f.vy)*.0012);
    emitSplash(f.x,SHOOT_WATERLINE,species[f.kind].color,force,true);
    burst(f.x,airScreenY(SHOOT_WATERLINE)-6,C.teal,lowFx?5:Math.round(8+force*5));
    if(escaped<=4)floatLabel('SPLASH!',f.x,airScreenY(SHOOT_WATERLINE)-36,C.white);
    sound.play('water-return');
   }else if(waiting&&f.launched){
    emitSplash(f.x,SHOOT_WATERLINE,C.cream,.35,true);
   }
  }
  shootCameraOffset=stepSkyCamera(shootCameraOffset,targetSkyCamera(airborne),dt,age<1.0);
  if(endDelay>0){endDelay-=realDt;if(endDelay<=0)endRound();}
  else if(shootTime<=0)endRound();
  else if(allCatchResolved(airborne))setTimeoutSafe(endRound,550);
 }
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.18,dt);p.vy+=80*dt;p.life-=dt;}
 particles=particles.filter(p=>p.life>0);
 for(const l of labels){l.y-=27*dt;l.life-=dt;}labels=labels.filter(l=>l.life>0);
}
function emitSplash(x,y,color=C.teal,intensity=1,shootWorld=false){
 ripples.push({x,y,color,scale:intensity,life:.48,max:.48,shootWorld});
 const count=lowFx?5:Math.round(10*intensity);
 for(let i=0;i<count;i++){
  const a=-Math.PI/2+rand(-1.25,1.25),speed=rand(55,210)*intensity;
  const life=rand(.28,.68);
  splashes.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life,max:life,color,size:irand(3,7),shootWorld});
 }
}
function drawSplashEffects(dt){
 for(const ripple of ripples){
  const progress=1-ripple.life/ripple.max;
  const radius=(10+46*progress)*ripple.scale;
  const edgeX=Math.round(radius/4)*4, y=Math.round((ripple.y-(ripple.shootWorld?shootCameraOffset:0))/4)*4;
  ctx.globalAlpha=clamp(ripple.life/ripple.max,0,1)*.88;
  ctx.fillStyle=ripple.color;
  ctx.fillRect(Math.round(ripple.x-edgeX),y,18,4);
  ctx.fillRect(Math.round(ripple.x+edgeX-18),y,18,4);
  ctx.fillRect(Math.round(ripple.x-edgeX*.54),y-5,12,3);
  ctx.fillRect(Math.round(ripple.x+edgeX*.54-12),y-5,12,3);
 }
 for(const drop of splashes){
  drop.x+=drop.vx*dt;drop.y+=drop.vy*dt;
  drop.vy+=360*dt;drop.vx*=Math.pow(.75,dt);
  ctx.globalAlpha=clamp(drop.life/drop.max,0,1);
  ctx.fillStyle=drop.color;
  ctx.fillRect(Math.round(drop.x/3)*3,Math.round((drop.y-(drop.shootWorld?shootCameraOffset:0))/3)*3,drop.size,drop.size);
 }
 ctx.globalAlpha=1;
}
function overlayParticles(){
 for(const p of particles){
  ctx.globalAlpha=clamp(p.life/p.max,0,1);
  const size=Math.max(3,Math.round(p.r)*2),x=Math.round(p.x/3)*3,y=Math.round(p.y/3)*3;
  ctx.fillStyle=p.color;ctx.fillRect(x,y,size,size);
  if(size>=8){ctx.fillRect(x-4,y+2,3,3);ctx.fillRect(x+size+1,y+2,3,3);}
 }
 ctx.globalAlpha=1;
 for(const l of labels){ctx.globalAlpha=clamp(l.life,0,1);text(l.value,l.x,l.y,22,l.color,'center',950);}
 ctx.globalAlpha=1;
}
function topBar(title,left,right){
 // Fill the canvas from its first pixel; a 19px inset exposed a stray
 // band of background above the shooting status bar on installed PWAs.
 roundRect(0,0,W,74,0,'#061d34f7','#72ffe7',2);
 text(title,27,47,18,C.white,'left',900,0,left?175:230);
 text(right,392,47,17,C.white,'right',900,0,130);
 if(left)text(left,244,47,16,C.white,'center',900,0,66);
}
function bottomHint(hint){
 // Reduce persistent touch chrome to leave room for the underwater world.
 if(age>4&&hazardSlow<=0)return;
 roundRect(49,725,322,38,12,'#061d34ce','#6beedc',1);
 text(hint,210,744,14,C.white,'center',900,0,298);
}
function depthReadout(){
 // One slim, high-contrast status strip; retain the separate depth ruler.
 // Extend the opaque HUD to the top of the canvas, not just y=12.
 // Keep the previous text centre and bottom separator at their original
 // positions so mobile thumb/layout alignment stays unchanged.
 const y=0,h=51;
 ctx.save();
 ctx.fillStyle='rgba(5,22,38,.88)';ctx.fillRect(0,y,W,h);
 ctx.fillStyle='#82f8e5';ctx.fillRect(0,y+h-2,W,2);
 ctx.textBaseline='middle';ctx.shadowColor='#04111b';ctx.shadowBlur=3;
 const items=[
  {label:'▼ '+meter(depth),x:12,width:139,align:'left',color:'#ffffff'},
  {label:'♥ '+caught.length,x:161,width:68,align:'left',color:'#ff9bad'},
  {label:'$ '+Math.floor(save.cash).toLocaleString('en-GB'),x:W-11,width:179,align:'right',color:payoutPulse>0?'#fff1a5':'#ffffff'}
 ];
 for(const item of items){
  ctx.font='11px "Press Start 2P",monospace';
  ctx.fillStyle=item.color;ctx.textAlign=item.align;
  ctx.fillText(item.label,item.x,y+h/2,item.width);
 }
 ctx.restore();
}
function zoneAnnouncement(){
 if(!zoneNotice||state!=='descent')return;
 const elapsed=clock-zoneNotice.started,duration=lowFx?2:3;
 if(elapsed>=duration)return;
 const alpha=lowFx?1:clamp(Math.min(elapsed/.38,(duration-elapsed)/.55),0,1);
 const rise=lowFx?0:Math.round((1-clamp(elapsed/.5,0,1))*12);
 const center=H*.43-rise;
 ctx.save();ctx.globalAlpha=alpha;
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.shadowColor='#041422';ctx.shadowBlur=8;ctx.shadowOffsetY=3;
 ctx.fillStyle='#f3ffff';ctx.font='10px "Press Start 2P",monospace';
 ctx.fillText('NEW DEPTH DISCOVERED',W/2,center-43,370);
 ctx.fillStyle='#a6fff1';ctx.fillRect(72,center-16,276,2);
 ctx.font='19px "Press Start 2P",monospace';ctx.fillStyle='#ffffff';
 ctx.fillText(zoneNotice.name,W/2,center+13,375);
 ctx.font='10px "Press Start 2P",monospace';ctx.fillStyle='#d5eaf5';
 ctx.fillText(zoneNotice.range,W/2,center+49,310);
 ctx.restore();
}
function sideDepthGauge(){
 // World-anchored, smoothly scrolling ruler at the extreme right edge.
 // Unlike a segmented/progress meter, the ticks stay aligned with actual depth.
 const x=W-2,top=211,bottom=H-64,rangeMetres=200;
 const currentMetres=depth/DEPTH_PIXELS_PER_METRE;
 const markerY=clamp(SEA+depth-cameraY,top+30,bottom-30);
 const pixelsPerMetre=(bottom-top)/rangeMetres;
 const start=Math.max(0,Math.ceil((currentMetres-(markerY-top)/pixelsPerMetre)/25)*25);
 const end=currentMetres+(bottom-markerY)/pixelsPerMetre;
 ctx.save();
 ctx.beginPath();ctx.rect(x-76,top,80,bottom-top);ctx.clip();
 ctx.fillStyle='#ffffffa8';ctx.fillRect(x,top,2,bottom-top);
 ctx.shadowColor='#061525';ctx.shadowBlur=4;ctx.shadowOffsetY=1;
 ctx.textAlign='right';ctx.textBaseline='middle';
 for(let metres=start;metres<=end;metres+=25){
  const y=markerY+(metres-currentMetres)*pixelsPerMetre,major=metres%50===0;
  line(x-(major?10:5),y,x,y,'#ffffff',major?1.5:1);
  if(major&&Math.abs(y-markerY)>23){
   ctx.font='900 12px "Press Start 2P",monospace';ctx.fillStyle='#ffffff';
   ctx.fillText(metres+'m',x-14,y);
  }
 }
 line(x-14,markerY,x,markerY,'#ffffff',2.5);
 ctx.font='900 16px "Press Start 2P",monospace';ctx.fillStyle='#ffffff';
 ctx.fillText(meter(depth),x-16,markerY-15);
 ctx.restore();
}
function gameplay(){const camera=cameraY;
 bgUndersea(camera);const surf=SEA-camera;
 if(surf>45&&surf<H+60){boat(W/2,surf-7);}
 const reelY=surf-35,hy=SEA+depth-camera;
 line(W/2,Math.max(-20,reelY),hookX,hy,'#e3debbd9',1.5);
 for(const item of discoveryStream?.near(depth,900)||[]){
  const y=SEA+item.d-camera;
  if(y>-72&&y<H+72)drawDiscovery(ctx,item,y,waveT,{lowFx});
 }
 for(const f of fishes){
  if(f.caught)continue;
  const fy=SEA+f.d-camera;if(fy<-48||fy>H+48)continue;
  fish(f.x,fy+(f.swimY||0),f.kind,f.dir,1,f.phase);
}
for(const h of hazards){
  const hy=SEA+h.d-camera;
  if(hy>-80&&hy<H+80)jellyfish(h,hy);
}
 caught.forEach((f,i)=>{fish(hookX+Math.sin(clock*3+i)*12,hy+35+i*20,f.kind,i%2?-1:1,.6,clock*4+i);});
 hook(hookX,hy);
 if(!lowFx){
  // A faint wake makes the direction of hook movement visible on small screens.
  ctx.save();ctx.fillStyle='rgba(180,248,250,.24)';
  for(let i=0;i<4;i++){
   const yy=hy-23-i*17+Math.sin(waveT*2+i)*3;
   const xx=hookX+Math.sin(waveT*1.8+i*2.4)*(3+i*2);
   ctx.fillRect(Math.round(xx),Math.round(yy),i%2?3:2,i%2?3:2);
  }
  ctx.restore();
 }
 deepDarkness(hy);
  sideDepthGauge();
 depthReadout();
 if(chargeArmed&&state==='descent')arcadePill('BLAST READY',242,154,162,C.yellow);
 const biome=biomeAtDepth(depth);
 // Region names appear as centre-screen discoveries, not permanent cards.
 // The concise HUD and edge ruler carry the persistent information.
 if(messageTimer>0&&!(zoneNotice&&clock-zoneNotice.started<3)){roundRect(67,164,286,42,0,'#07243df5','#86fff2',2);text(message,210,185,16,C.cream,'center',950,0,269);}
 zoneAnnouncement();
 bottomHint(hazardSlow>0?'JELLYFISH! SLOW REEL':(sensorFresh()?'TILT':'DRAG')+' TO STEER • '+(state==='descent'?'AVOID FISH':'CATCH FISH'));
 button('II',357,112,51,46,()=>pauseGame('MANUAL'),C.cream);
}
function drawBulletTrail(x1,y1,x2,y2,alpha,color,tier=0){
 ctx.save();
 if(tier>0){
  ctx.globalAlpha=alpha*(tier===2?.65:.4);
  ctx.strokeStyle=color;ctx.lineWidth=tier===2?10:5;
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  if(tier===2){
   ctx.strokeStyle=C.white;ctx.lineWidth=3;
   ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  }
 }
 ctx.globalAlpha=alpha;
 const count=Math.max(1,Math.round(Math.hypot(x2-x1,y2-y1)/(tier===2?8:11)));
 for(let i=0;i<=count;i++){
  const t=i/count;
  const x=Math.round((x1+(x2-x1)*t)/4)*4,y=Math.round((y1+(y2-y1)*t)/4)*4;
  ctx.fillStyle=i%3===0?C.cream:color;
  ctx.fillRect(x,y,i%3===0?7:4,i%3===0?7:4);
 }
 ctx.restore();
}
function drawGun(){
 const gun=weaponForLevel(save.upgrades.gun);
 const mount=shootGunPose(shootCameraOffset,pointer.x,pointer.y,Math.sin(waveT*2)*2);
 // Move with the deck. A cannon offscreen stays offscreen.
 if(mount.y>H+65||mount.y<-65)return;
 ctx.save();ctx.translate(mount.x,mount.y);ctx.rotate(mount.angle);
 ctx.scale(SHOOT_GUN_SCALE,SHOOT_GUN_SCALE);
 ctx.translate(0,recoil*12);
 const barrel=gun.tier===2?19:gun.tier===1?16:11;
 ctx.fillStyle='#071a2b';ctx.fillRect(-barrel-4,-91,barrel*2+8,90);
 ctx.fillStyle=gun.color;ctx.fillRect(-barrel,-83,barrel*2,66);
 ctx.fillStyle=C.cream;ctx.fillRect(-barrel+4,-78,6,56);
 ctx.fillStyle='#173953';ctx.fillRect(-barrel+8,-14,barrel*2-15,39);
 ctx.fillStyle=C.yellow;ctx.fillRect(-13,8,26,22);
 ctx.fillStyle='#09283d';ctx.fillRect(-8,20,16,18);
 if(gun.tier>=1){
  ctx.fillStyle=C.pink;ctx.fillRect(-barrel-5,-67,6,44);
  ctx.fillRect(barrel-1,-67,6,44);
 }
 if(gun.tier===2){
  ctx.fillStyle=C.teal;ctx.fillRect(-barrel-7,-42,8,21);
  ctx.fillRect(barrel-1,-42,8,21);
  ctx.fillStyle=C.cream;ctx.fillRect(-10,-72,20,7);
 }
 if(muzzleFlash>0){
  ctx.globalAlpha=Math.min(1,muzzleFlash/.12);
  ctx.fillStyle=gun.color;ctx.fillRect(-21-gun.tier*5,-108,42+gun.tier*10,19);
  ctx.fillStyle=C.cream;ctx.fillRect(-10,-132-gun.tier*8,20,46+gun.tier*8);
  ctx.fillStyle=C.yellow;ctx.fillRect(-34-gun.tier*6,-102,68+gun.tier*12,7);
  if(gun.tier>=1){
   ctx.fillStyle=C.pink;ctx.fillRect(-5,-148-gun.tier*5,10,17);
   ctx.fillRect(-36,-113,9,19);ctx.fillRect(27,-113,9,19);
  }
 }
 ctx.restore();
}
function shootScene(){
 // World-anchored ocean follows the camera; distant sky layers move more slowly.
 const seaY=airScreenY(SHOOT_WATERLINE);
 const sky=ctx.createLinearGradient(0,0,0,H);
 sky.addColorStop(0,'#485cba');sky.addColorStop(.33,'#8e6bc8');
 sky.addColorStop(.67,'#f18db7');sky.addColorStop(1,'#ffd4ad');
 ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 const sunY=276-shootCameraOffset*.23;
 ctx.fillStyle='#ffbd9f';ctx.fillRect(236,Math.round(sunY)-65,174,130);
 ctx.fillStyle='#fff3ad';
 for(let j=-7;j<=7;j++){
  const width=65-Math.round(j*j*.75);
  ctx.fillRect(322-width,Math.round(sunY)+j*9,width*2,10);
 }
 for(let i=0;i<7;i++){
  const x=((i*123+waveT*(i%2?5:-8)+W*8)%(W+140))-70;
  const y=62+(i%4)*75-shootCameraOffset*(.15+i%3*.045);
  ctx.fillStyle=i%2?'#ffe8c37a':'#ffbee19b';
  ctx.fillRect(Math.round(x),Math.round(y),74,11);
  ctx.fillRect(Math.round(x+14),Math.round(y-10),41,13);
 }
 if(seaY>-110){
  ctx.fillStyle='#423d77';
  for(let x=0;x<W;x+=18){
   const h=38+((x*13)%50);
   ctx.fillRect(x,Math.round(seaY-48-h*.32),18,Math.max(0,H-seaY+48+h*.32));
  }
 }
 if(seaY<H+32){
  ctx.fillStyle='#087fa4';
  ctx.fillRect(0,Math.round(seaY),W,H-seaY+4);
  ctx.fillStyle='#0a668e';
  for(let x=0;x<W;x+=60)ctx.fillRect(x,Math.round(seaY+18+(x%3)*8),36,Math.max(0,H-seaY));
  for(let x=0;x<W;x+=24){
   ctx.fillStyle=x%48?'#aefff0':'#36dcda';
   ctx.fillRect(x,Math.round(seaY)+(Math.floor(waveT*2+x/24)%3)*3,15,4);
  }
  if(seaY>-45&&seaY<H+65)boat(210,seaY-8);
 }
 for(const f of airborne){
  if(f.shot||f.lost||!f.launched)continue;
  ctx.save();ctx.translate(f.x,airScreenY(f.y));ctx.rotate(f.angle);
  fish(0,0,f.kind,f.vx<0?-1:1,1.55,clock*6+f.phase);
  ctx.restore();
 }
 drawShotCelebration();
 for(const trail of shotEffects){
  const originY=airScreenY(trail.y);
  for(const end of trail.targets){
   const endY=airScreenY(end.y);
   // Only the streak enters from the screen edge when the boat is below.
   const start=visibleShotTrailStart(trail.x,originY,end.x,endY,H);
   if(start)drawBulletTrail(start.x,start.y,end.x,endY,trail.life/trail.max,trail.color,trail.tier);
  }
 }
 drawGun();
 const gun=weaponForLevel(save.upgrades.gun);
 topBar('SHOOT THE CATCH',Math.ceil(shootTime)+'s','AMMO ∞');
 roundRect(78,81,264,35,0,'#081e35ec','#2cbebc');
 text(gun.name,204,98,15,gun.color,'center',950,0,235);
 if(combo>1){
  roundRect(121,127,178,36,0,'#06223ced','#ffe35b');
  text('COMBO x'+Math.min(4,combo),210,145,17,C.yellow);
 }
 roundRect(130,171,160,39,7,payoutPulse>0?'#5a3b15f0':'#0b2939ed',payoutPulse>0?'#ffef91':'#c99837');
 drawPixelCoin(149,190,17,0);
 text('$'+roundEarnings,220,190,19+(lowFx?0:payoutPulse*3),payoutPulse>0?'#fff7bd':C.yellow,'center',1000,0,110);
 if(messageTimer>0&&combo<=1){
  roundRect(80,131,260,34,0,'#061d2ce5');
  text(message,210,147,12,C.cream,'center',900);
 }
 const px=Math.round(pointer.x/4)*4,py=Math.round(pointer.y/4)*4;
 ctx.strokeStyle='#fff6cd';ctx.lineWidth=3;ctx.strokeRect(px-12,py-12,24,24);
 ctx.fillStyle='#fff6cd';ctx.fillRect(px-23,py-2,8,4);ctx.fillRect(px+15,py-2,8,4);
 ctx.fillRect(px-2,py-23,4,8);ctx.fillRect(px-2,py+15,4,8);
 bottomHint('TAP FAST • FISH CAN SPLASH DOWN');
 button('II',362,124,42,37,()=>pauseGame('MANUAL'),C.cream);
}
// Animated title screen: gradient water, layered parallax and playful sea life.
// All effects render UNDER the interface, so bold white text stays clear.
function titleWave(t,y,amplitude,frequency,fill){
 ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,y+Math.sin(t*.55)*amplitude);
 for(let x=18;x<=W+18;x+=18){
  const roll=Math.sin(x*.016*frequency+t*.55+frequency)*amplitude;
  const ripple=Math.sin(x*.055+t*.9+frequency)*amplitude*.24;
  ctx.lineTo(x,y+roll+ripple);
 }
 ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=fill;ctx.fill();
}
function titleBackdrop(t){
 const motion=lowFx?0:t;
 const sky=ctx.createLinearGradient(0,0,0,H);
 sky.addColorStop(0,'#071b34');
 sky.addColorStop(.27,'#124c70');
 sky.addColorStop(.48,'#126584');
 sky.addColorStop(.73,'#0b4465');
 sky.addColorStop(1,'#061d38');
 ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 // A cool glow draws the eye to the illustrated logo, not the background.
 const bloom=ctx.createRadialGradient(210,193,20,210,193,285);
 bloom.addColorStop(0,'rgba(68,234,232,0.27)');
 bloom.addColorStop(.57,'rgba(42,156,192,0.10)');
 bloom.addColorStop(1,'rgba(15,69,117,0)');
 ctx.fillStyle=bloom;ctx.fillRect(0,0,W,490);
 const stars=lowFx?11:22;
 for(let i=0;i<stars;i++){
  const x=(i*97+31)%W,y=(i*71+29)%305;
  const shimmer=lowFx?.24:(.23+.15*Math.sin(motion*.95+i*2.8));
  ctx.fillStyle='rgba(207,253,254,'+shimmer.toFixed(3)+')';
  ctx.fillRect(x,y,i%6===0?3:2,i%6===0?3:2);
 }
 // Gently animated sunbeams under the fish and menu cards.
 ctx.save();ctx.beginPath();ctx.rect(0,300,W,380);ctx.clip();
 for(let i=0;i<3;i++){
  const x=39+i*168+Math.sin(motion*.22+i)*9;
  const ray=ctx.createLinearGradient(0,320,0,690);
  ray.addColorStop(0,'rgba(137,255,245,0.09)');
  ray.addColorStop(1,'rgba(137,255,245,0)');
  ctx.fillStyle=ray;ctx.beginPath();
  ctx.moveTo(x-13,318);ctx.lineTo(x+28,318);
  ctx.lineTo(x+132,690);ctx.lineTo(x+4,690);
  ctx.closePath();ctx.fill();
 }
 ctx.restore();
 titleWave(motion,323,7,1.1,'rgba(42,191,207,0.30)');
 titleWave(motion*.75,345,11,1.55,'rgba(24,110,150,0.40)');
 titleWave(motion*.42,558,19,1.25,'rgba(9,60,90,0.46)');
 ctx.save();ctx.globalAlpha=lowFx?.16:.25;
 ctx.strokeStyle='#8af1e8';ctx.lineWidth=2;
 for(let i=0;i<6;i++){
  const x=(i*87+Math.sin(motion*.4+i)*12+15)%W;
  const y=378+i*39+Math.sin(motion*.52+i)*9;
  ctx.beginPath();ctx.moveTo(x-13,y);ctx.quadraticCurveTo(x,y+7,x+27,y-2);ctx.stroke();
 }
 ctx.restore();
 // Edge plants and a subdued vignette frame the central interactive column.
 ctx.save();ctx.globalAlpha=.42;
 for(let i=0;i<8;i++){
  const x=i<4?6+i*17:W-65+(i-4)*17;
  const length=46+(i%4)*23;
  ctx.fillStyle=i%2?'#0e6670':'#174e64';
  for(let j=0;j<length;j+=15){
   const offset=Math.round(Math.sin(motion*.55+i*.9+j*.028)*4);
   ctx.fillRect(x+offset,H-j-15,5,16);
   if(j>0)ctx.fillRect(x+offset+(i%2?4:-9),H-j-9,12,5);
  }
 }
 ctx.restore();
 const vignette=ctx.createRadialGradient(W*.5,H*.43,W*.18,W*.5,H*.5,H*.9);
 vignette.addColorStop(0,'rgba(3,13,30,0)');
 vignette.addColorStop(1,'rgba(2,12,28,0.35)');
 ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
}
function titleSeaLife(t){
 const motion=lowFx?0:t;
 const swimmers=[
  {kind:6,y:388,scale:.9,rate:15,offset:40,dir:1},
  {kind:3,y:462,scale:1.1,rate:12,offset:276,dir:-1},
  {kind:1,y:557,scale:.95,rate:21,offset:110,dir:1},
  {kind:13,y:614,scale:.60,rate:16,offset:340,dir:-1},
 ];
 for(const s of swimmers){
  const travel=(motion*s.rate+s.offset)%(W+160);
  const x=s.dir===1?-80+travel:W+80-travel;
  const y=s.y+Math.sin(motion*.7+s.offset)*10;
  ctx.save();ctx.globalAlpha=s.kind===13?.73:.61;
  fish(x,y,s.kind,s.dir,s.scale,motion*2+s.offset);
  ctx.restore();
 }
 ctx.fillStyle='rgba(135,219,225,0.22)';
 for(let i=0;i<9;i++){
  const x=((i*25+motion*10+W*2)%(W+70))-35;
  const y=516+Math.sin(i*.72+motion*.65)*13;
  ctx.fillRect(x,y,9,4);ctx.fillRect(x-4,y+1,4,2);
 }
 for(let i=0;i<(lowFx?9:20);i++){
  const x=18+((i*79)%383)+Math.sin(motion*.37+i)*8;
  const lift=((motion*(5+i%5*2)+i*43)%420);
  const y=H-18-lift,size=i%6===0?7:i%3===0?5:3;
  ctx.save();ctx.globalAlpha=i%4===0?.32:.18;
  ctx.strokeStyle='#ccfbff';ctx.lineWidth=1.5;
  ctx.strokeRect(Math.round(x),Math.round(y),size,size);
  ctx.restore();
 }
}
function titleActionGlow(){ /* Primary buttons no longer have a rectangular halo. */ }
function menu(){
 const t=lowFx?0:clock;
 titleBackdrop(t);titleSeaLife(t);
 const seaY=438+(lowFx?0:Math.sin(t*1.15)*4);
 ctx.save();
 const glow=ctx.createRadialGradient(210,seaY-95,18,210,seaY-95,230);
 glow.addColorStop(0,'#65ffe139');glow.addColorStop(1,'#65ffe100');
 ctx.fillStyle=glow;ctx.fillRect(0,205,W,370);ctx.restore();
 const bob=lowFx?0:Math.sin(t*1.1)*3;
 if(titleLogo.complete&&titleLogo.naturalWidth){
  const width=Math.min(330,188*titleLogo.naturalWidth/titleLogo.naturalHeight);
  const height=width*titleLogo.naturalHeight/titleLogo.naturalWidth;
  ctx.drawImage(titleLogo,(W-width)/2,64+bob,width,height);
 }else{ text('REEL',210,128+bob,65,C.white);text('TROUBLE!',210,195+bob,49,C.white); }
 ctx.save();ctx.translate(210,seaY);ctx.scale(2.1,2.1);ctx.translate(-210,-seaY);
 boat(210,seaY);ctx.restore();
 const progress=collectionProgress(save.collection),job=currentJob();
 pixelPlate(18,19,155,43,'#092c41','#49d8cc',7);
 text('$'+save.cash,94,41,19,C.yellow,'center',900,0,137);
 // One MORE destination: the old duplicate hamburger is a collection badge.
 pixelPlate(236,19,166,43,'#092c41','#49d8cc',7);
 text(progress.discovered+'/'+progress.total+' FISH',319,41,13,C.white,'center',900,0,150);
 pixelPlate(28,486,364,50,'#082b40df','#3e9e9b',7,false);
 text(job.label+'  '+job.title,210,500,13,C.yellow,'center',900,0,332);
 text(job.task+'  '+job.progress+'/'+job.goal,210,521,13,C.white,'center',900,0,338);
 titleActionGlow(t,50,544,320,83);
 button('CAST LINE',50,544,320,83,beginCast,C.yellow,'DIVE INTO THE DEEP');
 button('GEAR SHOP',50,649,210,59,()=>{enterShop();},C.teal);
 button('MORE',272,649,98,59,()=>{state='more';age=0;},C.cream);
 text('BEST $'+save.best+'  •  '+progress.discovered+'/'+progress.total+' FISH FOUND',210,743,13,C.white,'center',900,0,372);
}
function cabinRow(index,title,subtitle,y,action,accent=C.teal){
 const x=35,w=350,h=94;
 pixelPlate(x,y,w,h,'#0d2d44','#477c88',9);
 pixelPlate(x+13,y+16,48,48,'#103d51',accent,5,false);
 text(index,x+37,y+40,18,C.white,'center',900,0,40);
 text(title,x+78,y+34,19,C.white,'left',900,0,255);
 storyCopy(subtitle,x+209,y+67,248,14,'#c0e2e3',18,1);
 hits.push({x,y,w,h,action});
}
function moreMenu(){
 titleBackdrop(lowFx?0:clock*.35);
 text('CAPTAIN\'S CABIN',210,94,30,C.white,'center',900,0,385);
 text('YOUR NEXT ADVENTURE STARTS HERE',210,130,12,C.yellow,'center',900,0,380);
 ctx.save();ctx.translate(295,189);ctx.scale(.65,.65);ctx.translate(-210,-438);
 boat(210,438);ctx.restore();
 cabinRow('01','EXPEDITIONS','Bounties and story missions',211,openExpeditions,C.yellow);
 cabinRow('02','FISH BOOK','Discoveries and badges',316,()=>openCollection('fish'),C.teal);
 cabinRow('03','SETTINGS','Controls, sound and display',421,()=>{state='settings';age=0;},C.pink);
 if(!isInstalled())button('INSTALL APP',56,539,308,60,installGame,C.cream);
 else button('APP INSTALLED',56,539,308,60,()=>{state='settings';age=0;},C.cream);
 text('PROGRESS SAVES AUTOMATICALLY',210,637,12,C.white,'center',900,0,360);
 button('← BACK TO FISHING',52,679,316,68,()=>{state='menu';age=0;},C.yellow);
}
function results(){
 titleBackdrop(clock*.38);
 // Small celebratory glints sit behind the reward card, never over the text.
 const motion=lowFx?0:clock;
 for(let i=0;i<(lowFx?7:18);i++){
  const x=(i*71+37)%W,y=116+((i*97+motion*(i%3+1)*11)%490);
  ctx.save();ctx.globalAlpha=.22+.17*(Math.sin(motion*2+i)+1)*.5;
  ctx.fillStyle=i%3===0?C.yellow:C.teal;ctx.fillRect(x,y,i%4===0?5:3,i%4===0?5:3);
  ctx.restore();
 }
 arcadePill('RUN COMPLETE',115,51,190,C.yellow);
 text('NICE CATCH!',210,123,43,C.white,'center',1000,-.8);
 text('BACK ON DRY LAND',210,167,17,C.white,'center',900,0,343);
 if(missionsCompletedThisCast)text('MISSION CLEARED +$'+missionRewardThisCast,210,195,17,C.yellow,'center',900,0,354);
 else if(discoveriesThisCast)text('OCEAN SECRETS FOUND: '+discoveriesThisCast,210,195,17,C.yellow,'center',900,0,354);
 else if(newFishThisCast||newBadgesThisCast)
  text('NEW: '+newFishThisCast+' FISH • '+newBadgesThisCast+' BADGES',210,195,16,C.white,'center',900,0,354);
 pixelPlate(35,217,350,291,'#102c42','#ffcf62',12);
 text('YOUR ARCADE PAYOUT',210,259,16,C.white,'center',900,0,310);
 const reveal=lowFx?1:easeOutCubic(Math.min(1,age/.95));
 const counted=Math.round(roundEarnings*reveal);
 text('+,'center',1000,-3,320);
 for(let i=0;i<8;i++){
  const x=210+(i%2?-1:1)*(85+(i%4)*23);
  const bounce=lowFx?0:Math.sin(Math.min(1,age/1.2)*Math.PI)*11;
  drawPixelCoin(x,310+(i%3)*29-bounce,9+(i%3)*2,lowFx?0:clock*8+i,Math.min(1,age*3));
 }
 arcadeRule(64,373,356,C.yellow);
 text('HITS / SHOTS',77,405,16,C.white,'left',900,0,185);
 text(landed+' / '+fired,343,405,18,C.white,'right',900,0,75);
 text('BEST COMBO',77,439,16,C.white,'left',900,0,185);
 text('x'+Math.max(1,bestRoundCombo),343,439,18,C.white,'right',900,0,75);
 text('DEEPEST DIVE',77,479,16,C.white,'left',900,0,185);
 text(meter(deepestCast),343,479,18,C.white,'right',900,0,75);
 if(escaped&&!newFishThisCast&&!newBadgesThisCast&&!missionsCompletedThisCast)text(escaped+' FISH RETURNED TO SEA',210,195,16,C.white,'center',900);
 pixelPlate(91,508,238,43,'#10364a','#47e5d7',7);
 text('WALLET  $'+save.cash,210,530,19,C.white,'center',900,0,219);
 titleActionGlow(clock,64,567,292,62);
 button('FISH AGAIN',64,567,292,62,beginCast,C.yellow,'GO FOR A BIGGER HAUL');
 button('GEAR SHOP',25,647,178,53,()=>{enterShop();},C.cream);
 button('MISSIONS',217,647,178,53,openExpeditions,C.teal);
 button('MAIN MENU',120,715,180,40,()=>{state='menu';age=0;},'#5796a6');
}

+counted,210,327,60,C.yellow,'center',1000,-3,320);
 for(let i=0;i<8;i++){
  const x=210+(i%2?-1:1)*(85+(i%4)*23);
  const bounce=lowFx?0:Math.sin(Math.min(1,age/1.2)*Math.PI)*11;
  drawPixelCoin(x,310+(i%3)*29-bounce,9+(i%3)*2,lowFx?0:clock*8+i,Math.min(1,age*3));
 }
 arcadeRule(64,373,356,C.yellow);
 text('HITS / SHOTS',77,405,16,C.white,'left',900,0,185);
 text(landed+' / '+fired,343,405,18,C.white,'right',900,0,75);
 text('BEST COMBO',77,439,16,C.white,'left',900,0,185);
 text('x'+Math.max(1,bestRoundCombo),343,439,18,C.white,'right',900,0,75);
 text('DEEPEST DIVE',77,479,16,C.white,'left',900,0,185);
 text(meter(deepestCast),343,479,18,C.white,'right',900,0,75);
 if(escaped&&!newFishThisCast&&!newBadgesThisCast&&!missionsCompletedThisCast)text(escaped+' FISH RETURNED TO SEA',210,195,16,C.white,'center',900);
 neonPanel(91,508,238,43,'#47e5d7',13);
 text('WALLET  $'+save.cash,210,530,19,C.white,'center',900,0,219);
 titleActionGlow(clock,64,567,292,62);
 button('FISH AGAIN',64,567,292,62,beginCast,C.yellow,'GO FOR A BIGGER HAUL');
 button('GEAR SHOP',25,647,178,53,()=>{enterShop();},C.cream);
 button('MISSIONS',217,647,178,53,openExpeditions,C.teal);
 button('MAIN MENU',120,715,180,40,()=>{state='menu';age=0;},'#5796a6');
}

let skipperLine='',skipperLineTime=0,skipperVisits=0,skipperChats=0;
let shopMood='neutral',shopMoodUntil=0,shopInspect=null;
const SHOP_SECRETS_KEY='reel-trouble-shop-secrets-v1';
function loadShopSecretsSeen(){try{
 const raw=JSON.parse(localStorage.getItem(SHOP_SECRETS_KEY)||'[]');
 return Array.isArray(raw)?raw.filter(id=>SHOP_SECRETS.some(s=>s.id===id)):[];
 }catch(_){return [];}}
let shopSecretsSeen=loadShopSecretsSeen();
function saveShopSecretsSeen(){try{localStorage.setItem(SHOP_SECRETS_KEY,JSON.stringify(shopSecretsSeen));}catch(_){}}

// 'nets' is retained as the saved-game key; these upgrades are fishing hooks.
const SHOP_TABS=[['lines','REELS'],['nets','HOOKS'],['guns','WEAPONS'],['gadgets','SUPPLIES']];
function skipperSpeak(line,mood='neutral'){
 skipperLine=line;skipperLineTime=clock;
 if(mood!=='neutral'){shopMood=mood;shopMoodUntil=clock+2.8;}
}
function enterShop(){
 state='shop';shopTab='lines';shopView='counter';shopInspect=null;age=0;skipperVisits++;
 shopScrollTo(save.upgrades.line*SHOP_ROW-SHOP_ROW);
 const find=nextShopSecret(save,shopSecretsSeen);
 skipperSpeak(find?"Oi! Something odd washed up. Tap the find by the counter.":skipperGreeting(),find?'curious':'neutral');
}
function skipperGreeting(){
 const dives=save.total||0,deep=save.best||0;
 if(save.upgrades.light===0&&save.upgrades.line>=2)return "Past the reef? Buy a lamp. The deep don't forgive.";
 if(dives>5000)return "Back again, legend? Something down there remembers ye.";
 if(dives>500)return "You're hauling serious coin. But the trench takes its toll.";
 return skipperVisits===1?"Welcome aboard! Name's Skipper. Don't touch the eel.":currentJob().story;
}
function skipperReply(category,success){
 shopMood=success?'excited':'grumpy';shopMoodUntil=clock+3;
 if(!success){
  if(category==='charge'&&save.charges>=3)skipperSpeak("Three charges is plenty! I'm running a tackle shop, not a war.");
  else if(category==='light'&&save.upgrades.light>=LIGHT_MAXLVL)skipperSpeak("Even a lighthouse would be jealous of that kit.");
  else if(category==='line'&&save.upgrades.line>=LINE_MAXLVL)skipperSpeak("Any deeper and you'll be fishing in tomorrow.");
  else if(category==='net'&&save.upgrades.net>=MAXLVL)skipperSpeak("That's a mighty wide hook. Mind the door on yer way out.");
  else if(category==='gun'&&save.upgrades.gun>=MAXLVL)skipperSpeak("You've already got my finest. The paperwork was a nightmare.");
  else skipperSpeak("Short on coin? The sea owes ye a few more hauls.");
  return;
 }
 const lines={
  line:["More line? Keep going. The seabed's got secrets.","That'll take ye deeper. Just mind what follows.","Good rope. Bad decisions. My favourite pair."],
  net:["Better hooks, bigger hauls. That's my kind of arithmetic.","Mind what ye snag with that grapnel.","That's a hook built for sea monsters."],
  gun:["She kicks like a mule. Point away from me beard.","Unlimited shots. Limited common sense.","You didn't get that from me. Understood?"],
  light:["Dark water hides things, matey.","Let there be light! Or at least fewer surprises.","Ye can see it now. Trouble is, it can see ye."],
  charge:["One bang to save your skin. Use it wisely.","The fish won't appreciate that. Nor will the harbourmaster.","Explosives? I never sold ye explosives."]
 };
 const arr=lines[category]||lines.line;
 skipperSpeak(arr[(save.upgrades.line+save.upgrades.net+save.upgrades.gun+save.charges)%arr.length]);
}
function shopInk(value,x,y,size=18,color='#f8e5bd',align='left',width=380){
 // The font is 400 weight. Ellipsise when necessary; never crush pixel glyphs.
 ctx.save();ctx.textAlign=align;ctx.textBaseline='middle';
 const fontSize=Math.max(12,size);
 ctx.font='400 '+fontSize+'px "Press Start 2P",monospace';
 ctx.fillStyle=color;
 ctx.lineJoin='round';
 if(color==='#f8e5bd'||color==='#ffffff'){ctx.shadowColor='#251612';ctx.shadowBlur=2;ctx.shadowOffsetY=1;}
 let label=String(value);
 if(ctx.measureText(label).width>width){
  while(label.length>1&&ctx.measureText(label+'…').width>width)label=label.slice(0,-1);
  label=label.trimEnd()+'…';
 }
 ctx.fillText(label,x,y);ctx.restore();
}
function shopWrap(message,maxWidth,size=16,maxLines=2){
 // Never cram an overflowing line into a fixed-height paper dialogue card.
 ctx.save();ctx.font='400 '+size+'px "Press Start 2P",monospace';
 const rows=[''];
 for(const word of String(message).split(/\s+/)){
  const index=rows.length-1,next=(rows[index]+' '+word).trim();
  if(ctx.measureText(next).width>maxWidth&&rows[index]){
   if(rows.length===maxLines){rows[index]+=' '+word;break;}
   rows.push(word);
  }else rows[index]=next;
 }
 // Last line may contain more words: shorten with an ellipsis, not horizontal scaling.
 const last=rows.length-1;
 if(ctx.measureText(rows[last]).width>maxWidth){
  while(rows[last].length>1&&ctx.measureText(rows[last]+'…').width>maxWidth)rows[last]=rows[last].slice(0,-1);
  rows[last]=rows[last].trimEnd()+'…';
 }
 ctx.restore();return rows;
}
function shopButton(label,x,y,w,h,action,affordable=true){
 const active=affordable;
 pixelPlate(x,y,w,h,active?'#f0cb7f':'#af9e89',active?'#ffe5ab':'#cabca6',7);
 ctx.fillStyle=active?'#a26b32':'#86756a';ctx.fillRect(x+9,y+8,3,h-16);
 shopInk(label,x+w/2,y+h/2,15,active?'#302219':'#51463e','center',w-27);
 hits.push({x,y,w,h,action});
}
function skipperPortrait(x,y){
 paintSkipper(ctx,clock,x,y,{
  mood:clock<shopMoodUntil?shopMood:'neutral',
  talking:clock-skipperLineTime<2.8,lowFx
 });
}
function shopInterior(){
 paintShopBackdrop(ctx);
 ctx.fillStyle='#100f17a6';ctx.fillRect(0,0,W,H);
 roundRect(12,11,396,76,6,'#292022ee','#b88955',2);
 shopInk("SKIPPER'S",24,37,23,'#fff0c2','left',231);
 shopInk('BAIT & TACKLE',24,66,14,'#f0c88d','left',241);
 roundRect(274,30,122,39,6,'#f0ddb0');
 shopInk('$'+save.cash,335,50,19,'#3c2c22','center',108);
}
function skipperBubble(){
 roundRect(13,315,394,109,8,'#f3e0bb','#8d623e',2);
 ctx.fillStyle='#a66d3c';ctx.fillRect(22,326,3,85);
 shopInk('SKIPPER SAYS',34,335,13,'#855633','left',360);
 const rows=shopWrap(skipperLine||skipperGreeting(),359,15,3);
 for(let i=0;i<rows.length;i++)shopInk(rows[i],34,363+i*23,15,'#372920','left',357);
}
function shopJobBoard(){
 // Kept as a separate detail sheet rather than a permanent shop HUD panel.
 const job=currentJob();
 shopInk("TODAY'S BOUNTY",210,183,19,'#3b2b20','center',311);
 shopInk(job.title,210,250,23,'#3b2b20','center',311);
 shopInk(job.progress+' / '+job.goal+' COMPLETE',210,326,18,'#6a4b35','center',311);
 shopInk('REWARD $'+job.reward,210,387,21,'#557448','center',311);
 const lines=shopWrap(job.story,304,15,3);
 for(let i=0;i<lines.length;i++)shopInk(lines[i],210,466+i*23,15,'#6a4b35','center',303);
}
function selectShopTab(id){
 shopTab=id;
 const key=id==='lines'?'line':id==='nets'?'net':id==='guns'?'gun':'light';
 shopScrollTo(save.upgrades[key]*SHOP_ROW-SHOP_ROW);
}
function shopTabButton(id,label,i){
 const x=13+i*100,y=167,w=94,h=49,selected=shopTab===id;
 // Keep the category names, but abbreviate tabs to fit the chunky display font.
 const shortLabel=id==='guns'?'GUNS':id==='gadgets'?'TOOLS':label;
 pixelPlate(x,y,w,h,selected?'#f4d69d':'#302b30',selected?'#ffe9af':'#8b6c57',6,false);
 shopInk(shortLabel,x+w/2,y+25,12,selected?'#3a2920':'#f1e3ca','center',w-16);
 if(selected){ctx.fillStyle='#8e6033';ctx.fillRect(x+18,y+42,w-36,3);}
 hits.push({x,y,w,h,action:()=>selectShopTab(id)});
}
const SHOP_CATEGORY_DESCRIPTIONS={
 lines:'DIVE DEEPER',nets:'CATCH MORE',guns:'BIG FIREPOWER',gadgets:'LIGHT & GEAR'
};
function shopCategoryCard(id,label,x,y){
 const type=id==='lines'?'line':id==='nets'?'net':id==='guns'?'gun':'light';
 const max=type==='line'?LINE_MAXLVL:type==='light'?LIGHT_MAXLVL:MAXLVL;
 const level=save.upgrades[type];
 pixelPlate(x,y,192,89,'#f0ddb8','#9a754a',7);
 ctx.fillStyle='#b48c5b';ctx.fillRect(x+79,y+13,2,61);
 paintShopItem(ctx,type,x+45,y+45,.5,level,clock,lowFx);
 shopInk(label,x+89,y+25,16,'#34271e','left',95);
 shopInk(SHOP_CATEGORY_DESCRIPTIONS[id],x+89,y+47,11,'#80614a','left',95);
 shopInk((level+1)+' / '+(max+1)+'  ›',x+89,y+69,12,'#477157','left',95);
 hits.push({x,y,w:192,h:89,action:()=>{
  shopView='catalog';selectShopTab(id);
 }});
}
function shopCounter(){
 // A character-led landing screen. Purchases, bounty and curiosities are
 // separate flows; no catalogue rows or overlapping overlays appear here.
 shopInterior();
 skipperPortrait(121,200);
 shopInk('OLD SKIPPER',285,165,19,'#ffe4aa','center',204);
 shopInk('TAP TO CHAT',285,194,13,'#ffe4aa','center',202);
 hits.push({x:12,y:91,w:396,h:216,action:()=>{
  const lines=[
   "My suppliers ask where I get this stuff. I ask 'em not to ask.",
   "Deep enough and the water starts keeping secrets.",
   "The bait's fresh. The bookkeeping, less so.",
   "I once caught a fish so big it bought the boat.",
   "If it starts glowing, bring it back in one piece.",
   currentJob().story
  ];
  skipperSpeak(lines[skipperChats++%lines.length],'curious');
 }});
 skipperBubble();
 shopInk('WHAT ARE YE AFTER?',18,444,18,'#fff0c2','left',381);
 shopCategoryCard('lines','REELS',13,460);
 shopCategoryCard('nets','HOOKS',215,460);
 shopCategoryCard('guns','WEAPONS',13,558);
 shopCategoryCard('gadgets','SUPPLIES',215,558);
 shopButton('BOUNTY',13,660,192,43,()=>{shopInspect={kind:'bounty',openedAt:clock};});
 shopStoryButton();
 shopButton('← BACK TO WATER',13,715,394,49,()=>{
  state=castNumber&&save.total?'results':'menu';age=0;
 });
}
function shopCatalogue(){
 shopInterior();
 shopButton('← SHOP COUNTER',13,101,394,48,()=>{shopView='counter';});
 for(let i=0;i<SHOP_TABS.length;i++)shopTabButton(...SHOP_TABS[i],i);
 const title=SHOP_TABS.find(([id])=>id===shopTab)?.[1]||'GEAR';
 shopInk(title,19,240,20,'#fff0c2','left',227);
 shopInk('SCROLL • INSPECT',394,242,11,'#f0c88d','right',177);
 shopItemCard();
 shopButton('← BACK TO WATER',13,717,394,48,()=>{
  state=castNumber&&save.total?'results':'menu';age=0;
 });
}
const NET_NAMES=['BARE HOOK','BARBED HOOK','TWIN PRONG','TRIPLE RIG','MAGNET HOOK','ABYSS GRAPNEL'];
const LAMP_NAMES=['NO LANTERN','GLOW LANTERN','DEEP BEAM','RIFT LAMP','BLACKGLASS BEAM','STARLESS LAMP'];
const LAMP_COSTS=[180,420,900,1800,3700];
const SHOP_ROW=104;
const SHOP_LIST_TOP=266,SHOP_LIST_BOTTOM=705;
function shopListBounds(){return [SHOP_LIST_TOP,SHOP_LIST_BOTTOM];}
function shopTierCount(){return shopTab==='lines'?LINE_MAXLVL+1:shopTab==='gadgets'?LIGHT_MAXLVL+2:MAXLVL+1;}
function shopScrollTo(value){
 const [top,bottom]=shopListBounds();
 shopScroll[shopTab]=clamp(value,0,Math.max(0,shopTierCount()*SHOP_ROW-(bottom-top)));
}
function shopTierMeta(type,tier){
 if(type==='line')return [LINE_NAMES[tier],meter(maxLineDepth(tier))+' MAX DEPTH'];
 if(type==='net')return [NET_NAMES[tier],(24+tier*13)+'px CATCH RADIUS'];
 if(type==='gun')return [GUN_NAMES[tier],weaponForLevel(tier).maxHits+' TARGETS / AMMO ∞'];
 return [LAMP_NAMES[tier],'LIGHT POWER '+tier+' / '+LIGHT_MAXLVL];
}
function shopTierList(type,top,bottom){
 const level=save.upgrades[type],max=type==='line'?LINE_MAXLVL:type==='light'?LIGHT_MAXLVL:MAXLVL;
 const offset=shopScroll[shopTab],height=bottom-top;
 const all=shopTab==='gadgets'?Array.from({length:LIGHT_MAXLVL+2},(_,i)=>i===0?
  {type:'charge',tier:0}: {type:'light',tier:i-1}):
  Array.from({length:max+1},(_,tier)=>({type,tier}));
 ctx.save();ctx.beginPath();ctx.rect(17,top,376,height);ctx.clip();
 for(let index=Math.max(0,Math.floor(offset/SHOP_ROW));index<all.length&&index<=Math.ceil((offset+height)/SHOP_ROW);index++){
  const row=all[index],tier=row.tier,rowType=row.type,lv=rowType==='charge'?save.charges:save.upgrades[rowType];
  const y=top+index*SHOP_ROW-offset,owned=rowType!=='charge'&&tier<lv,current=rowType==='charge'||tier===lv;
  const [name,detail]=rowType==='charge'?['BLAST CHARGE','SKIP ONE COLLISION']:shopTierMeta(rowType,tier);
  // Current row shows the cost of the next upgrade; future rows show
  // the price to unlock that tier, rather than an undefined final-tier price.
  const priceTier=current?tier:Math.max(0,tier-1);
  const cost=rowType==='charge'?110:rowType==='light'?LAMP_COSTS[priceTier]:
   Math.round(({line:65,net:90,gun:85}[rowType])*Math.pow(rowType==='line'?1.52:1.75,priceTier));
  const affordable=save.cash>=cost;
  pixelPlate(21,y+4,368,96,current?'#f6e4bd':owned?'#dce7d8':'#c9beb0',current?'#ffda87':owned?'#74a58c':'#8e8278',5,false);
  ctx.fillStyle=current?'#d8a65b':owned?'#5d9d85':'#8e8278';ctx.fillRect(21,y+15,4,74);
  paintShopItem(ctx,rowType,63,y+52,.58,rowType==='charge'?0:tier,clock,lowFx);
  shopInk(name,109,y+28,15,'#342720','left',261);
  shopInk(detail,109,y+54,12,'#785d48','left',265);
  const status=rowType==='charge'?save.charges+'/3 IN BAG':owned?'OWNED':current?'EQUIPPED':'LOCKED';
  shopInk(status,109,y+80,11,current?'#44775b':'#685c50','left',140);
  let price=owned?'':rowType==='charge'&&save.charges>=3?'MAXED':
   rowType!=='charge'&&current&&tier===max?'MAXED':
   '$'+cost;
  shopInk(price||'✓',376,y+80,13,'#5d4938','right',122);
  const hitY=Math.max(top,y+4),hitBottom=Math.min(bottom,y+100);
  if(hitBottom>hitY)hits.push({x:21,y:hitY,w:368,h:hitBottom-hitY,
   action:()=>openShopInspect(rowType,rowType==='charge'?null:tier)});
 }
 ctx.restore();
 const total=all.length*SHOP_ROW,thumb=Math.min(height,Math.max(35,height*height/total));
 const maxScroll=Math.max(1,total-height);
 ctx.fillStyle='#594639';ctx.fillRect(398,top,5,height);
 ctx.fillStyle='#f6d38c';ctx.fillRect(397,top+(height-thumb)*offset/maxScroll,7,thumb);
}
function shopItemCard(){
 const type=shopTab==='lines'?'line':shopTab==='nets'?'net':'gun';
 roundRect(12,257,396,454,8,'#241e1ddd','#95764d',1);
 shopTierList(shopTab==='gadgets'?'light':type,SHOP_LIST_TOP,SHOP_LIST_BOTTOM);
}
function shopSupplies(){
 // Supplies use the same spacious scrollable cards: charge followed by lamps.
 shopItemCard();
}
function openShopInspect(type,tier=null){
 shopInspect={kind:'gear',type,tier,openedAt:clock};
 skipperSpeak({
  line:"Feel that spool. It wants to see what's below.",
  net:"Wider than my last catch. And he was a liar.",
  gun:"Look closely. It's got all the safety features I could afford.",
  light:"Don't stare into it. Your eyes aren't under warranty.",
  charge:"Careful! That's the end that goes bang."
 }[type]||"Go on, take a closer look.",'curious');
}
function shopStoryButton(){
 const unseen=nextShopSecret(save,shopSecretsSeen),unlocked=unlockedShopSecrets(save);
 const selected=unseen||unlocked[unlocked.length-1];
 shopButton(unseen?'NEW SECRET!':'SECRETS',215,660,192,43,()=>{
  if(!selected){skipperSpeak("No curios today. Dive deeper and see what washes in.",'curious');return;}
  shopInspect={kind:'secret',id:selected.id,openedAt:clock};
  if(!shopSecretsSeen.includes(selected.id)){
   shopSecretsSeen.push(selected.id);saveShopSecretsSeen();
  }
  skipperSpeak(selected.hint,'curious');
 });
}
function inspectGearInfo(type){
 const u=save.upgrades;
 const lvl=type==='charge'?save.charges:u[type]||0;
 const limit=type==='line'?LINE_MAXLVL:type==='light'?LIGHT_MAXLVL:type==='charge'?3:MAXLVL;
 const names=type==='line'?LINE_NAMES:type==='gun'?GUN_NAMES:
 type==='net'?NET_NAMES:
 type==='light'?['NO LANTERN','GLOW LANTERN','DEEP BEAM','RIFT LAMP','BLACKGLASS BEAM','STARLESS LAMP']:
 ['BLAST CHARGE','BLAST CHARGE','BLAST CHARGE','BLAST CHARGE'];
 const cost=type==='charge'?110:type==='light'?[180,420,900,1800,3700][lvl]||0:upgradeConfig(type).cost;
 const description={
  line:"Longer line explores new depths and strange regions.",
  net:"Each new hook rig catches fish across a wider area.",
  gun:"Each gun has unlimited ammo and its own spread.",
  light:"Your lantern cuts through the deepest darkness.",
  charge:"One charge ignores a fish collision on the descent."
 }[type];
 const benefit=type==='line'?'REACH '+meter(maxLineDepth(lvl)):
 type==='net'?'CATCH RADIUS '+(24+13*lvl)+'px':
 type==='gun'?weaponForLevel(lvl).maxHits+' FISH PER SHOT':
 type==='light'?'LIGHT LEVEL '+lvl+' / '+LIGHT_MAXLVL:'CHARGES '+lvl+' / 3';
 return {type,lvl,full:lvl>=limit,cost,name:names[lvl]||type.toUpperCase(),description,benefit};
}
function buyInspectedGear(type){
 if(type==='charge'){
  const before=save.charges;buyCharge();skipperReply('charge',save.charges>before);
 }else if(type==='light')buyLight();
 else purchase(type);
}
function shopInspectOverlay(){
 const item=shopInspect;if(!item)return;
 // The detail sheet, not the catalogue, owns purchasing actions.
 hits.length=0;
 ctx.save();ctx.fillStyle='#071321e8';ctx.fillRect(0,0,W,H);
 pixelPlate(18,72,384,635,'#f3e3c3','#c49a61',11);
 const secret=item.kind==='secret'?SHOP_SECRETS.find(s=>s.id===item.id):null;
 const bounty=item.kind==='bounty';
 const gear=!secret&&!bounty?inspectGearInfo(item.type):null;
 const selectedTier=gear?(item.tier??gear.lvl):0;
 const owned=gear&&item.type!=='charge'&&selectedTier<gear.lvl;
 const locked=gear&&item.type!=='charge'&&selectedTier>gear.lvl;
 if(bounty){
  shopInk('SKIPPER\'S LOG',210,117,20,'#735033','center',340);
  shopJobBoard();
  shopButton('← BACK TO SHOP',49,627,322,57,()=>{shopInspect=null;});
 }else{
  if(gear&&item.tier!==null){
   gear.name=shopTierMeta(item.type,item.tier)[0];
   gear.benefit=shopTierMeta(item.type,item.tier)[1];
  }
  shopInk(secret?'A CURIOUS FIND':'FROM THE TACKLE CASE',210,106,14,'#795638','center',335);
  shopInk(secret?secret.title:gear.name,210,144,23,'#30231b','center',335);
  roundRect(49,169,322,268,7,'#402e2b','#a78058',2);
  paintShopItem(ctx,secret?secret.item:gear.type,210,301,2.08,
   gear?selectedTier:0,clock,lowFx);
  if(secret){
   const rows=shopWrap(secret.story,312,16,3);
   for(let i=0;i<rows.length;i++)shopInk(rows[i],210,488+i*26,16,'#59412d','center',316);
   shopInk('ADDED TO YOUR LOGBOOK',210,601,14,'#795638','center',330);
   shopButton('← BACK TO SHOP',49,627,322,57,()=>{shopInspect=null;});
  }else{
   shopInk(owned?'OWNED':locked?'LOCKED':gear.full?'MAX LEVEL':'EQUIPPED',210,464,15,'#48715b','center',314);
   shopInk(gear.benefit,210,496,19,'#3d2a20','center',322);
   const rows=shopWrap(gear.description,316,15,2);
   for(let i=0;i<rows.length;i++)shopInk(rows[i],210,532+i*25,15,'#694e39','center',319);
   if(locked)shopInk('BUY THE PREVIOUS UPGRADE FIRST',210,602,13,'#82624a','center',331);
   else if(owned)shopInk('ALREADY IN YOUR COLLECTION',210,602,13,'#82624a','center',331);
   else shopInk(gear.full?'FULLY UPGRADED':'NEXT UPGRADE $'+gear.cost,210,601,15,'#6b4c31','center',326);
   shopButton('← BACK',35,628,140,55,()=>{shopInspect=null;});
   if(!owned){
    const canBuy=!locked&&!gear.full&&save.cash>=gear.cost;
    shopButton(locked?'LOCKED':gear.full?'MAXED':canBuy?'BUY $'+gear.cost:'NEED $'+gear.cost,
     185,628,199,55,()=>{
      if(locked){skipperSpeak('Earn the earlier upgrades first. One step at a time.');return;}
      if(gear.full)return;
      if(save.cash<gear.cost){skipperReply(gear.type,false);return;}
      buyInspectedGear(gear.type);
      // Close on success, so newly owned equipment is obvious in the list.
      shopInspect=null;
     },canBuy);
   }
  }
 }
 ctx.restore();
}
function shop(){
 if(shopView==='counter')shopCounter();
 else shopCatalogue();
 if(shopInspect)shopInspectOverlay();
}
function expeditionBoard(){
 titleBackdrop(lowFx?0:clock*.35);
 const job=currentJob(),status=save.expedition;
 text("SKIPPER'S LOG",210,76,34,C.white,'center',900,0,390);
 text('A MESSAGE FROM THE OLD SALT',210,114,13,C.yellow,'center',900,0,382);
 // Weathered bounty notice: mission progress and dialogue are part of the world.
 pixelPlate(23,150,374,517,'#efdcb5','#aa8050',12);
 pixelPlate(52,172,316,44,'#5e4430','#e0b977',6,false);
 text(job.label,210,194,17,'#fff2cf','center',900,0,288);
 text(job.title,210,255,23,'#30241b','center',900,0,335);
 text(job.task,210,307,16,'#59402a','center',900,0,335);
 text(job.progress+' / '+job.goal,210,361,29,'#31483d','center',950);
 roundRect(58,392,304,14,0,'#7e674a');
 roundRect(61,395,Math.round(298*Math.min(1,job.progress/job.goal)),8,0,'#3d8968');
 text('REWARD  $'+job.reward,210,454,21,'#3f5845','center',900,0,329);
 ctx.fillStyle='#b99b74';ctx.fillRect(53,486,314,2);
 text('A WORD FROM SKIPPER',210,512,14,'#624729','center',900,0,340);
 storyCopy(job.story,210,545,320,16,'#332b25',22,2);
 text('CHAPTER '+Math.min(status.chapter,EXPEDITIONS.length)+' / '+EXPEDITIONS.length,210,609,15,'#59402a','center',900,0,340);
 const recent=EXPEDITIONS[Math.max(0,Math.min(EXPEDITIONS.length-1,status.chapter-1))];
 const next=EXPEDITIONS[Math.min(EXPEDITIONS.length-1,status.chapter+1)];
 text('✓ '+(status.chapter?recent.title:'FIRST MISSION AWAITS'),210,641,12,'#345e48','center',900,0,330);
 text(status.chapter>=EXPEDITIONS.length?'ENDLESS BOUNTIES UNLOCKED':'NEXT: '+next.title,210,686,12,C.white,'center',900,0,370);
 button('← BACK',70,718,280,53,()=>{state=expeditionReturn;age=0;},C.yellow);
}
function bookCard(kind,x,y){
 const entry=save.collection.fish[kind],found=Boolean(entry?.caught),meta=species[kind];
 const width=370,height=99;
 pixelPlate(x,y,width,height,found?'#102f43':'#192c3a',found?'#58cbb5':'#5c7580',6);
 ctx.fillStyle=found?'#e5be61':'#6b7c86';ctx.fillRect(x+6,y+13,5,height-26);
 ctx.save();
 if(!found){ctx.filter='brightness(0)';ctx.globalAlpha=.62;}
 fish(x+64,y+49,kind,1,1.15,clock*1.3);ctx.restore();
 text(found?meta.name:'UNKNOWN SPECIES',x+122,y+24,19,C.white,'left',900,0,232);
 text(found?fishRarity(kind):'NOT DISCOVERED',x+122,y+54,14,found?C.yellow:'#b0c2c8','left',900,0,232);
 text(found?'CAUGHT '+entry.caught:'CATCH TO UNLOCK',x+122,y+81,14,C.white,'left',900,0,232);
 hits.push({x,y,w:width,h:height,action:()=>{selectedFish=kind;state='fishDetail';age=0;}});
}
function collection(){
 ambient(clock);
 text('FISH ENCYCLOPEDIA',210,76,30,C.cream,'center',1000,0,390);
 const p=collectionProgress(save.collection);
 text(p.discovered+'/'+p.total+' SPECIES • '+p.percentage+'% COMPLETE',210,118,17,C.white,'center',900,0,365);
 roundRect(49,138,322,8,0,'#071828');
 roundRect(50,139,Math.max(0,p.percentage*3.2),6,0,C.yellow);
 button('FISH',29,163,175,42,()=>{collectionTab='fish';collectionPage=0;},collectionTab==='fish'?C.yellow:C.cream);
 button('BADGES',216,163,175,42,()=>{collectionTab='badges';collectionPage=0;},collectionTab==='badges'?C.yellow:C.cream);
 const pageSize=4,total=collectionTab==='fish'?species.length:ACHIEVEMENTS.length;
 const pages=Math.ceil(total/pageSize);
 collectionPage=clamp(collectionPage,0,pages-1);
 if(collectionTab==='fish'){
  for(let i=0;i<pageSize;i++){
   const kind=collectionPage*pageSize+i;if(kind>=species.length)continue;
   bookCard(kind,25,227+i*105);
  }
 }else{
  for(let i=0;i<4;i++){
   const badge=ACHIEVEMENTS[collectionPage*4+i];if(!badge)continue;
   const unlocked=save.collection.achievements[badge.id]===true;
   const y=227+i*105;
   pixelPlate(29,y,362,97,unlocked?'#154355':'#203648',unlocked?'#ffd45c':'#66859a',6);
   text(unlocked?'★':'?',52,y+25,25,unlocked?C.yellow:C.muted,'center',950);
   text(badge.title,80,y+19,17,C.cream,'left',950,0,293);
   text(badge.description,80,y+45,16,C.white,'left',900,0,291);
   text(unlocked?'UNLOCKED':'REWARD $'+badge.reward,80,y+74,17,C.white,'left',900,0,291);
  }
 }
 if(collectionPage>0)button('← PREV',31,659,111,42,()=>collectionPage--,C.cream);
 text((collectionPage+1)+' / '+pages,210,682,15,C.cream);
 if(collectionPage<pages-1)button('NEXT →',279,659,111,42,()=>collectionPage++,C.cream);
 button('← BACK',90,717,240,48,()=>{state='menu';age=0;},C.yellow);
}
function fishDetail(){
 ambient(clock);
 const meta=species[selectedFish],entry=save.collection.fish[selectedFish],found=Boolean(entry?.caught);
 text('FISH FILE',210,78,32,C.cream,'center',1000);
 text('#'+String(selectedFish+1).padStart(2,'0')+' / '+species.length,210,121,14,C.mint,'center',800);
 pixelPlate(31,155,358,453,'#102c40','#59c7bb',10);
 ctx.save();if(!found){ctx.filter='brightness(0)';ctx.globalAlpha=.65;}
 fish(210,252,selectedFish,1,3.2,clock*2);
 ctx.restore();
 text(found?meta.name:'UNDISCOVERED',210,354,found?27:22,C.yellow,'center',1000);
 if(found){
  text(fishRarity(selectedFish)+' • '+fishHabitat(selectedFish),210,391,17,C.white,'center',900,0,339);
  text('BASE VALUE $'+meta.value,210,425,16,C.cream,'center',900);
  line(58,452,361,452,'#4d8797');
  text('CAUGHT',65,487,13,C.muted,'left',850);text(entry.caught,351,487,17,C.cream,'right',950);
  text('SHOT',65,522,13,C.muted,'left',850);text(entry.shot,351,522,17,C.cream,'right',950);
  text('EARNED',65,557,13,C.muted,'left',850);text('$'+entry.earned,351,557,17,C.yellow,'right',950);
  text('BEST COMBO',65,587,13,C.muted,'left',850);text('x'+entry.bestCombo,351,587,17,C.cream,'right',950);
 }else{
  text('CATCH TO REVEAL THIS FISH',210,416,18,C.white,'center',900,0,330);
  text('STATS AND HABITAT ARE HIDDEN',210,455,17,C.white,'center',900,0,330);
 }
 button('← ENCYCLOPEDIA',75,646,270,52,()=>{state='collection';age=0;},C.cream);
 button('MAIN MENU',103,717,214,47,()=>{state='menu';age=0;},C.yellow);
}
function installScene(){
 titleBackdrop(lowFx?0:clock);
 text('INSTALL THE GAME',210,91,33,C.white,'center',900,0,380);
 text('PLAY FULLSCREEN • WORKS OFFLINE',210,130,16,C.white,'center',900,0,380);
 pixelPlate(24,157,372,405,'#102c40','#59c7bb',10);
 const guide=installGuide();
 text('FOR '+guide.platform.toUpperCase(),210,197,21,C.white,'center',900,0,343);
 text('BROWSER INSTALL STEPS',210,240,17,C.white,'center',900,0,339);
 for(let i=0;i<guide.steps.length;i++){
  const y=278+i*66;
  roundRect(39,y-19,40,40,0,'#0b4260','#3cf0e1',2);
  text('0'+(i+1),59,y+2,19,C.white,'center',900,0,37);
  text(guide.steps[i],89,y+2,16,C.white,'left',900,0,279);
 }
 roundRect(28,577,364,49,0,'#08243ef4','#64eade',2);
 const status=serviceWorkerStatus();
 const hint=canInstall()?'READY FOR INSTALL PROMPT':
  status==='ready'?'OFFLINE SERVICE READY':
  status==='failed'?'OFFLINE SETUP FAILED • TRY RELOAD':
  'OPEN IN YOUR REGULAR BROWSER';
 text(hint,210,601,16,C.white,'center',900,0,340);
 if(canInstall())button('INSTALL NOW',62,640,296,52,installGame,C.yellow);
 else button('COPY GAME LINK',62,640,296,52,copyGameLink,C.teal);
 text(installMessage,210,710,16,C.white,'center',900,0,360);
 button('← BACK',100,733,220,41,()=>{state='menu';age=0;},C.cream);
}
function settings(){
 ambient(clock);
 text('SETTINGS',210,85,42,C.cream,'center',1000);
 text('PHONE & INPUT',210,127,13,C.mint,'center',900,1.5);
 pixelPlate(23,151,374,488,'#102c40','#59c7bb',10);
 text('STEERING',210,181,18,C.yellow,'center',950);
 button('TOUCH',43,206,161,48,useTouch,inputMode==='touch'?C.yellow:'#5796a6');
 button('TILT',215,206,161,48,enableTilt,inputMode==='tilt'?C.yellow:'#5796a6');
 text(inputMode==='tilt'?'SELECTED: TILT':'SELECTED: TOUCH',210,278,14,C.cream,'center',900);
 text(sensorStatus,210,305,13,C.mint,'center',900,0,345);
 if(inputMode==='tilt')button('RECENTER',122,326,176,41,recenterTilt,C.cream);
 else text('DRAG TO STEER DURING A CAST',210,350,17,C.white,'center',900,0,350);
 text('AUDIO',210,376,16,C.yellow,'center',950);
 button(soundEnabled?'SOUND FX: ON':'SOUND FX: OFF',94,395,232,38,toggleSound,soundEnabled?C.teal:C.cream);
 button(musicEnabled?'SOUNDTRACK: ON':'SOUNDTRACK: OFF',94,441,232,38,toggleMusic,musicEnabled?C.teal:C.cream);
 text('FEEDBACK',210,495,16,C.yellow,'center',950);
 button(lowFx?'FX: LOW':'FX: FULL',42,514,162,43,toggleEffects,lowFx?C.cream:C.teal);
 if(rumble.supported())button(rumbleEnabled?'RUMBLE: ON':'RUMBLE: OFF',214,514,162,43,toggleRumble,rumbleEnabled?C.teal:C.cream);
 else{roundRect(214,514,162,43,0,'#23445a','#90b4c0',2);text('RUMBLE N/A',295,536,15,C.cream,'center',900,0,150);}
 if(!isInstalled())button('INSTALL / HELP',104,566,212,48,installGame,C.yellow);
 else text('INSTALLED APP',210,587,15,C.yellow);
 button('REFRESH GAME / CLEAR CACHE',54,627,312,48,()=>{refreshGameFiles().catch(()=>{installMessage='REFRESH FAILED - TRY RELOADING';state='install';age=0;});},C.teal);
 text('KEEPS YOUR COINS AND UPGRADES',210,687,16,C.white,'center',900,0,355);
 button('← BACK',62,716,296,45,()=>{state='menu';age=0;},C.yellow);

}
function pausedScene(){
 ctx.fillStyle='#031225ee';ctx.fillRect(0,0,W,H);
 const glow=ctx.createRadialGradient(210,380,20,210,380,290);
 glow.addColorStop(0,'#19aaa929');glow.addColorStop(1,'#071a3200');
 ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
 pixelPlate(35,219,350,368,'#0a2a3f','#58cabc',12);
 arcadePill('BREAK TIME',133,239,154,C.teal);
 text('PAUSED',210,313,52,C.white,'center',1000);
 text(pauseReason==='MANUAL'?'TAKE YOUR TIME':'PAUSED AUTOMATICALLY',210,356,17,C.white,'center',900,0,309);
 arcadeRule(85,382,335,C.teal);
 text('YOUR CATCH WILL NOT MOVE',210,399,17,C.white,'center',900,0,320);
 button('RESUME',76,437,268,65,resumeGame,C.yellow);
 button('MAIN MENU',96,521,228,53,menuFromPause,C.cream);
}
function neonOceanArtwork(kind,t){
 // Full-height hand-drawn vector/pixel arcade scene. The scene keeps its own
 // artwork so stage cards no longer feel like a modal over the game.
 const dark=ctx.createLinearGradient(0,0,0,H);
 if(kind==='dive'){
  dark.addColorStop(0,'#12254e');dark.addColorStop(.38,'#087aab');dark.addColorStop(1,'#03152f');
 }else if(kind==='reel'){
  dark.addColorStop(0,'#211c61');dark.addColorStop(.42,'#f47aa3');dark.addColorStop(.58,'#145b9d');dark.addColorStop(1,'#062746');
 }else{
  dark.addColorStop(0,'#18134a');dark.addColorStop(.48,'#642579');dark.addColorStop(1,'#07152e');
 }
 ctx.fillStyle=dark;ctx.fillRect(0,0,W,H);
 const movement=lowFx?0:t;
 // Animated aurora rays across the entire vertical artwork.
 ctx.save();ctx.globalAlpha=.22;
 for(let i=0;i<7;i++){
  const x=45+i*68+Math.sin(movement*.7+i)*14;
  const ray=ctx.createLinearGradient(x,80,x+80,H);
  ray.addColorStop(0,i%2?'#a5ffec':'#ff8ce5');
  ray.addColorStop(1,'#07152e00');
  ctx.fillStyle=ray;ctx.beginPath();ctx.moveTo(x-18,0);
  ctx.lineTo(x+27,0);ctx.lineTo(x+130,H);ctx.lineTo(x+43,H);ctx.closePath();ctx.fill();
 }
 ctx.restore();
 const horizon=kind==='dive'?173:kind==='reel'?356:535;
 // Layered ocean silhouette and white/teal crests.
 ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,horizon);
 for(let x=0;x<=W+12;x+=12)
  ctx.lineTo(x,horizon+Math.sin(x*.023+movement*2)*8+Math.sin(x*.068-movement*3)*4);
 ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=kind==='shoot'?'#112e69':'#07547d';ctx.fill();
 ctx.strokeStyle='#90faff';ctx.lineWidth=4;
 ctx.beginPath();
 for(let x=0;x<=W;x+=8){const y=horizon+Math.sin(x*.023+movement*2)*8+Math.sin(x*.068-movement*3)*4;
  if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
 ctx.stroke();
 // Marine life moves behind the hero elements.
 for(let i=0;i<12;i++){
  const x=20+((i*79+movement*(i%2?18:-14)+W*10)%W);
  const y=horizon+75+(i*61)%(H-horizon-105);
  ctx.save();ctx.globalAlpha=.25;
  fish(x,y,i%species.length,i%2?-1:1,.52+(i%3)*.11,movement*3+i);
  ctx.restore();
 }
 for(let i=0;i<30;i++){
  const x=(i*83+27)%W,y=H-((i*57+movement*(21+i%3*7))%(H+35));
  ctx.strokeStyle=i%3?'#c6fbff65':'#ffccee70';ctx.lineWidth=i%6?2:3;
  ctx.strokeRect(x,y,3+i%4*2,3+i%4*2);
 }
 if(kind==='dive'){
  // Glowing hook plunging under a boat, with a luminous trail.
  boat(210,166);
  const hookY=308+Math.sin(movement*3)*17;
  ctx.strokeStyle='#e1ffff9c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(210,155);ctx.lineTo(210,hookY-15);ctx.stroke();
  ctx.save();ctx.shadowColor='#24ffe2';ctx.shadowBlur=23;hook(210,hookY);ctx.restore();
  for(let i=0;i<18;i++){const x=210+Math.sin(i*8+movement)*((i%5)*8),y=hookY+35+i*14;
   circle(x,y,2+i%3,'#80f3ff99');}
 }else if(kind==='reel'){
  // Hero trophy fish breaks the ocean horizon, trailing foam and droplets.
  const lift=lowFx?0:Math.sin(movement*4)*17;
  for(let i=0;i<19;i++){const x=210+Math.cos(i*2.4)*((i%7)*19);
   const y=horizon+Math.sin(i*3)*32;
   circle(x,y,4+i%4*2,i%2?'#e9ffff':'#5beaff');}
  ctx.save();ctx.translate(210,319+lift);ctx.rotate(-.24);
  ctx.shadowColor='#80f6ff';ctx.shadowBlur=21;
  fish(0,0,10,1,3.2,movement*5);ctx.restore();
  line(180,0,243,287,'#b8fcff',2);
 }else{
  // Electric crosshair, fish silhouettes, neon weapon bolts and gold coins.
  const cx=210+Math.sin(movement*2)*6,cy=314;
  ctx.save();ctx.shadowColor='#fc72e8';ctx.shadowBlur=24;
  ctx.strokeStyle='#ffa0fc';ctx.lineWidth=4;ctx.beginPath();ctx.arc(cx,cy,59,0,Math.PI*2);ctx.stroke();
  line(cx-83,cy,cx-23,cy,'#ffffff',4);line(cx+23,cy,cx+83,cy,'#ffffff',4);
  line(cx,cy-83,cx,cy-23,'#ffffff',4);line(cx,cy+23,cx,cy+83,'#ffffff',4);
  circle(cx,cy,7,'#ffec7c');ctx.restore();
  fish(105,215,10,1,2.1,movement*4);
  fish(335,394,13,-1,1.5,movement*4);
  for(let i=0;i<16;i++){
   const angle=i*Math.PI/8+movement*.4,dist=70+(i%4)*22;
   const x=cx+Math.cos(angle)*dist,y=cy+Math.sin(angle)*dist;
   ctx.fillStyle=i%3?'#ffe76a':'#ff8fed';
   ctx.fillRect(x,y,6+i%3*3,6+i%3*3);
  }
  drawBulletTrail(80,670,cx,cy,.76,'#ff75da',2);
  drawBulletTrail(345,670,cx,cy,.66,'#6efcf9',2);
 }
}
function drawStageTransition(){
 if(!sceneTransition)return;
 const stage=ARCADE_STAGES[sceneTransition.kind];
 if(!stage)return;
 const frame=stageFrame(sceneTransition.elapsed,sceneTransition.duration);
 if(frame.visibility<=0)return;
 ctx.save();
 // Artwork fills the full screen, not the old small centred modal.
 ctx.globalAlpha=frame.visibility;
 neonOceanArtwork(sceneTransition.kind,sceneTransition.elapsed);
 // Gradient behind the bottom title for consistent white-text readability.
 const shade=ctx.createLinearGradient(0,500,0,H);
 shade.addColorStop(0,'#06122800');shade.addColorStop(.42,'#06152ad9');shade.addColorStop(1,'#030d23');
 ctx.fillStyle=shade;ctx.fillRect(0,500,W,H-500);
 const offset=frame.slide*.52;
 arcadePill('STAGE '+stage.number,150,557+offset,120,stage.accent);
 text(stage.title,210,634+offset,48,C.white,'center',900,0,392);
 ctx.save();ctx.globalAlpha=.83*frame.visibility;
 ctx.fillStyle=stage.accent;ctx.fillRect(40,673+offset,340,4);
 ctx.restore();
 text(stage.subtitle,210,707+offset,20,C.white,'center',900,0,372);
 for(let i=0;i<3;i++)roundRect(104+i*73,740+offset,59,6,3,i+1<=Number(stage.number)?stage.accent:'#3f647d');
 ctx.restore();
}
function render(){hits=[];ctx.setTransform(1,0,0,1,0,0);
 ctx.save();if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));
 if(state==='menu')menu();else if(state==='install')installScene();else if(state==='descent'||state==='ascent')gameplay();else if(state==='shoot')shootScene();else if(state==='results')results();else if(state==='shop')shop();else if(state==='more')moreMenu();else if(state==='collection')collection();else if(state==='expeditions')expeditionBoard();else if(state==='fishDetail')fishDetail();else if(state==='settings')settings();
 overlayParticles();drawSplashEffects(lastFrameDt);
 if(sceneFlash>0&&!lowFx){
   ctx.fillStyle='rgba(255,248,208,'+(Math.min(.23,sceneFlash))+')';
   ctx.fillRect(0,0,W,H);
 }
 drawStageTransition();
 ctx.restore();
 if(paused){hits=[];pausedScene();}
 display.setTransform(1,0,0,1,0,0);display.imageSmoothingEnabled=true;
 display.drawImage(sceneCanvas,0,0,canvas.width,canvas.height);
 if(!document.body.classList.contains('game-ready'))document.body.classList.add('game-ready');
}
let last=0,lastFrameDt=0;
function frame(t){
 const frameGap=lowFx?1000/30:1000/60;
 if(last&&t-last<frameGap-1){requestAnimationFrame(frame);return;}
 const dt=Math.min((t-last)/1000||.016,.05);
 last=t;lastFrameDt=paused?0:dt;
 if(!paused&&!document.hidden)update(dt);
 if(!document.hidden)render();
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
function pos(e){const r=canvas.getBoundingClientRect();return{x:clamp((e.clientX-r.left)*W/r.width,0,W),y:clamp((e.clientY-r.top)*H/r.height,0,H)};}
function activate(x,y){for(let i=hits.length-1;i>=0;i--){const h=hits[i];if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h){h.action();return true;}}return false;}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.focus();try{canvas.setPointerCapture(e.pointerId);}catch(_){}
 if(state==='shop'&&shopView==='catalog'&&!shopInspect){const q=pos(e),[a,b]=shopListBounds();if(q.y>=a&&q.y<=b){shopDrag={startY:q.y,startScroll:shopScroll[shopTab],moved:false};return;}}
 sound.unlock();pointerDown=true;pointer=pos(e);if(paused){activate(pointer.x,pointer.y);return;}if(state==='descent'||state==='ascent'){targetX=pointer.x;}else if(state==='shoot'){if(!activate(pointer.x,pointer.y))shootAt(pointer.x,pointer.y);}else{activate(pointer.x,pointer.y);}});
canvas.addEventListener('pointermove',e=>{if(paused)return;pointer=pos(e);
 if(shopDrag){const dy=pointer.y-shopDrag.startY;if(Math.abs(dy)>7)shopDrag.moved=true;if(shopDrag.moved)shopScrollTo(shopDrag.startScroll-dy);return;}if(pointerDown&&(state==='descent'||state==='ascent'))targetX=pointer.x;});
canvas.addEventListener('pointerup',e=>{if(shopDrag){const dragged=shopDrag.moved;shopDrag=null;if(!dragged)activate(pos(e).x,pos(e).y);}pointerDown=false;});
canvas.addEventListener('pointercancel',()=>{shopDrag=null;pointerDown=false;});
canvas.addEventListener('wheel',e=>{if(state==='shop'&&shopView==='catalog'&&!shopInspect){const q=pos(e),[a,b]=shopListBounds();if(q.y>=a&&q.y<=b){e.preventDefault();shopScrollTo(shopScroll[shopTab]+e.deltaY);}}},{passive:false});
window.addEventListener('keydown',e=>{
 sound.unlock();
 if(['ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
 if(e.code==='Escape'||e.key.toLowerCase()==='p'){
  if(paused)resumeGame();else pauseGame('MANUAL');return;
 }
 if(paused)return;
 keys.add(e.key);
 if(e.repeat)return;if(e.code==='Space'||e.code==='Enter'){
 if(state==='menu'||state==='results')beginCast();else if(state==='shoot')shootAt(pointer.x,pointer.y);
 }});window.addEventListener('keyup',e=>keys.delete(e.key));
window.addEventListener('blur',()=>{keys.clear();pointerDown=false;pauseGame('BACKGROUND');});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){pauseGame('BACKGROUND');keys.clear();pointerDown=false;sound.pause(true);rumble.stop();}
 else if(!paused){sound.pause(false);sound.unlock();}
 last=0;
});
})();