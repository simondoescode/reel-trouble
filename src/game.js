import { tiltAxis, tiltVelocity } from './tilt.js';
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
const C={navy:'#071b2b',deep:'#062b3d',ocean:'#0c6075',teal:'#46d0bf',mint:'#a8edd1',cream:'#fbf2d6',yellow:'#ffd280',coral:'#ff7765',pink:'#fc9c9b',muted:'#9dc5c5',ink:'#102b38'};
const species=[
 {name:'Guppy',value:10,color:'#ffd87f',size:13},
 {name:'Mackerel',value:18,color:'#8dd7c8',size:16},
 {name:'Snapper',value:28,color:'#ff927a',size:18},
 {name:'Moonfish',value:42,color:'#beaae8',size:21},
 {name:'Sunfish',value:65,color:'#f5d783',size:24},
 {name:'Phantom',value:95,color:'#b2eef1',size:22}
];
const initial={cash:0,total:0,best:0,upgrades:{line:0,net:0,gun:0}};
function loadSave(){try{const d=JSON.parse(localStorage.getItem('reel-trouble-save-v1')||localStorage.getItem('deep-end-save-v1'));if(!d||!d.upgrades)return structuredClone(initial);
return {cash:Math.max(0,Number(d.cash)||0),total:Math.max(0,Number(d.total)||0),best:Math.max(0,Number(d.best)||0),upgrades:{line:clamp(Number(d.upgrades.line)||0,0,MAXLVL),net:clamp(Number(d.upgrades.net)||0,0,MAXLVL),gun:clamp(Number(d.upgrades.gun)||0,0,MAXLVL)}};
}catch(_){return structuredClone(initial);}}
// Ask touch-screen players which steering method to use on first launch.
const mobileInput = window.matchMedia?.('(pointer: coarse)').matches ?? false;
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
let save=loadSave(), state=mobileInput&&(inputChoice===null||(inputChoice==='tilt'&&permissionPrompt))?'settings':'menu', age=0, clock=0, depth=0, maxDepth=720, hookX=W/2,targetX=W/2, fishes=[], caught=[], airborne=[], particles=[], labels=[], hits=[], roundEarnings=0, fired=0, ammo=0, shootTime=0, castNumber=0, message='', messageTimer=0, pointerDown=false, pointer={x:W/2,y:H/2}, keys=new Set(), waveT=0, shake=0;
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
 roundRect(x+5,y+6,w,h,0,'#03111c');roundRect(x,y,w,h,0,color,'#071b2b',3);
 ctx.fillStyle='#ffffff2e';ctx.fillRect(x+7,y+5,w-14,4);
 text(title,x+w/2,y+h/2-(secondary?7:0),secondary?16:19,color===C.cream?C.ink:C.navy,'center',950,0);
 if(secondary)text(secondary,x+w/2,y+h/2+14,10,C.ink,'center',700);
 hits.push({x,y,w,h,action});
}
function panel(x,y,w,h){roundRect(x,y,w,h,0,'#12384c','#36697c',3);ctx.fillStyle='#52bdba';ctx.fillRect(x+3,y+3,22,3);}
function ambient(t,submerged=true){
 const bands=submerged?['#0d4b60','#0c4559','#0b4053','#0a3b4f','#093549','#082f43','#072c40','#061e31']:
 ['#203b59','#1a3a58','#153c59','#14445b','#10495d','#0c3b52','#082d43','#061e31'];
 for(let i=0;i<bands.length;i++){ctx.fillStyle=bands[i];ctx.fillRect(0,i*98,W,99);}
 for(let layer=0;layer<3;layer++){
  ctx.fillStyle=['#184f61','#123f53','#0b3045'][layer];
  const baseline=636+layer*54;
  for(let x=0;x<W;x+=24){const top=baseline-((x*11+layer*53)%79);ctx.fillRect(x,top,24,H-top);}
 }
 for(let i=0;i<27;i++){
  const x=Math.floor(((i*157+34)%W)/4)*4;
  const y=Math.floor(((i*101+t*(9+i%3*5))%(H+18))/4)*4;
  ctx.fillStyle=i%4?'#4a98a06b':'#b8e8d18c';ctx.fillRect(x,y,i%5?4:6,i%5?4:6);
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
 ['#65402b','#ad773a','#e3b95c','#ffe4a4'],
 ['#2c5360','#4f9d9b','#76c8b7','#c8f6d5'],
 ['#723e53','#bd5e60','#ee8375','#ffd0a0'],
 ['#4b466e','#8173ac','#bba4e3','#e6ceff'],
 ['#6a5839','#af954b','#efce77','#fff4a8'],
 ['#27586b','#5c9faa','#ace2de','#e5ffef']
];
function fish(x,y,kind=0,dir=1,scale=1,phase=0){
 const r=species[kind].size*scale,step=r/8,palette=fishPalette[kind];
 const tail=(Math.sin(phase*2)>0)?1:0;
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
   const dx=(col-10)*step+(col<7?tail*step:0),dy=(row-5)*step;
   ctx.fillStyle=color;ctx.fillRect(dx,dy,step+.1,step+.1);
  }
 }
 ctx.fillStyle='#fff7d3';ctx.fillRect(7*step,-1.3*step,Math.max(1.3,step*.7),Math.max(1.3,step*.7));
 ctx.restore();
}
function boat(x,seaY){
 ctx.save();ctx.translate(Math.round(x),Math.round(seaY));
 ctx.fillStyle='#061d2b';ctx.fillRect(-70,-7,140,13);
 ctx.fillStyle='#823f46';ctx.fillRect(-53,12,106,10);
 ctx.fillStyle=C.coral;ctx.fillRect(-66,-8,132,18);ctx.fillRect(-54,10,108,7);
 ctx.fillStyle='#ffe19a';ctx.fillRect(-51,-6,102,4);
 ctx.fillStyle=C.cream;ctx.fillRect(-31,-37,64,28);
 ctx.fillStyle='#236a78';ctx.fillRect(-21,-30,17,15);ctx.fillRect(8,-30,17,15);
 ctx.fillStyle='#082b3b';ctx.fillRect(-17,-26,5,7);ctx.fillRect(12,-26,5,7);
 ctx.fillStyle=C.cream;ctx.fillRect(26,-70,5,36);
 ctx.fillStyle=C.yellow;ctx.fillRect(31,-67,24,7);ctx.fillRect(31,-60,16,9);ctx.fillRect(31,-51,8,6);
 ctx.restore();
}
function hook(x,y){
 ctx.save();ctx.translate(Math.round(x),Math.round(y));
 ctx.fillStyle=C.cream;ctx.fillRect(-2,-26,4,20);
 ctx.fillStyle=C.coral;ctx.fillRect(-4,-7,8,8);
 ctx.fillStyle=C.yellow;ctx.fillRect(-2,1,5,16);ctx.fillRect(2,14,15,6);
 ctx.fillRect(14,10,6,5);ctx.fillRect(19,6,5,7);ctx.fillRect(19,5,6,3);
 ctx.restore();
}
function bgUndersea(camera){
 const surf=SEA-camera;
 const bands=['#126779','#115e71','#105769','#0e4e62','#0c465b','#0b3d52','#093448','#082a40','#071f33'];
 for(let i=0;i<bands.length;i++){ctx.fillStyle=bands[i];ctx.fillRect(0,i*90,W,91);}
 if(surf>0){
  ctx.fillStyle='#a9e6d9';ctx.fillRect(0,0,W,Math.min(H,surf));
  ctx.fillStyle='#247e92';ctx.fillRect(0,surf,W,10);
  ctx.fillStyle='#c6f4da';for(let x=0;x<W;x+=24){
   ctx.fillRect(x,surf+(Math.floor(x/24+waveT*2)%3)*3,15,3);
  }
 }
 ctx.fillStyle='#d0f4df17';
 for(let i=0;i<5;i++){
  const x=(i*108+Math.floor(waveT*2)%24)-80;
  for(let j=0;j<15;j++)ctx.fillRect(x-j*9,Math.max(0,surf)+j*60,28,56);
 }
 for(let i=0;i<48;i++){
  const x=Math.floor((11+i*73.27)%W/3)*3;
  const y=Math.floor((((i*159)+waveT*(10+i%7))%(H+30))-15)/3*3;
  ctx.fillStyle=i%5?'#a8edd12e':'#a8edd172';ctx.fillRect(x,y,i%4?3:6,i%4?3:6);
 }
 for(let i=0;i<7;i++){
  const y=Math.round((i*170+SEA-camera+35)/4)*4;
  if(y>0&&y<H){ctx.fillStyle='#c0ecdf27';for(let x=12;x<W-12;x+=21)ctx.fillRect(x,y,9,2);}
 }
 ctx.fillStyle='#238579';for(let k=0;k<11;k++){
  const x=k*46-11;
  for(let j=0;j<7;j++)ctx.fillRect(x+Math.round(Math.sin(waveT+k+j*.65)*3)*3,H-12-j*9,5,10);
 }
}
function meter(n){return `${Math.round(n/6)}m`;}
function beginCast(){castNumber++;state='descent';age=0;roundEarnings=0;fired=0;maxDepth=720+save.upgrades.line*240;depth=0;hookX=210;targetX=210;fishes=[];caught=[];airborne=[];particles=[];labels=[];
 const count=Math.floor(maxDepth/39);for(let i=0;i<count;i++){
 const d=165+i*(maxDepth-180)/Math.max(count-1,1)+rand(-14,14);
 const kind=clamp(Math.floor((d/maxDepth)*5 + rand(-.7,1)),0,5);
 fishes.push({id:i, x:rand(40,W-42),d,kind,dir:Math.random()<.5?-1:1,speed:rand(7,22),phase:rand(0,7),caught:false});
 }
 message='DODGE THE FISH!';messageTimer=2.1;blip(260,.06,'sine');}
