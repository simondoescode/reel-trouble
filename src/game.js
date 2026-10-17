import { tiltAxis, tiltVelocity } from './tilt.js';
import { createArcadeAudio } from './audio.js';
import { createRumble } from './haptics.js';
import { SPECIES as species, BIOMES, biomeAtDepth, oceanPalette, spawnOcean, advanceFish, advanceHazard, overlapsHazard } from './ocean.js';
import { createCollection, normalizeCollection, recordCatch, recordShot, grantAchievements, collectionProgress, fishRarity, fishHabitat, ACHIEVEMENTS } from './collection.js';
import { setupPwa, canInstall, isInstalled, requestInstall } from './pwa.js';
import { weaponForLevel, pickShotTargets, nextCombo, shotPayout } from './shooting.js';
(() => {
'use strict';
const W=420,H=780,SEA=192, MAXLVL=5;
const canvas=document.getElementById('game'), display=canvas.getContext('2d',{alpha:false});
// Render glyphs at their real logical size: the old 210x390 buffer rasterised
// 12-16px labels at only 6-8 physical pixels before blowing them back up.
const sceneCanvas=document.createElement('canvas');
sceneCanvas.width=W;sceneCanvas.height=H;
const ctx=sceneCanvas.getContext('2d',{alpha:false});
const titleLogo=new Image();
titleLogo.decoding='async';
titleLogo.src='./assets/title-logo.webp';
ctx.imageSmoothingEnabled=false; // Original blocky fish sprites remain pixel art.
display.imageSmoothingEnabled=true; // Smooth final presentation, not font rasterisation.
// Saturated colours remain in the art and outlines. UI labels are solid white.
const C={navy:'#081a32',deep:'#094567',ocean:'#19aed1',teal:'#27f4dd',mint:'#d6fff4',cream:'#ffffff',white:'#ffffff',yellow:'#ffed76',coral:'#ff667f',pink:'#ff9be7',muted:'#ffffff',ink:'#071b31'};

const initial={cash:0,total:0,best:0,upgrades:{line:0,net:0,gun:0},collection:createCollection()};
function loadSave(){try{const d=JSON.parse(localStorage.getItem('reel-trouble-save-v1')||localStorage.getItem('deep-end-save-v1'));if(!d||!d.upgrades)return structuredClone(initial);
return {cash:Math.max(0,Number(d.cash)||0),total:Math.max(0,Number(d.total)||0),best:Math.max(0,Number(d.best)||0),upgrades:{line:clamp(Number(d.upgrades.line)||0,0,MAXLVL),net:clamp(Number(d.upgrades.net)||0,0,MAXLVL),gun:clamp(Number(d.upgrades.gun)||0,0,MAXLVL)},collection:normalizeCollection(d.collection)};
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
function toggleEffects(){lowFx=!lowFx;savePreferences();shake=0;}
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
  requestInstall().then(ok=>{installMessage=ok?'INSTALL REQUESTED':'USE BROWSER INSTALL MENU';});
 }else if(/iPad|iPhone|iPod/.test(navigator.userAgent || '')){
  installMessage='SHARE > ADD TO HOME SCREEN';
 }else installMessage='BROWSER MENU > INSTALL APP';
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
let combo=0, bestRoundCombo=0, lastComboHit=-Infinity, landed=0, shotEffects=[], recoil=0, muzzleFlash=0;
let paused=false,pauseReason='';
function liveRound(){return state==='descent'||state==='ascent'||state==='shoot';}
function pauseGame(reason='MANUAL'){
 if(!liveRound()||paused)return;
 paused=true;pauseReason=reason;pointerDown=false;keys.clear();sound.pause(true);rumble.stop();
}
function resumeGame(){paused=false;pauseReason='';last=0;pointerDown=false;sound.pause(false);sound.unlock();}
function menuFromPause(){paused=false;pauseReason='';state='menu';age=0;last=0;sound.pause(false);rumble.stop();}
let splashes=[],ripples=[],sceneFlash=0,collectionTab='fish',collectionPage=0,selectedFish=0;
let newFishThisCast=0,newBadgesThisCast=0,bonusThisCast=0;
let save=loadSave(), state=mobileInput&&(inputChoice===null||(inputChoice==='tilt'&&permissionPrompt))?'settings':'menu', age=0, clock=0, depth=0, maxDepth=720, hookX=W/2,targetX=W/2, fishes=[], hazards=[], hazardSlow=0, caught=[], airborne=[], particles=[], labels=[], hits=[], roundEarnings=0, fired=0, shootTime=0, castNumber=0, message='', messageTimer=0, pointerDown=false, pointer={x:W/2,y:H/2}, keys=new Set(), waveT=0, shake=0;
function persist(){try{localStorage.setItem('reel-trouble-save-v1',JSON.stringify(save));}catch(_){}}
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
function openCollection(tab='fish'){collectionTab=tab;collectionPage=0;state='collection';age=0;}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
const rand=(a,b)=>a+Math.random()*(b-a);
const irand=(a,b)=>Math.floor(rand(a,b+1));
// Square-corner arcade panels.
function roundRect(x,y,w,h,_r,fill,stroke,lw=2){
 x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);
 if(fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.strokeRect(x+lw/2,y+lw/2,w-lw,h-lw);}
}
function text(s,x,y,size=20,_color=C.white,align='center',_weight=900,_letter=0,maxWidth=null){
 // One highly readable type treatment everywhere: full-resolution, heavy white
 // lettering with dark edge separation on vibrant water and dark UI panels.
 const label=String(s),fontSize=Math.max(16,size);
 ctx.save();
 ctx.textAlign=align;ctx.textBaseline='middle';
 ctx.font='900 '+fontSize+'px Arial,Helvetica,sans-serif';
 const available=maxWidth??(align==='left'?W-x-16:align==='right'?x-16:Math.min(W-32,2*x-16,2*(W-x)-16));
 const width=Math.max(20,available);
 let fitted=label;
 // Never compress or distort a font. Truncate an overlong label only as a last resort.
 if(ctx.measureText(fitted).width>width){
  while(fitted.length>1&&ctx.measureText(fitted+'…').width>width)fitted=fitted.slice(0,-1);
  fitted=fitted.replace(/\s+$/,'')+'…';
 }
 ctx.lineJoin='round';
 ctx.strokeStyle='#031523';
 ctx.lineWidth=fontSize>=32?3:2;
 ctx.strokeText(fitted,x,y,width);
 ctx.fillStyle='#ffffff';
 ctx.fillText(fitted,x,y,width);
 ctx.restore();
}
function line(x1,y1,x2,y2,color,width=2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function polygon(points,fill){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
function button(title,x,y,w,h,action,accent=C.coral,secondary=''){
 // Always put WHITE labels over a DARK button. Bright accent is a border only.
 roundRect(x+4,y+5,w,h,0,'#041123');
 roundRect(x,y,w,h,0,'#082841',accent,3);
 ctx.fillStyle=accent;ctx.fillRect(x+5,y+4,w-10,5);
 ctx.fillStyle='#ffffff25';ctx.fillRect(x+7,y+h-10,w-14,3);
 const labelY=y+h/2-(secondary?8:0);
 text(title,x+w/2,labelY,secondary?16:(h<41?17:19),C.white,'center',900,0,w-20);
 if(secondary)text(secondary,x+w/2,y+h/2+15,16,C.white,'center',900,0,w-22);
 hits.push({x,y,w,h,action});
}
function panel(x,y,w,h){
 roundRect(x+4,y+5,w,h,0,'#041625');
 roundRect(x,y,w,h,0,'#10405a','#59f6e5',3);
 ctx.fillStyle='#8cfff2';ctx.fillRect(x+4,y+4,Math.max(0,w-8),4);
 ctx.fillStyle='#19738c';ctx.fillRect(x+4,y+h-9,Math.max(0,w-8),5);
 ctx.fillStyle='#ffe35b';ctx.fillRect(x+12,y+12,10,4);
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
function fish(x,y,kind=0,dir=1,scale=1,phase=0){
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
 ctx.save();ctx.translate(Math.round(x),Math.round(seaY+Math.sin(waveT*2)*2));

 ctx.fillStyle='#062537';ctx.fillRect(-71,-7,142,16);
 ctx.fillStyle='#a92f5f';ctx.fillRect(-53,12,106,10);
 ctx.fillStyle=C.coral;ctx.fillRect(-66,-8,132,19);ctx.fillRect(-54,10,108,7);
 ctx.fillStyle=C.yellow;ctx.fillRect(-56,-7,112,4);
 ctx.fillStyle='#ff99a6';ctx.fillRect(-58,0,116,4);
 ctx.fillStyle='#fff7e7';ctx.fillRect(-31,-37,64,28);
 ctx.fillStyle='#14bbcf';ctx.fillRect(-21,-30,17,15);ctx.fillRect(8,-30,17,15);
 ctx.fillStyle='#064361';ctx.fillRect(-17,-26,5,7);ctx.fillRect(12,-26,5,7);
 ctx.fillStyle='#fff7e7';ctx.fillRect(26,-70,5,36);
 ctx.fillStyle=C.yellow;ctx.fillRect(31,-67,24,7);ctx.fillRect(31,-60,16,9);ctx.fillRect(31,-51,8,6);
 ctx.fillStyle='#fffaf1';ctx.fillRect(-49,12,9,4);ctx.fillRect(37,12,9,4);
 // Original little pixel fisherman: bobbing head, cap and an animated reeling arm.
 const arm=Math.round(Math.sin(clock*8)*4);
 ctx.fillStyle='#101a3a';ctx.fillRect(39,-37,15,23);
 ctx.fillStyle='#ffe1ab';ctx.fillRect(40,-52,13,16);
 ctx.fillStyle='#ff596c';ctx.fillRect(36,-57,22,7);
 ctx.fillStyle='#081b32';ctx.fillRect(49,-48,3,3);
 ctx.fillStyle='#20e3d0';ctx.fillRect(39,-33,15,14);
 ctx.fillStyle='#ffe1ab';ctx.fillRect(52,-32+arm,5,13);
 ctx.fillStyle='#07182c';ctx.fillRect(41,-20,5,11);ctx.fillRect(49,-20,5,11);
 ctx.restore();
}
function hook(x,y){
 ctx.save();ctx.translate(Math.round(x),Math.round(y));
 ctx.fillStyle='#08283c';ctx.fillRect(-4,-28,9,24);
 ctx.fillStyle=C.cream;ctx.fillRect(-2,-26,4,20);
 ctx.fillStyle=C.coral;ctx.fillRect(-5,-8,10,9);
 ctx.fillStyle='#ffeff2';ctx.fillRect(-3,-7,4,3);
 ctx.fillStyle=C.yellow;ctx.fillRect(-2,1,5,16);ctx.fillRect(2,14,15,6);
 ctx.fillRect(14,10,6,5);ctx.fillRect(19,6,5,7);ctx.fillRect(19,5,6,3);
 ctx.fillStyle='#fff9d2';ctx.fillRect(0,1,2,13);
 ctx.restore();
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
 // Distant corals, kelp and trench structures are confined to the edges.
 const bottomWorld=camera+H-SEA;
 ctx.save();ctx.globalAlpha=.25;
 for(let world=150;world<bottomWorld+120;world+=175){
  const y=SEA+world-camera;
  if(y<-115||y>H+90)continue;
  const biome=biomeAtDepth(world),row=Math.floor(world/175);
  for(let k=0;k<4;k++){
   const x=k<2?14+k*53:W-75+(k-2)*53;
   if(biome.id==='reef'){
    const height=25+(row+k)%3*9;
    ctx.fillStyle=k%2?'#b97088':'#438f9d';
    ctx.fillRect(x,y-height,7,height);
    ctx.fillRect(x-9,y-height+9,24,5);
    ctx.fillRect(x+12,y-height-8,5,18);
   }else if(biome.id==='kelp'){
    const height=65+(row+k)%4*15;
    ctx.fillStyle=k%2?'#2c8c84':'#388d8e';
    for(let h=0;h<height;h+=14){
     const dx=x+Math.round(Math.sin(h*.05+waveT*.8+k)*4);
     ctx.fillRect(dx,y-h,6,15);
     ctx.fillRect(dx+(k%2?5:-9),y-h-7,13,5);
    }
   }else{
    const height=35+(row+k)%4*12;
    ctx.fillStyle='#59708e';ctx.fillRect(x,y-height,17,height+8);
    ctx.fillStyle='#5579a0';ctx.fillRect(x+5,y-height-6,6,7);
   }
  }
 }
 ctx.restore();
 // Fewer, dimmer particles: movement is visible without visual clutter.
 for(let i=0;i<13;i++){
  const x=(i*87+13)%W;
  const y=((i*137+waveT*(4+i%4))%(H+25))-12;
  ctx.fillStyle=i%4===0?'rgba(216,237,240,0.20)':'rgba(152,204,218,0.13)';
  ctx.fillRect(Math.floor(x/3)*3,Math.floor(y/3)*3,i%4===0?3:2,i%4===0?3:2);
 }
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
function meter(n){return `${Math.round(n/6)}m`;}
function beginCast(){
 paused=false;pauseReason='';sound.pause(false);
 splashes=[];ripples=[];emitSplash(210,SEA+5,'#d8ffff',1.6);sceneFlash=.23;
 sound.play('splash');rumble.play('cast');
 castNumber++;state='descent';age=0;roundEarnings=0;newFishThisCast=0;newBadgesThisCast=0;bonusThisCast=0;fired=0;combo=0;bestRoundCombo=0;lastComboHit=-Infinity;landed=0;shotEffects=[];recoil=0;muzzleFlash=0;maxDepth=720+save.upgrades.line*240;depth=0;hookX=210;targetX=210;fishes=[];caught=[];airborne=[];particles=[];labels=[];
const populated=spawnOcean(maxDepth,Math.random);
 fishes=populated.fish;hazards=populated.hazards;hazardSlow=0;
 message='DODGE THE FISH!';messageTimer=2.1;}
function startAscent(hitFish,stung=false){if(state!=='descent')return;
 state='ascent';age=0;message='REEL THEM IN!';messageTimer=1.9;if(hitFish)catchFish(hitFish);
 else if(!caught.length&&!stung){const nearest=fishes.filter(f=>!f.caught).sort((a,b)=>Math.abs(a.d-depth)-Math.abs(b.d-depth))[0];if(nearest)catchFish(nearest);}
 sound.play('reel');sceneFlash=.16;}
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
 const camera=clamp(depth-230,0,maxDepth+100),hy=SEA+depth-camera;
 burst(hookX,hy,C.yellow,12);emitSplash(hookX,hy,species[f.kind].color,.55);
 sound.play('catch',{pitch:f.kind});rumble.play(species[f.kind].rare?'legendary':'catch');
}
function beginShoot(){
 state='shoot';age=0;shootTime=12;
 combo=0;bestRoundCombo=0;lastComboHit=-Infinity;landed=0;
 shotEffects=[];recoil=0;muzzleFlash=0;
 const gun=weaponForLevel(save.upgrades.gun);
 message=gun.tier===0?'TAP THE FLYING FISH!':gun.name+' READY!';
 messageTimer=2;
 airborne=caught.map((f,i)=>({
  kind:f.kind,value:f.value,x:clamp(60+i*41,65,350),y:630+rand(-25,30),
  vx:rand(-62,62),vy:rand(-255,-165),spin:rand(-1,1),phase:i,shot:false
 }));
 if(!caught.length){endRound();return;}
 emitSplash(210,636,C.teal,1.7);sceneFlash=.26;sound.play('splash');
}
function shootAt(x,y){
 if(state!=='shoot'||endDelay>0)return;
 const gun=weaponForLevel(save.upgrades.gun);
 fired++;recoil=1;muzzleFlash=.12;sound.play('shot',{pitch:gun.tier});
 pointer={x,y};
 const targets=pickShotTargets(airborne.map(f=>({...f,size:species[f.kind].size,original:f})),x,y,gun);
 // Keep identity through hit-testing so overlapping fish cannot consume the same hit.
 const actual=targets.map(t=>t.original);
 const streak=nextCombo(combo,lastComboHit,clock,actual.length);
 combo=streak.count;lastComboHit=streak.lastHit;
 bestRoundCombo=Math.max(bestRoundCombo,combo);
 const baseX=210,baseY=663;
 const a=Math.atan2(y-baseY,x-baseX);
 const muzzleX=baseX+Math.cos(a)*86, muzzleY=baseY+Math.sin(a)*86;
 shotEffects.push({x:muzzleX,y:muzzleY,targets:actual.length
   ?actual.map(f=>({x:f.x,y:f.y})):[{x,y}],life:.22,max:.22,color:gun.color});
 if(actual.length){
  landed++;
  for(const f of actual){
   f.shot=true;
   const money=shotPayout(f.value,streak.multiplier);
   roundEarnings+=money;save.cash+=money;save.total+=money;
   recordShot(save.collection,f.kind,money,streak.multiplier);
   burst(f.x,f.y,species[f.kind].color,26);
   floatLabel('+$'+money+(streak.multiplier>1?' x'+streak.multiplier:''),f.x,f.y-22,C.yellow);
  }
  shake=clamp(shake+2+actual.length*1.4,0,7);
  sceneFlash=Math.max(sceneFlash,.09);sound.play('hit',{pitch:gun.tier});rumble.play(combo>=2?'combo':'hit');
  updateAchievements();
  if(combo>=2){floatLabel('COMBO x'+streak.multiplier,210,177,C.mint);sound.play('combo');}
  persist();
 }else{
  // A miss breaks the streak; ammunition stays unlimited.
  burst(x,y,'#e8f6e7',5);floatLabel('MISS',x,y-18,C.cream);
  shake=clamp(shake+1.4,0,7);sound.play('miss');rumble.play('shot');
 }
 if(airborne.every(f=>f.shot))setTimeoutSafe(endRound,380);
}
let endDelay=0;function setTimeoutSafe(_fn,seconds){endDelay=Math.max(endDelay,seconds/1000);}
function endRound(){if(state!=='shoot')return;state='results';age=0;endDelay=0;shotEffects=[];recoil=0;muzzleFlash=0;particles=[];labels=[];save.best=Math.max(save.best,roundEarnings);persist();sound.play('results');}
function purchase(type){const cfg=upgradeConfig(type);if(cfg.level>=MAXLVL||save.cash<cfg.cost)return;
 save.cash-=cfg.cost;save.upgrades[type]++;persist();burst(210,350,C.yellow,18);sound.play('upgrade');rumble.play('upgrade');}
function upgradeConfig(type){const titles={line:'LONGER LINE',net:'WIDER HOOK',gun:'GUN UPGRADES'},base={line:65,net:90,gun:85};const lvl=save.upgrades[type];
 return {title:titles[type],level:lvl,cost:Math.round(base[type]*Math.pow(1.75,lvl)),desc:{line:'+40m of depth per level',net:'Catch fish more easily',gun:'AIM BOOST | NEW GUNS L2/L4'}[type]};}
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
function floatLabel(value,x,y,color){labels.push({value,x,y,color,life:1.1});}

function update(dt){
 sound.update(dt,state,document.hidden);
 clock+=dt;if(!lowFx)waveT+=dt;age+=dt;shake=lowFx?0:Math.max(0,shake-dt*20);if(messageTimer>0)messageTimer-=dt;
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
 targetX=clamp(targetX,24,W-24);hookX+=(targetX-hookX)*clamp(9*dt,0,1);
 for(const f of fishes)advanceFish(f,dt);
 for(const h of hazards)advanceHazard(h,dt);
 hazardSlow=Math.max(0,hazardSlow-dt);
 const touchingHazard=hazards.find(h=>overlapsHazard(h,hookX,depth)&&clock-h.triggeredAt>1.8);
 const triggerHazard=()=>{
  if(!touchingHazard)return;
  touchingHazard.triggeredAt=clock;
  const camera=clamp(depth-230,0,maxDepth+100),y=SEA+touchingHazard.d-camera;
  burst(touchingHazard.x,y,'#d7b3ff',14);
  floatLabel('JELLYFISH!',touchingHazard.x,y-27,C.pink);
  sceneFlash=.17;shake=lowFx?0:3;
  sound.play('miss');rumble.play('sting');
 };
 if(state==='descent'){
 depth+= (162+save.upgrades.line*6)*dt;
 const collided=depth<225?null:fishes.find(f=>!f.caught&&Math.abs(f.d+(f.swimY||0)-depth)<20&&Math.abs(f.x-hookX)<(18+species[f.kind].size*.75));
 if(collided)startAscent(collided);
 else if(touchingHazard){triggerHazard();startAscent(null,true);}
 else if(depth>=maxDepth){depth=maxDepth;startAscent(null);}
 }else{
 depth-=(hazardSlow>0?140:240)*dt;
 if(touchingHazard){triggerHazard();hazardSlow=1.2;}
 const radius=24+save.upgrades.net*13;
 for(const f of fishes)if(!f.caught&&Math.abs(f.d+(f.swimY||0)-depth)<27&&Math.abs(f.x-hookX)<radius+species[f.kind].size*.5)catchFish(f);
 if(depth<=0){depth=0;beginShoot();}
 }
 }
 if(state==='shoot'){
 recoil=Math.max(0,recoil-dt*7);
 muzzleFlash=Math.max(0,muzzleFlash-dt);
 for(const fx of shotEffects)fx.life-=dt;
 shotEffects=shotEffects.filter(fx=>fx.life>0);
 if(combo&&clock-lastComboHit>2.4){combo=0;lastComboHit=-Infinity;}
 shootTime-=dt;for(const f of airborne){if(f.shot)continue;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=50*dt;
 if(f.x<42||f.x>W-42){f.x=clamp(f.x,42,W-42);f.vx*=-1;}
 if(f.y<130){f.y=130;f.vy=Math.abs(f.vy)*.5;}
 if(f.y>610){f.y=610;f.vy=-Math.abs(f.vy)*.8-40;}
 }
 if(endDelay>0){endDelay-=dt;if(endDelay<=0)endRound();}
 else if(shootTime<=0)endRound();
 }
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.18,dt);p.vy+=80*dt;p.life-=dt;}
 particles=particles.filter(p=>p.life>0);
 for(const l of labels){l.y-=27*dt;l.life-=dt;}labels=labels.filter(l=>l.life>0);
}
function emitSplash(x,y,color=C.teal,intensity=1){
 ripples.push({x,y,color,scale:intensity,life:.48,max:.48});
 const count=lowFx?5:Math.round(10*intensity);
 for(let i=0;i<count;i++){
  const a=-Math.PI/2+rand(-1.25,1.25),speed=rand(55,210)*intensity;
  const life=rand(.28,.68);
  splashes.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life,max:life,color,size:irand(3,7)});
 }
}
function drawSplashEffects(dt){
 for(const ripple of ripples){
  const progress=1-ripple.life/ripple.max;
  const radius=(10+46*progress)*ripple.scale;
  const edgeX=Math.round(radius/4)*4, y=Math.round(ripple.y/4)*4;
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
  ctx.fillRect(Math.round(drop.x/3)*3,Math.round(drop.y/3)*3,drop.size,drop.size);
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
 roundRect(14,19,W-28,55,0,'#061d34f7','#72ffe7',2);
 text(title,27,47,18,C.white,'left',900,0,left?175:230);
 text(right,392,47,17,C.white,'right',900,0,130);
 if(left)text(left,244,47,16,C.white,'center',900,0,66);
}
function bottomHint(hint){roundRect(21,711,378,51,0,'#061d34fa','#6beedc',2);text(hint,210,737,16,C.white,'center',900,0,357);}
function gameplay(){const camera=clamp(depth-230,0,maxDepth+100);
 bgUndersea(camera);const surf=SEA-camera;
 if(surf>45&&surf<H+60){boat(W/2,surf-7);}
 const reelY=surf-35,hy=SEA+depth-camera;
 line(W/2,Math.max(-20,reelY),hookX,hy,'#e3debbd9',1.5);
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
 topBar(state==='descent'?'DIVING ↓':'REELING ↑','',`${meter(depth)} / ${meter(maxDepth)}`);
 const biome=biomeAtDepth(depth);
 roundRect(18,112,159,37,0,'#08253bf5','#76fae2',2);
 text(biome.name,97,130,13,biome.id==='trench'?'#e4caff':C.cream,'center',950,0,145);
 roundRect(28,85,364,9,5,'#052e3c','#32758b');roundRect(30,87,Math.max(3,360*depth/maxDepth),5,3,state==='descent'?C.yellow:C.teal);
 if(state==='ascent'){roundRect(191,112,162,37,0,'#08253bf0','#ffed76',2);text('HOOKED '+caught.length,272,130,16,C.yellow,'center',950,0,148);}
 if(messageTimer>0){roundRect(67,164,286,42,0,'#07243df5','#86fff2',2);text(message,210,185,16,C.cream,'center',950,0,269);}
 bottomHint(hazardSlow>0?'JELLYFISH! SLOW REEL':(sensorFresh()?'TILT':'DRAG')+' TO STEER • '+(state==='descent'?'AVOID FISH':'CATCH FISH'));
 button('II',362,117,42,37,()=>pauseGame('MANUAL'),C.cream);
}
function drawBulletTrail(x1,y1,x2,y2,alpha,color){
 ctx.save();ctx.globalAlpha=alpha;
 // Dotted, stepped bright trace rather than a smooth antialiased laser.
 const count=Math.max(1,Math.round(Math.hypot(x2-x1,y2-y1)/11));
 for(let i=0;i<=count;i++){
  const t=i/count;
  const x=Math.round((x1+(x2-x1)*t)/4)*4,y=Math.round((y1+(y2-y1)*t)/4)*4;
  ctx.fillStyle=i%3===0?C.cream:color;
  ctx.fillRect(x,y,i%3===0?6:4,i%3===0?6:4);
 }
 ctx.restore();
}
function drawGun(){
 const gun=weaponForLevel(save.upgrades.gun),x=210,y=663;
 const angle=Math.atan2(pointer.y-y,pointer.x-x)+Math.PI/2;
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);
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
  ctx.globalAlpha=Math.min(1,muzzleFlash/.09);
  ctx.fillStyle=C.yellow;ctx.fillRect(-17,-110,34,19);
  ctx.fillStyle=C.cream;ctx.fillRect(-8,-127,16,37);
  ctx.fillStyle=C.coral;ctx.fillRect(-27,-100,54,7);
 }
 ctx.restore();
}
function shootScene(){
 const sky=['#4257b5','#6658bf','#9664ca','#c76aba','#fa85b4','#ffa49c','#ffc680','#fff0b3'];
 for(let i=0;i<sky.length;i++){ctx.fillStyle=sky[i];ctx.fillRect(0,i*80,W,82);}
 ctx.fillStyle='#ffa79b';
 for(let j=-10;j<=10;j++){const width=85-Math.round(Math.abs(j*j)*.6);ctx.fillRect(322-width,295+j*9,width*2,10);}
 ctx.fillStyle='#fff5a4';
 for(let j=-7;j<=7;j++){const width=66-Math.round(Math.abs(j*j)*.8);ctx.fillRect(322-width,295+j*9,width*2,10);}
 for(let i=0;i<5;i++){
  const x=i*103+Math.floor(waveT*3)%50-23,y=70+(i%3)*66;
  ctx.fillStyle=i%2===0?'#fba3ca8a':'#ffe4bb7a';
  ctx.fillRect(x,y,67,10);ctx.fillRect(x+13,y-9,36,11);
 }
 ctx.fillStyle='#fff2c2';for(let i=0;i<16;i++){
  const x=Math.floor(((i*137+29)%W)/4)*4,y=Math.floor(((i*91+17)%380)/4)*4;
  ctx.fillRect(x,y,3,3);
 }
 ctx.fillStyle='#443b76';for(let x=0;x<W;x+=18){const h=38+((x*13)%50);ctx.fillRect(x,596-h,18,H-596+h);}
 ctx.fillStyle='#0a85a8';ctx.fillRect(0,644,W,H-644);
 for(let x=0;x<W;x+=24){
  ctx.fillStyle=x%48?'#aefff0':'#36dcda';
  ctx.fillRect(x,644+(Math.floor(waveT*2+x/24)%3)*3,15,4);
 }
 boat(210,636);
 for(const f of airborne)if(!f.shot)fish(f.x,f.y,f.kind,f.vx<0?-1:1,1.55,clock*6+f.phase);
 for(const trail of shotEffects){
  for(const end of trail.targets)drawBulletTrail(trail.x,trail.y,end.x,end.y,trail.life/trail.max,trail.color);
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
 roundRect(145,174,130,34,0,'#0b2939ed');
 text('EARNED $'+roundEarnings,210,190,15,C.yellow,'center',950,0,129);
 if(messageTimer>0&&combo<=1){
  roundRect(80,131,260,34,0,'#061d2ce5');
  text(message,210,147,12,C.cream,'center',900);
 }
 const px=Math.round(pointer.x/4)*4,py=Math.round(pointer.y/4)*4;
 ctx.strokeStyle='#fff6cd';ctx.lineWidth=3;ctx.strokeRect(px-12,py-12,24,24);
 ctx.fillStyle='#fff6cd';ctx.fillRect(px-23,py-2,8,4);ctx.fillRect(px+15,py-2,8,4);
 ctx.fillRect(px-2,py-23,4,8);ctx.fillRect(px-2,py+15,4,8);
 bottomHint('TAP FISH • CHAIN HITS FOR x4');
 button('II',362,124,42,37,()=>pauseGame('MANUAL'),C.cream);
}
function decoFish(){const float=clock;
 fish(58,380,1,1,2.1,float);fish(365,448,2,-1,1.7,float+2);fish(132,535,0,-1,1.4,float*1.5);fish(340,587,4,1,1,float+1);
 for(let i=0;i<20;i++){ctx.fillStyle='#9bfff47a';ctx.fillRect(Math.floor(((i*57+30)%W)/4)*4,Math.floor(((i*86+float*18)%H)/4)*4,4,4);}
}
function menu(){ambient(clock);decoFish();
 roundRect(85,49,250,34,0,'#0c496b','#80fff0',2);
 text('AN ORIGINAL ARCADE GAME',210,66,16,C.white,'center',900,0,236);
 if(titleLogo.complete&&titleLogo.naturalWidth>0){
  const width=305,height=width*titleLogo.naturalHeight/titleLogo.naturalWidth;
  ctx.drawImage(titleLogo,(W-width)/2,91,width,height);
 }else{
  // The game remains playable if the logo is still loading or unavailable.
  text('REEL',210,175,68,C.white,'center',900,0,370);
  text('TROUBLE!',210,248,51,C.white,'center',900,0,397);
 }
 roundRect(35,323,350,36,0,'#061c35f5','#19bedd',2);
 text('GO DEEP. GET FISH. GET RICH.',210,341,17,C.white,'center',900,0,330);
 panel(32,367,356,93);
 text('DODGE ON THE WAY DOWN',210,393,19,C.white,'center',900,0,326);
 text('CATCH UP • SHOOT FOR CASH',210,430,19,C.white,'center',900,0,326);
 roundRect(33,607,354,85,0,'#0b3048fa','#64eade',2);
 text(`WALLET  $${save.cash}`,104,636,16,C.yellow,'center',930);text(`BEST  $${save.best}`,308,636,16,C.mint,'center',930);
 text(inputChoice==='tilt'?'TILT TO STEER • TOUCH ALSO WORKS':'DRAG OR USE ARROW KEYS TO STEER',210,665,13,C.cream,'center',850,0,334);
 const progress=collectionProgress(save.collection);
 text('DISCOVERED '+progress.discovered+'/'+progress.total+' • '+progress.percentage+'% • '+progress.unlocked+' BADGES',210,478,14,C.mint,'center',900,0,379);
 button('CAST LINE',75,500,270,58,beginCast,C.yellow);
 button('FISH ENCYCLOPEDIA',77,563,266,39,()=>openCollection('fish'),C.teal);
 button('UPGRADES',37,712,170,45,()=>{state='shop';age=0;},C.cream);
 button('SETTINGS',217,712,166,45,()=>{state='settings';age=0;},C.cream);
}
function results(){ambient(clock);
 text('NICE CATCH!',210,123,43,C.yellow,'center',1000,-.8);
 text('BACK ON DRY LAND',210,167,17,C.white,'center',900,0,343);
 if(newFishThisCast||newBadgesThisCast)text('NEW: '+newFishThisCast+' FISH • '+newBadgesThisCast+' BADGES',210,195,13,C.yellow,'center',900);
 panel(35,217,350,264);
 text('THIS CAST',210,255,15,C.mint,'center',900,1.8);
 text('+$'+roundEarnings,210,327,73,C.cream,'center',1000,-3);
 line(64,373,356,373,'#397587');
 text('HITS / SHOTS',77,414,17,C.white,'left',900);text(landed+' / '+fired,343,414,19,C.cream,'right',900);
 text('BEST COMBO',77,452,17,C.white,'left',900);text('x'+Math.max(1,bestRoundCombo),343,452,19,C.yellow,'right',900);
 text(`WALLET: $${save.cash}`,210,520,19,C.yellow,'center',900);
 button('FISH AGAIN',64,567,292,62,beginCast,C.yellow);
 button('GEAR SHOP',25,647,178,53,()=>{state='shop';age=0;},C.cream);
 button('FISH BOOK',217,647,178,53,()=>openCollection('fish'),C.teal);
 button('MAIN MENU',120,715,180,40,()=>{state='menu';age=0;},'#5796a6');
}
function shop(){ambient(clock);text('GEAR SHOP',210,95,46,C.cream,'center',1000,-1.5);text('MAKE THE NEXT CAST COUNT',210,135,17,C.white,'center',900,0,354);
 roundRect(127,159,166,41,14,'#144457','#42818b');text(`YOUR CASH  $${save.cash}`,210,179,17,C.yellow);
 const types=['line','net','gun'];for(let i=0;i<3;i++){
 const type=types[i],cfg=upgradeConfig(type),y=220+i*143;
 panel(22,y,376,127);text(cfg.title,41,y+25,18,C.cream,'left',950);
 text('LVL '+cfg.level+'/'+MAXLVL,378,y+25,15,C.mint,'right',950,0,102);
 text(cfg.desc,41,y+54,17,C.white,'left',900,0,326);
 for(let k=0;k<MAXLVL;k++)roundRect(40+k*23,y+75,17,8,3,k<cfg.level?C.yellow:'#305567');
 if(cfg.level===MAXLVL){roundRect(263,y+70,115,42,12,'#346071');text('MAXED',320,y+91,16,C.cream);}
 else {const affordable=save.cash>=cfg.cost;button('$'+cfg.cost,267,y+69,110,43,()=>purchase(type),affordable?C.yellow:'#65818a');}
 }
 button('← BACK',108,673,204,58,()=>{state=castNumber&&save.total?'results':'menu';age=0;},C.cream);
 text('PROGRESS SAVED ON THIS DEVICE',210,755,16,C.white,'center',900,0,372);
}

function bookCard(kind,x,y){
 const entry=save.collection.fish[kind],found=Boolean(entry?.caught),meta=species[kind];
 const width=370,height=99;
 roundRect(x+3,y+4,width,height,0,'#041328');
 roundRect(x,y,width,height,0,'#072940',found?'#69ffe5':'#658a9e',2);
 ctx.fillStyle=found?'#29dfce':'#68899e';
 ctx.fillRect(x+4,y+5,6,height-10);
 ctx.save();
 if(!found){ctx.filter='brightness(0)';ctx.globalAlpha=.62;}
 fish(x+64,y+49,kind,1,1.15,clock*1.3);
 ctx.restore();
 // One column provides actual room for long names and readable 17–21px labels.
 text(found?meta.name:'UNKNOWN SPECIES',x+122,y+23,21,C.white,'left',900,0,232);
 text(found?fishRarity(kind):'NOT DISCOVERED',x+122,y+54,17,C.white,'left',900,0,232);
 text(found?'CAUGHT '+entry.caught:'CATCH TO UNLOCK',x+122,y+81,17,C.white,'left',900,0,232);
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
   roundRect(29,y,362,97,0,unlocked?'#135369':'#123e55',unlocked?C.yellow:'#75adbc',2);
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
 panel(31,155,358,453);
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
function settings(){
 ambient(clock);
 text('SETTINGS',210,85,42,C.cream,'center',1000);
 text('PHONE & INPUT',210,127,13,C.mint,'center',900,1.5);
 panel(23,151,374,488);
 text('STEERING',210,181,18,C.yellow,'center',950);
 button('TOUCH',43,206,161,48,useTouch,inputMode==='touch'?C.yellow:'#5796a6');
 button('TILT',215,206,161,48,enableTilt,inputMode==='tilt'?C.yellow:'#5796a6');
 text(inputMode==='tilt'?'SELECTED: TILT':'SELECTED: TOUCH',210,278,14,C.cream,'center',900);
 text(sensorStatus,210,305,13,C.mint,'center',900,0,345);
 if(inputMode==='tilt')button('RECENTER',122,326,176,41,recenterTilt,C.cream);
 else text('DRAG TO STEER DURING A CAST',210,350,17,C.white,'center',900,0,350);
 text('AUDIO',210,376,16,C.yellow,'center',950);
 button(soundEnabled?'SOUND FX: ON':'SOUND FX: OFF',94,395,232,38,toggleSound,soundEnabled?C.teal:C.cream);
 button(musicEnabled?'CHIPTUNE: ON':'CHIPTUNE: OFF',94,441,232,38,toggleMusic,musicEnabled?C.teal:C.cream);
 text('FEEDBACK',210,495,16,C.yellow,'center',950);
 button(lowFx?'FX: LOW':'FX: FULL',42,514,162,43,toggleEffects,lowFx?C.cream:C.teal);
 if(rumble.supported())button(rumbleEnabled?'RUMBLE: ON':'RUMBLE: OFF',214,514,162,43,toggleRumble,rumbleEnabled?C.teal:C.cream);
 else{roundRect(214,514,162,43,0,'#23445a','#90b4c0',2);text('RUMBLE N/A',295,536,15,C.cream,'center',900,0,150);}
 if(!isInstalled())button('INSTALL APP',104,566,212,48,installGame,C.yellow);
 else text('INSTALLED APP',210,587,15,C.yellow);
 text(installMessage,210,648,13,C.cream,'center',850,0,356);
 button('← BACK',62,682,296,59,()=>{state='menu';age=0;},C.yellow);
 text('TAP FISH • DRAG TO STEER',210,761,16,C.white,'center',900,0,370);
}
function pausedScene(){
 ctx.fillStyle='#06182cdd';ctx.fillRect(0,0,W,H);
 text('PAUSED',210,261,47,C.cream,'center',1000);
 text(pauseReason==='MANUAL'?'TAKE YOUR TIME':'GAME PAUSED AUTOMATICALLY',210,317,13,C.mint,'center',850);
 text('YOUR CATCH WILL NOT MOVE',210,353,12,C.muted,'center',800);
 button('RESUME',76,417,268,65,resumeGame,C.yellow);
 button('MAIN MENU',96,510,228,53,menuFromPause,C.cream);
}
function render(){hits=[];ctx.setTransform(1,0,0,1,0,0);
 ctx.save();if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));
 if(state==='menu')menu();else if(state==='descent'||state==='ascent')gameplay();else if(state==='shoot')shootScene();else if(state==='results')results();else if(state==='shop')shop();else if(state==='collection')collection();else if(state==='fishDetail')fishDetail();else if(state==='settings')settings();
 overlayParticles();drawSplashEffects(lastFrameDt);
 if(sceneFlash>0&&!lowFx){
   ctx.fillStyle='rgba(255,248,208,'+(Math.min(.23,sceneFlash))+')';
   ctx.fillRect(0,0,W,H);
 }
 ctx.restore();
 if(paused){hits=[];pausedScene();}
 display.setTransform(1,0,0,1,0,0);display.imageSmoothingEnabled=true;
 display.drawImage(sceneCanvas,0,0,canvas.width,canvas.height);}
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
 sound.unlock();pointerDown=true;pointer=pos(e);if(paused){activate(pointer.x,pointer.y);return;}if(state==='descent'||state==='ascent'){targetX=pointer.x;}else if(state==='shoot'){shootAt(pointer.x,pointer.y);}else{activate(pointer.x,pointer.y);}});
canvas.addEventListener('pointermove',e=>{if(paused)return;pointer=pos(e);if(pointerDown&&(state==='descent'||state==='ascent'))targetX=pointer.x;});
canvas.addEventListener('pointerup',()=>pointerDown=false);canvas.addEventListener('pointercancel',()=>pointerDown=false);
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
 last=0;
});
})();
