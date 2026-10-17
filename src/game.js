import { tiltAxis, tiltVelocity } from './tilt.js';
import { createArcadeAudio } from './audio.js';
import { setupPwa, canInstall, isInstalled, requestInstall } from './pwa.js';
import { weaponForLevel, pickShotTargets, nextCombo, shotPayout } from './shooting.js';
(() => {
'use strict';
const W=420,H=780,SEA=192, MAXLVL=5, PIXEL=2;
const canvas=document.getElementById('game'), display=canvas.getContext('2d',{alpha:false});
// Original game art is rasterised on a fixed, low-resolution pixel canvas.
const pixelCanvas=document.createElement('canvas');
pixelCanvas.width=W/PIXEL;pixelCanvas.height=H/PIXEL;
const ctx=pixelCanvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=false;
display.imageSmoothingEnabled=false;
const C={navy:'#07182c',deep:'#07334d',ocean:'#0b91b7',teal:'#20e3d0',mint:'#b9ffe8',cream:'#fff9df',yellow:'#ffe35b',coral:'#ff596c',pink:'#ff88d6',muted:'#c0eef3',ink:'#081b32'};
const species=[
 {name:'Guppy',value:10,color:'#ffc247',size:13},
 {name:'Mackerel',value:18,color:'#22dce4',size:16},
 {name:'Snapper',value:28,color:'#ff657a',size:18},
 {name:'Moonfish',value:42,color:'#b48aff',size:21},
 {name:'Sunfish',value:65,color:'#d4ff69',size:24},
 {name:'Phantom',value:95,color:'#a7fff4',size:22}
];
const initial={cash:0,total:0,best:0,upgrades:{line:0,net:0,gun:0}};
function loadSave(){try{const d=JSON.parse(localStorage.getItem('reel-trouble-save-v1')||localStorage.getItem('deep-end-save-v1'));if(!d||!d.upgrades)return structuredClone(initial);
return {cash:Math.max(0,Number(d.cash)||0),total:Math.max(0,Number(d.total)||0),best:Math.max(0,Number(d.best)||0),upgrades:{line:clamp(Number(d.upgrades.line)||0,0,MAXLVL),net:clamp(Number(d.upgrades.net)||0,0,MAXLVL),gun:clamp(Number(d.upgrades.gun)||0,0,MAXLVL)}};
}catch(_){return structuredClone(initial);}}
// Ask touch-screen players which steering method to use on first launch.
const mobileInput = window.matchMedia?.('(pointer: coarse)').matches ?? false;
setupPwa();
const reducedMotionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
function readPreferences(){
 try{
  const saved=JSON.parse(localStorage.getItem('reel-trouble-mobile-settings-v1') || '{}');
  return {sound:saved.sound!==false,music:saved.music!==false,lowFx:typeof saved.lowFx==='boolean'?saved.lowFx:reducedMotionPreference};
 }catch(_){return {sound:true,music:true,lowFx:reducedMotionPreference};}
}
const preferences=readPreferences();
let soundEnabled=preferences.sound, musicEnabled=preferences.music, lowFx=preferences.lowFx;
const sound=createArcadeAudio();
sound.setOptions({sound:soundEnabled,music:musicEnabled});
let installMessage='INSTALL AS AN APP FOR OFFLINE PLAY';
function savePreferences(){try{localStorage.setItem('reel-trouble-mobile-settings-v1',JSON.stringify({sound:soundEnabled,music:musicEnabled,lowFx}));}catch(_){}}
function toggleSound(){soundEnabled=!soundEnabled;savePreferences();sound.setOptions({sound:soundEnabled,music:musicEnabled});sound.unlock();}
function toggleMusic(){musicEnabled=!musicEnabled;savePreferences();sound.setOptions({sound:soundEnabled,music:musicEnabled});sound.unlock();}
function toggleEffects(){lowFx=!lowFx;savePreferences();shake=0;}
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
 paused=true;pauseReason=reason;pointerDown=false;keys.clear();sound.pause(true);
}
function resumeGame(){paused=false;pauseReason='';last=0;pointerDown=false;sound.pause(false);sound.unlock();}
function menuFromPause(){paused=false;pauseReason='';state='menu';age=0;last=0;sound.pause(false);}
let splashes=[],sceneFlash=0;
let save=loadSave(), state=mobileInput&&(inputChoice===null||(inputChoice==='tilt'&&permissionPrompt))?'settings':'menu', age=0, clock=0, depth=0, maxDepth=720, hookX=W/2,targetX=W/2, fishes=[], caught=[], airborne=[], particles=[], labels=[], hits=[], roundEarnings=0, fired=0, shootTime=0, castNumber=0, message='', messageTimer=0, pointerDown=false, pointer={x:W/2,y:H/2}, keys=new Set(), waveT=0, shake=0;
function persist(){try{localStorage.setItem('reel-trouble-save-v1',JSON.stringify(save));}catch(_){}}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
const rand=(a,b)=>a+Math.random()*(b-a);
const irand=(a,b)=>Math.floor(rand(a,b+1));
// Square-corner arcade panels.
function roundRect(x,y,w,h,_r,fill,stroke,lw=2){
 x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);
 if(fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.strokeRect(x+lw/2,y+lw/2,w-lw,h-lw);}
}
function text(s,x,y,size=20,color=C.cream,align='center',weight=800,letter=0){ctx.save();ctx.textAlign=align;ctx.textBaseline='middle';ctx.font=`${weight} ${size}px ui-monospace,Consolas,monospace`;if(letter)ctx.letterSpacing=letter+'px';ctx.fillStyle=color;ctx.fillText(String(s),x,y);ctx.restore();}
function line(x1,y1,x2,y2,color,width=2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function polygon(points,fill){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
function button(title,x,y,w,h,action,color=C.coral,secondary=''){
 // Pixel bevel, accent shine and offset shadow rather than soft vector glow.
 roundRect(x+5,y+6,w,h,0,'#041322');
 roundRect(x,y,w,h,0,color,'#061a2c',3);
 ctx.fillStyle='#ffffff60';ctx.fillRect(x+6,y+5,w-12,5);
 ctx.fillStyle='#061a2c38';ctx.fillRect(x+7,y+h-11,w-14,5);
 ctx.fillStyle='#fffaf6a8';ctx.fillRect(x+10,y+13,7,7);ctx.fillRect(x+w-18,y+13,7,7);
 text(title,x+w/2,y+h/2-(secondary?7:0),secondary?16:19,color===C.cream?C.ink:C.navy,'center',950,0);
 if(secondary)text(secondary,x+w/2,y+h/2+14,10,C.ink,'center',700);
 hits.push({x,y,w,h,action});
}
function panel(x,y,w,h){
 roundRect(x+4,y+5,w,h,0,'#041625');
 roundRect(x,y,w,h,0,'#12465d','#36d9cb',3);
 ctx.fillStyle='#54f0df';ctx.fillRect(x+4,y+4,Math.max(0,w-8),4);
 ctx.fillStyle='#19738c';ctx.fillRect(x+4,y+h-9,Math.max(0,w-8),5);
 ctx.fillStyle='#ffe35b';ctx.fillRect(x+12,y+12,10,4);
}
function ambient(t,submerged=true){
 const bands=submerged?
 ['#126d85','#116a84','#105f7e','#0e5274','#0b4568','#093959','#082d4a','#061b36']:
 ['#254879','#275486','#31638b','#2a6484','#20526f','#163e62','#102f52','#081b36'];
 for(let i=0;i<bands.length;i++){ctx.fillStyle=bands[i];ctx.fillRect(0,i*98,W,99);}
 // Distant pixel skyline and glowing sea grass anchor the menu and shop.
 for(let layer=0;layer<3;layer++){
  ctx.fillStyle=['#167891','#0b5c79','#083c60'][layer];
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
 ['#833f38','#e68a36','#ffbd43','#fff3a2'], // Golden guppy
 ['#104f82','#178ebd','#24dbea','#b3ffff'], // Electric mackerel
 ['#7b345e','#d8406d','#ff6473','#ffc0ae'], // Coral snapper
 ['#482b7b','#8552c8','#b18bff','#f3d1ff'], // Neon moonfish
 ['#4e6b2f','#88bf42','#d1f76a','#fdffa4'], // Sunfish
 ['#176b82','#48bec3','#a9fff0','#ffffff']  // Ghostly phantom
];
function fish(x,y,kind=0,dir=1,scale=1,phase=0){
 const r=species[kind].size*scale,step=r/8,palette=fishPalette[kind];
 const tail=Math.sin(phase*2.5)>0?1:-1,fin=Math.sin(phase*1.8)>0?1:-1;
 ctx.save();ctx.translate(Math.round(x),Math.round(y+Math.sin(phase)*2));ctx.scale(dir,1);
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
 // Saturated near-surface aquas taper into blue: fish remain the brightest shapes.
 const bands=['#1599ae','#118daa','#0e82a8','#10749e','#0d658f','#0b567e','#094970','#083a61','#072b4e'];
 for(let i=0;i<bands.length;i++){ctx.fillStyle=bands[i];ctx.fillRect(0,i*90,W,91);}
 if(surf>0){
  ctx.fillStyle='#a7ffe0';ctx.fillRect(0,0,W,Math.min(H,surf));
  ctx.fillStyle='#20bccc';ctx.fillRect(0,surf,W,10);
  for(let x=0;x<W;x+=24){
   ctx.fillStyle=x%48===0?'#fff7a5':'#c6fff1';
   ctx.fillRect(x,surf+(Math.floor(x/24+waveT*2)%3)*3,15,3);
  }
 }
 // Pixel caustics, shafts and tiny light flecks move at different speeds.
 ctx.fillStyle='#a7fff018';
 for(let i=0;i<5;i++){
  const x=i*108+Math.floor(waveT*2)%24-80;
  for(let j=0;j<15;j++)ctx.fillRect(x-j*9,Math.max(0,surf)+j*60,28,56);
 }
 for(let i=0;i<50;i++){
  const x=Math.floor(((11+i*73.27)%W)/3)*3;
  const y=Math.floor((((i*159)+waveT*(10+i%7))%(H+30))-15)/3*3;
  ctx.fillStyle=i%8===0?'#ffe995a6':i%4===0?'#bbfff1a6':'#7fe9ef51';
  ctx.fillRect(x,y,i%5?3:6,i%5?3:6);
  if(i%8===0){ctx.fillRect(x-3,y+1,2,2);ctx.fillRect(x+7,y+1,2,2);}
 }
 for(let i=0;i<7;i++){
  const y=Math.round((i*170+SEA-camera+35)/4)*4;
  if(y>0&&y<H){ctx.fillStyle='#d5fff03f';for(let x=12;x<W-12;x+=21)ctx.fillRect(x,y,10,3);}
 }
 // Shallow coral silhouettes provide colour without obscuring gameplay fish.
 for(let k=0;k<12;k++){
  const x=k*43-14,h=35+(k%5)*9;
  ctx.fillStyle=k%3===0?'#e45d88':k%3===1?'#179aaf':'#28bea9';
  ctx.fillRect(x,H-h,8,h);
  ctx.fillRect(x-9,H-h+13,26,6);
  ctx.fillRect(x+(k%2?9:-8),H-h-9,7,23);
  ctx.fillStyle='#a3fff0';ctx.fillRect(x,H-h,8,5);
 }
}
function meter(n){return `${Math.round(n/6)}m`;}
function beginCast(){
 paused=false;pauseReason='';sound.pause(false);
 splashes=[];emitSplash(210,SEA+5,'#d8ffff',1.6);sceneFlash=.23;
 sound.play('splash');
 castNumber++;state='descent';age=0;roundEarnings=0;fired=0;combo=0;bestRoundCombo=0;lastComboHit=-Infinity;landed=0;shotEffects=[];recoil=0;muzzleFlash=0;maxDepth=720+save.upgrades.line*240;depth=0;hookX=210;targetX=210;fishes=[];caught=[];airborne=[];particles=[];labels=[];
 const count=Math.floor(maxDepth/39);for(let i=0;i<count;i++){
 const d=165+i*(maxDepth-180)/Math.max(count-1,1)+rand(-14,14);
 const kind=clamp(Math.floor((d/maxDepth)*5 + rand(-.7,1)),0,5);
 fishes.push({id:i, x:rand(40,W-42),d,kind,dir:Math.random()<.5?-1:1,speed:rand(7,22),phase:rand(0,7),caught:false});
 }
 message='DODGE THE FISH!';messageTimer=2.1;}
function startAscent(hitFish){if(state!=='descent')return;
 state='ascent';age=0;message='REEL THEM IN!';messageTimer=1.9;if(hitFish)catchFish(hitFish);
 else if(!caught.length){const nearest=fishes.filter(f=>!f.caught).sort((a,b)=>Math.abs(a.d-depth)-Math.abs(b.d-depth))[0];if(nearest)catchFish(nearest);}
 sound.play('reel');sceneFlash=.16;}
function catchFish(f){
 if(f.caught)return;f.caught=true;
 caught.push({kind:f.kind,value:species[f.kind].value});
 const camera=clamp(depth-230,0,maxDepth+100),hy=SEA+depth-camera;
 burst(hookX,hy,C.yellow,12);emitSplash(hookX,hy,species[f.kind].color,.55);
 sound.play('catch',{pitch:f.kind});
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
   burst(f.x,f.y,species[f.kind].color,26);
   floatLabel('+$'+money+(streak.multiplier>1?' x'+streak.multiplier:''),f.x,f.y-22,C.yellow);
  }
  shake=clamp(shake+2+actual.length*1.4,0,7);
  sceneFlash=Math.max(sceneFlash,.09);sound.play('hit',{pitch:gun.tier});
  if(combo>=2){floatLabel('COMBO x'+streak.multiplier,210,177,C.mint);sound.play('combo');}
  persist();
 }else{
  // A miss breaks the streak; ammunition stays unlimited.
  burst(x,y,'#e8f6e7',5);floatLabel('MISS',x,y-18,C.cream);
  shake=clamp(shake+1.4,0,7);sound.play('miss');
 }
 if(airborne.every(f=>f.shot))setTimeoutSafe(endRound,380);
}
let endDelay=0;function setTimeoutSafe(_fn,seconds){endDelay=Math.max(endDelay,seconds/1000);}
function endRound(){if(state!=='shoot')return;state='results';age=0;endDelay=0;shotEffects=[];recoil=0;muzzleFlash=0;particles=[];labels=[];save.best=Math.max(save.best,roundEarnings);persist();sound.play('results');}
function purchase(type){const cfg=upgradeConfig(type);if(cfg.level>=MAXLVL||save.cash<cfg.cost)return;
 save.cash-=cfg.cost;save.upgrades[type]++;persist();burst(210,350,C.yellow,18);sound.play('upgrade');}
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
 if(inputMode==='tilt'&&tiltStartedAt>-1e5&&clock-tiltStartedAt>3&&clock-tiltUpdatedAt>2&&sensorStatus==='WAITING FOR MOTION SENSOR')sensorStatus='NO SENSOR DATA - DRAG TO STEER';
 if(state==='descent'||state==='ascent'){
 // Hold the phone level for neutral, tilt sideways for acceleration.
 // Drag always overrides tilt while a finger is on the screen.
 if(!pointerDown&&sensorFresh())targetX+=tiltVelocity(tiltValue,tiltNeutral)*dt;
 if(keys.has('ArrowLeft')||keys.has('a'))targetX-=270*dt;
 if(keys.has('ArrowRight')||keys.has('d'))targetX+=270*dt;
 targetX=clamp(targetX,24,W-24);hookX+=(targetX-hookX)*clamp(9*dt,0,1);
 for(const f of fishes){if(f.caught)continue;f.x+=f.dir*f.speed*dt;f.phase+=dt*(2.4+f.kind*.2);
 f.swimY=Math.sin(f.phase*1.6+f.id*.7)*(2.8+f.kind*.65);if(f.x<29){f.x=29;f.dir=1;}if(f.x>W-29){f.x=W-29;f.dir=-1;}}
 if(state==='descent'){
 depth+= (162+save.upgrades.line*6)*dt;
 const collided=depth<225?null:fishes.find(f=>!f.caught&&Math.abs(f.d-depth)<20&&Math.abs(f.x-hookX)<(18+species[f.kind].size*.75));
 if(collided)startAscent(collided);else if(depth>=maxDepth){depth=maxDepth;startAscent(null);}
 }else{
 depth-=240*dt;
 const radius=24+save.upgrades.net*13;
 for(const f of fishes)if(!f.caught&&Math.abs(f.d-depth)<27&&Math.abs(f.x-hookX)<radius+species[f.kind].size*.5)catchFish(f);
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
 const count=lowFx?5:Math.round(10*intensity);
 for(let i=0;i<count;i++){
  const a=Math.PI+rand(-1.25,1.25),speed=rand(55,210)*intensity;
  const life=rand(.28,.68);
  splashes.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life,max:life,color,size:irand(3,7)});
 }
}
function drawSplashEffects(dt){
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
function topBar(title,left,right){roundRect(14,19,W-28,51,13,'#061d2bdc','#4c899078');text(title,28,45,15,C.cream,'left',950,1);text(right,392,45,17,C.yellow,'right',850);if(left)text(left,218,45,12,C.muted,'center',750);}
function bottomHint(hint){roundRect(21,716,378,43,12,'#071c2be5','#35717d');text(hint,210,738,13,C.mint,'center',790);}
function gameplay(){const camera=clamp(depth-230,0,maxDepth+100);
 bgUndersea(camera);const surf=SEA-camera;
 if(surf>45&&surf<H+60){boat(W/2,surf-7);}
 const reelY=surf-35,hy=SEA+depth-camera;
 line(W/2,Math.max(-20,reelY),hookX,hy,'#e3debbd9',1.5);
 for(const f of fishes){if(f.caught)continue;const fy=SEA+f.d-camera;if(fy<-40||fy>H+40)continue;fish(f.x,fy+(f.swimY||0),f.kind,f.dir,1,f.phase);}
 caught.forEach((f,i)=>{fish(hookX+Math.sin(clock*3+i)*12,hy+35+i*20,f.kind,i%2?-1:1,.6,clock*4+i);});
 hook(hookX,hy);
 topBar(state==='descent'?'DIVING ↓':'REELING ↑','',`${meter(depth)} / ${meter(maxDepth)}`);
 roundRect(28,85,364,9,5,'#052e3c','#32758b');roundRect(30,87,Math.max(3,360*depth/maxDepth),5,3,state==='descent'?C.yellow:C.teal);
 if(state==='ascent'){roundRect(139,110,142,40,11,'#092d3edc');text('HOOKED  '+caught.length,210,130,16,C.yellow);}
 if(messageTimer>0){roundRect(82,166,256,37,12,'#061d2cf0');text(message,210,184,15,C.cream,'center',950,.5);}
 bottomHint((sensorFresh()?'TILT TO STEER':'DRAG TO STEER')+' • '+(state==='descent'?'AVOID FISH':'CATCH FISH'));
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
 const sky=['#293d83','#494b98','#7255a5','#a860ad','#e77c9c','#ff9b8c','#ffba77','#ffe0a0'];
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
 text(gun.name,204,98,13,gun.color,'center',950);
 if(combo>1){
  roundRect(121,127,178,36,0,'#06223ced','#ffe35b');
  text('COMBO x'+Math.min(4,combo),210,145,17,C.yellow);
 }
 roundRect(145,174,130,34,0,'#0b2939ed');
 text('EARNED $'+roundEarnings,210,190,13,C.yellow);
 if(messageTimer>0&&combo<=1){
  roundRect(80,131,260,34,0,'#061d2ce5');
  text(message,210,147,12,C.cream,'center',900);
 }
 const px=Math.round(pointer.x/4)*4,py=Math.round(pointer.y/4)*4;
 ctx.strokeStyle='#fff6cd';ctx.lineWidth=3;ctx.strokeRect(px-12,py-12,24,24);
 ctx.fillStyle='#fff6cd';ctx.fillRect(px-23,py-2,8,4);ctx.fillRect(px+15,py-2,8,4);
 ctx.fillRect(px-2,py-23,4,8);ctx.fillRect(px-2,py+15,4,8);
 bottomHint('TAP FISH TO SHOOT  |  CHAIN HITS FOR x4');
 button('II',362,124,42,37,()=>pauseGame('MANUAL'),C.cream);
}
function decoFish(){const float=clock;
 fish(58,380,1,1,2.1,float);fish(365,448,2,-1,1.7,float+2);fish(132,535,0,-1,1.4,float*1.5);fish(340,587,4,1,1,float+1);
 for(let i=0;i<20;i++){ctx.fillStyle='#9bfff47a';ctx.fillRect(Math.floor(((i*57+30)%W)/4)*4,Math.floor(((i*86+float*18)%H)/4)*4,4,4);}
}
function menu(){ambient(clock);decoFish();
 roundRect(111,69,198,30,20,'#127ea0','#24f0d6');text('AN ORIGINAL ARCADE GAME',210,84,10,C.mint,'center',900,1.2);
 text('REEL',214,172,68,'#093652','center',1000,-2);text('TROUBLE!',214,244,51,'#093652','center',1000,-2);
 text('REEL',210,168,68,C.cream,'center',1000,-2);text('TROUBLE!',210,240,51,C.coral,'center',1000,-2);
 text('GO DEEP. GET FISH. GET RICH.',210,286,14,C.yellow,'center',950,1.25);
 panel(32,320,356,144);
 text('01  DODGE ON THE WAY DOWN',210,346,13,C.cream,'center',900,.2);
 text('02  CATCH ON THE WAY UP',210,389,13,C.cream,'center',900,.2);
 text('03  SHOOT THE FLYING CATCH',210,431,13,C.cream,'center',900,.2);
 roundRect(33,607,354,85,14,'#082637de','#4c828e');
 text(`WALLET  $${save.cash}`,104,636,16,C.yellow,'center',930);text(`BEST  $${save.best}`,308,636,16,C.mint,'center',930);
 text(inputChoice==='tilt'?'TILT TO STEER • TOUCH ALSO WORKS':'DRAG OR USE ARROW KEYS TO STEER',210,665,11,C.muted,'center',700);
 button('CAST LINE',75,493,270,64,beginCast,C.yellow);
 button('UPGRADES',37,712,170,45,()=>{state='shop';age=0;},C.cream);
 button('SETTINGS',217,712,166,45,()=>{state='settings';age=0;},C.cream);
}
function results(){ambient(clock);
 text('NICE CATCH!',210,123,43,C.yellow,'center',1000,-.8);
 text('BACK ON DRY LAND',210,167,12,C.muted,'center',850,2);
 panel(35,217,350,264);
 text('THIS CAST',210,255,15,C.mint,'center',900,1.8);
 text('+$'+roundEarnings,210,327,73,C.cream,'center',1000,-3);
 line(64,373,356,373,'#397587');
 text('HITS / SHOTS',77,414,12,C.muted,'left',800);text(landed+' / '+fired,343,414,19,C.cream,'right',900);
 text('BEST COMBO',77,452,12,C.muted,'left',800);text('x'+Math.max(1,bestRoundCombo),343,452,19,C.yellow,'right',900);
 text(`WALLET: $${save.cash}`,210,520,19,C.yellow,'center',900);
 button('FISH AGAIN',64,567,292,62,beginCast,C.yellow);
 button('GEAR SHOP',75,647,270,53,()=>{state='shop';age=0;},C.cream);
 button('MAIN MENU',120,715,180,40,()=>{state='menu';age=0;},'#5796a6');
}
function shop(){ambient(clock);text('GEAR SHOP',210,95,46,C.cream,'center',1000,-1.5);text('MAKE THE NEXT CAST COUNT',210,135,12,C.muted,'center',850,1.3);
 roundRect(127,159,166,41,14,'#144457','#42818b');text(`YOUR CASH  $${save.cash}`,210,179,17,C.yellow);
 const types=['line','net','gun'];for(let i=0;i<3;i++){
 const type=types[i],cfg=upgradeConfig(type),y=220+i*143;
 panel(22,y,376,127);text(cfg.title,41,y+25,18,C.cream,'left',950);
 text('LVL '+cfg.level+'/'+MAXLVL,378,y+25,12,C.mint,'right',850);
 text(cfg.desc,41,y+54,12,C.muted,'left',680);
 for(let k=0;k<MAXLVL;k++)roundRect(40+k*23,y+75,17,8,3,k<cfg.level?C.yellow:'#305567');
 if(cfg.level===MAXLVL){roundRect(263,y+70,115,42,12,'#346071');text('MAXED',320,y+91,16,C.cream);}
 else {const affordable=save.cash>=cfg.cost;button('$'+cfg.cost,267,y+69,110,43,()=>purchase(type),affordable?C.yellow:'#65818a');}
 }
 button('← BACK',108,673,204,58,()=>{state=castNumber&&save.total?'results':'menu';age=0;},C.cream);
 text('PROGRESS IS SAVED ON THIS DEVICE',210,755,10,C.muted,'center',700);
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
 text(sensorStatus,210,305,10,C.mint,'center',800);
 if(inputMode==='tilt')button('RECENTER',122,326,176,41,recenterTilt,C.cream);
 else text('DRAG THE SCREEN DURING A CAST',210,350,11,C.muted,'center',800);
 text('AUDIO',210,376,16,C.yellow,'center',950);
 button(soundEnabled?'SOUND FX: ON':'SOUND FX: OFF',94,395,232,38,toggleSound,soundEnabled?C.teal:C.cream);
 button(musicEnabled?'CHIPTUNE: ON':'CHIPTUNE: OFF',94,441,232,38,toggleMusic,musicEnabled?C.teal:C.cream);
 text('ANIMATION',210,500,16,C.yellow,'center',950);
 button(lowFx?'EFFECTS: LOW':'EFFECTS: FULL',94,514,232,38,toggleEffects,lowFx?C.cream:C.teal);
 if(!isInstalled())button('INSTALL APP',104,566,212,48,installGame,C.yellow);
 else text('INSTALLED APP',210,587,15,C.yellow);
 text(installMessage,210,648,10,C.mint,'center',750);
 button('← BACK',62,682,296,59,()=>{state='menu';age=0;},C.yellow);
 text('TAP FISH TO SHOOT • DRAG ALWAYS WORKS',210,763,10,C.muted,'center',700);
}
function pausedScene(){
 ctx.fillStyle='#06182cdd';ctx.fillRect(0,0,W,H);
 text('PAUSED',210,261,47,C.cream,'center',1000);
 text(pauseReason==='MANUAL'?'TAKE YOUR TIME':'GAME PAUSED AUTOMATICALLY',210,317,13,C.mint,'center',850);
 text('YOUR CATCH WILL NOT MOVE',210,353,12,C.muted,'center',800);
 button('RESUME',76,417,268,65,resumeGame,C.yellow);
 button('MAIN MENU',96,510,228,53,menuFromPause,C.cream);
}
function render(){hits=[];ctx.setTransform(pixelCanvas.width/W,0,0,pixelCanvas.height/H,0,0);
 ctx.save();if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));
 if(state==='menu')menu();else if(state==='descent'||state==='ascent')gameplay();else if(state==='shoot')shootScene();else if(state==='results')results();else if(state==='shop')shop();else if(state==='settings')settings();
 overlayParticles();drawSplashEffects(lastFrameDt);
 if(sceneFlash>0&&!lowFx){
   ctx.fillStyle='rgba(255,248,208,'+(Math.min(.23,sceneFlash))+')';
   ctx.fillRect(0,0,W,H);
 }
 ctx.restore();
 if(paused){hits=[];pausedScene();}
 display.setTransform(1,0,0,1,0,0);display.imageSmoothingEnabled=false;
 display.drawImage(pixelCanvas,0,0,canvas.width,canvas.height);}
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
 if(document.hidden){pauseGame('BACKGROUND');keys.clear();pointerDown=false;sound.pause(true);}
 last=0;
});
})();