function startAscent(hitFish){if(state!=='descent')return;
 state='ascent';age=0;message='REEL THEM IN!';messageTimer=1.9;if(hitFish)catchFish(hitFish);
 else if(!caught.length){const nearest=fishes.filter(f=>!f.caught).sort((a,b)=>Math.abs(a.d-depth)-Math.abs(b.d-depth))[0];if(nearest)catchFish(nearest);}
 blip(520,.1,'triangle');}
function catchFish(f){if(f.caught)return;f.caught=true;caught.push({kind:f.kind,value:species[f.kind].value});burst(hookX,clamp(SEA+depth-(depth-230),100,680),C.yellow,8);blip(650+f.kind*55,.05,'sine');}
function beginShoot(){state='shoot';age=0;shootTime=10;ammo=9+save.upgrades.gun*5;message='TAP THE FLYING FISH!';messageTimer=2;
 airborne=caught.map((f,i)=>({kind:f.kind,value:f.value,x:clamp(60+i*41,65,350),y:630+rand(-25,30),vx:rand(-62,62),vy:rand(-255,-165),spin:rand(-1,1),phase:i,shot:false}));
 if(caught.length===0){endRound();return;}blip(880,.15,'sine');}
function shootAt(x,y){if(state!=='shoot'||ammo<=0)return;ammo--;fired++;let best=null,dist=Infinity;
 for(const f of airborne){if(f.shot)continue;const d=Math.hypot(x-f.x,y-f.y);if(d<dist){dist=d;best=f;}}
 if(best&&dist<95){best.shot=true;const money=best.value;roundEarnings+=money;save.cash+=money;save.total+=money;
 burst(best.x,best.y,species[best.kind].color,18);floatLabel('+$'+money,best.x,best.y-16,C.yellow);blip(380+best.kind*85,.12,'square');persist();
 }else{burst(x,y,'#e8f6e7',4);floatLabel('MISS',x,y-18,C.cream);blip(140,.05,'sawtooth');}
 if(airborne.every(f=>f.shot)||ammo<=0){setTimeoutSafe(endRound,380);}}
let endDelay=0;function setTimeoutSafe(_fn,seconds){endDelay=Math.max(endDelay,seconds/1000);}
function endRound(){if(state!=='shoot')return;state='results';age=0;endDelay=0;particles=[];labels=[];save.best=Math.max(save.best,roundEarnings);persist();blip(700,.16,'triangle');}
function purchase(type){const cfg=upgradeConfig(type);if(cfg.level>=MAXLVL||save.cash<cfg.cost)return;
 save.cash-=cfg.cost;save.upgrades[type]++;persist();burst(210,350,C.yellow,18);blip(770,.1,'triangle');}
function upgradeConfig(type){const titles={line:'LONGER LINE',net:'WIDER HOOK',gun:'MORE AMMO'},base={line:65,net:90,gun:85};const lvl=save.upgrades[type];
 return {title:titles[type],level:lvl,cost:Math.round(base[type]*Math.pow(1.75,lvl)),desc:{line:'+40m of depth per level',net:'Catch fish more easily',gun:'+5 shots per round'}[type]};}
function burst(x,y,color,count){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=rand(40,145);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.35,.8),max:.8,color,r:rand(1.8,4.2)});}}
function floatLabel(value,x,y,color){labels.push({value,x,y,color,life:1.1});}
let audio=null;function blip(freq=400,duration=.07,type='sine'){
 try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.62,audio.currentTime+duration);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch(_){}}
function update(dt){clock+=dt;waveT+=dt;age+=dt;shake=Math.max(0,shake-dt*20);if(messageTimer>0)messageTimer-=dt;
 if(inputMode==='tilt'&&tiltStartedAt>-1e5&&clock-tiltStartedAt>3&&clock-tiltUpdatedAt>2&&sensorStatus==='WAITING FOR MOTION SENSOR')sensorStatus='NO SENSOR DATA - DRAG TO STEER';
 if(state==='descent'||state==='ascent'){
 // Hold the phone level for neutral, tilt sideways for acceleration.
 // Drag always overrides tilt while a finger is on the screen.
 if(!pointerDown&&sensorFresh())targetX+=tiltVelocity(tiltValue,tiltNeutral)*dt;
 if(keys.has('ArrowLeft')||keys.has('a'))targetX-=270*dt;
 if(keys.has('ArrowRight')||keys.has('d'))targetX+=270*dt;
 targetX=clamp(targetX,24,W-24);hookX+=(targetX-hookX)*clamp(9*dt,0,1);
 for(const f of fishes){if(f.caught)continue;f.x+=f.dir*f.speed*dt;f.phase+=dt*2;if(f.x<29){f.x=29;f.dir=1;}if(f.x>W-29){f.x=W-29;f.dir=-1;}}
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
function overlayParticles(){for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.fillRect(Math.round(p.x/3)*3,Math.round(p.y/3)*3,Math.max(3,Math.round(p.r)*2),Math.max(3,Math.round(p.r)*2));}ctx.globalAlpha=1;for(const l of labels){ctx.globalAlpha=clamp(l.life,0,1);text(l.value,l.x,l.y,22,l.color,'center',950);}ctx.globalAlpha=1;}
function topBar(title,left,right){roundRect(14,19,W-28,51,13,'#061d2bdc','#4c899078');text(title,28,45,15,C.cream,'left',950,1);text(right,392,45,17,C.yellow,'right',850);if(left)text(left,218,45,12,C.muted,'center',750);}
function bottomHint(hint){roundRect(21,716,378,43,12,'#071c2be5','#35717d');text(hint,210,738,13,C.mint,'center',790);}
function gameplay(){const camera=clamp(depth-230,0,maxDepth+100);
 bgUndersea(camera);const surf=SEA-camera;
 if(surf>45&&surf<H+60){boat(W/2,surf-7);}
 const reelY=surf-35,hy=SEA+depth-camera;
 line(W/2,Math.max(-20,reelY),hookX,hy,'#e3debbd9',1.5);
 for(const f of fishes){if(f.caught)continue;const fy=SEA+f.d-camera;if(fy<-40||fy>H+40)continue;fish(f.x,fy,f.kind,f.dir,1,f.phase);}
 caught.forEach((f,i)=>{fish(hookX+Math.sin(clock*3+i)*12,hy+35+i*20,f.kind,i%2?-1:1,.6,clock*4+i);});
 hook(hookX,hy);
 topBar(state==='descent'?'DIVING ↓':'REELING ↑','',`${meter(depth)} / ${meter(maxDepth)}`);
 roundRect(28,85,364,9,5,'#052e3c','#32758b');roundRect(30,87,Math.max(3,360*depth/maxDepth),5,3,state==='descent'?C.yellow:C.teal);
 if(state==='ascent'){roundRect(139,110,142,40,11,'#092d3edc');text('HOOKED  '+caught.length,210,130,16,C.yellow);}
 if(messageTimer>0){roundRect(82,166,256,37,12,'#061d2cf0');text(message,210,184,15,C.cream,'center',950,.5);}
 bottomHint((sensorFresh()?'TILT TO STEER':'DRAG TO STEER')+' • '+(state==='descent'?'AVOID FISH':'CATCH FISH'));
}
function shootScene(){
 const sky=['#1e3554','#273d60','#334869','#4e6074','#987a82','#cc9184','#e8aa88','#f0be91'];
 for(let i=0;i<sky.length;i++){ctx.fillStyle=sky[i];ctx.fillRect(0,i*80,W,82);}
 ctx.fillStyle='#ffe3a5';
 for(let j=-7;j<=7;j++){const width=68-Math.round(Math.abs(j*j)*.9);ctx.fillRect(322-width,295+j*9,width*2,10);}
 ctx.fillStyle='#fff1be';for(let i=0;i<16;i++){
  const x=Math.floor(((i*137+29)%W)/4)*4,y=Math.floor(((i*91+17)%380)/4)*4;
  ctx.fillRect(x,y,3,3);
 }
 ctx.fillStyle='#284b60';for(let x=0;x<W;x+=18){const h=38+((x*13)%50);ctx.fillRect(x,596-h,18,H-596+h);}
 ctx.fillStyle='#0b5c72';ctx.fillRect(0,644,W,H-644);
 for(let x=0;x<W;x+=24){ctx.fillStyle=x%48?'#a9ddd1':'#438fa0';ctx.fillRect(x,644+(Math.floor(waveT*2+x/24)%3)*3,15,4);}
 boat(210,636);
 for(const f of airborne)if(!f.shot)fish(f.x,f.y,f.kind,f.vx<0?-1:1,1.55,clock*6+f.phase);
 topBar('SHOOT THE CATCH',`${Math.ceil(shootTime)}s`,'AMMO '+ammo);
 roundRect(146,82,128,35,0,'#0b2939d4');text('EARNED  $'+roundEarnings,210,100,14,C.yellow);
 if(messageTimer>0){roundRect(90,146,240,40,0,'#061d2ce5');text(message,210,166,13,C.cream,'center',900);}
 const px=Math.round(pointer.x/4)*4,py=Math.round(pointer.y/4)*4;
 ctx.strokeStyle='#fff0ca';ctx.lineWidth=3;ctx.strokeRect(px-12,py-12,24,24);
 ctx.fillStyle='#fff0ca';ctx.fillRect(px-23,py-2,8,4);ctx.fillRect(px+15,py-2,8,4);
 ctx.fillRect(px-2,py-23,4,8);ctx.fillRect(px-2,py+15,4,8);
 bottomHint('TAP NEAR FISH TO SHOOT • EACH SHOT COUNTS');
}
function decoFish(){const float=clock;
 fish(58,380,1,1,2.1,float);fish(365,448,2,-1,1.7,float+2);fish(132,535,0,-1,1.4,float*1.5);fish(340,587,4,1,1,float+1);
 for(let i=0;i<20;i++){ctx.fillStyle='#a2e0e442';ctx.fillRect(Math.floor(((i*57+30)%W)/4)*4,Math.floor(((i*86+float*18)%H)/4)*4,4,4);}
}
function menu(){ambient(clock);decoFish();
 roundRect(111,69,198,30,20,'#1b6675','#388f99');text('AN ORIGINAL ARCADE GAME',210,84,10,C.mint,'center',900,1.2);
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
 text('FISH CAUGHT',77,414,12,C.muted,'left',800);text(caught.length,343,414,19,C.cream,'right',900);
 text('DEEP DIVES',77,452,12,C.muted,'left',800);text(castNumber,343,452,19,C.cream,'right',900);
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
 text('SETTINGS',210,99,43,C.cream,'center',1000);
 text('CHOOSE YOUR INPUT',210,144,13,C.mint,'center',900,1.5);
 panel(24,187,372,396);
 text('STEERING',210,223,19,C.yellow,'center',950);
 button('TOUCH',43,260,161,55,useTouch,inputMode==='touch'?C.yellow:'#5796a6');
 button('TILT',215,260,161,55,enableTilt,inputMode==='tilt'?C.yellow:'#5796a6');
 text(inputMode==='tilt'?'SELECTED: TILT':'SELECTED: TOUCH',210,346,17,C.cream,'center',950);
 text(sensorStatus,210,382,11,C.mint,'center',800);
 text('TILT YOUR PHONE LEFT OR RIGHT',210,425,12,C.muted,'center',800);
 text('DRAG IS ALWAYS AVAILABLE',210,456,12,C.muted,'center',800);
 if(inputMode==='tilt')button('RECENTER TILT',89,495,242,54,recenterTilt,C.cream);
 else text('TAP TILT TO ALLOW MOTION ACCESS',210,521,11,C.yellow,'center',800);
 text('TAP FISH TO SHOOT - NO TILT AIMING',210,615,12,C.muted,'center',800);
 button('← BACK TO GAME',62,680,296,65,()=>{state='menu';age=0;},C.yellow);
}
function render(){hits=[];ctx.setTransform(pixelCanvas.width/W,0,0,pixelCanvas.height/H,0,0);
 ctx.save();if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));
 if(state==='menu')menu();else if(state==='descent'||state==='ascent')gameplay();else if(state==='shoot')shootScene();else if(state==='results')results();else if(state==='shop')shop();else if(state==='settings')settings();
 overlayParticles();ctx.restore();
 display.setTransform(1,0,0,1,0,0);display.imageSmoothingEnabled=false;
 display.drawImage(pixelCanvas,0,0,canvas.width,canvas.height);}
let last=0;function frame(t){const dt=Math.min((t-last)/1000||.016,.05);last=t;update(dt);render();requestAnimationFrame(frame);}requestAnimationFrame(frame);
function pos(e){const r=canvas.getBoundingClientRect();return{x:clamp((e.clientX-r.left)*W/r.width,0,W),y:clamp((e.clientY-r.top)*H/r.height,0,H)};}
function activate(x,y){for(let i=hits.length-1;i>=0;i--){const h=hits[i];if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h){h.action();return true;}}return false;}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.focus();try{canvas.setPointerCapture(e.pointerId);}catch(_){}
 pointerDown=true;pointer=pos(e);if(state==='descent'||state==='ascent'){targetX=pointer.x;}else if(state==='shoot'){shootAt(pointer.x,pointer.y);}else{activate(pointer.x,pointer.y);}});
canvas.addEventListener('pointermove',e=>{pointer=pos(e);if(pointerDown&&(state==='descent'||state==='ascent'))targetX=pointer.x;});
canvas.addEventListener('pointerup',()=>pointerDown=false);canvas.addEventListener('pointercancel',()=>pointerDown=false);
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.key);
 if(e.repeat)return;if(e.code==='Space'||e.code==='Enter'){
 if(state==='menu'||state==='results')beginCast();else if(state==='shoot')shootAt(pointer.x,pointer.y);
 }});window.addEventListener('keyup',e=>keys.delete(e.key));
window.addEventListener('blur',()=>{keys.clear();pointerDown=false;});
})();
