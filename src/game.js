(() => {
'use strict';
const W=420,H=780,SEA=192, MAXLVL=5, canvas=document.getElementById('game'), ctx=canvas.getContext('2d',{alpha:false});
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
let save=loadSave(), state='menu', age=0, clock=0, depth=0, maxDepth=720, hookX=W/2,targetX=W/2, fishes=[], caught=[], airborne=[], particles=[], labels=[], hits=[], roundEarnings=0, fired=0, ammo=0, shootTime=0, castNumber=0, message='', messageTimer=0, pointerDown=false, pointer={x:W/2,y:H/2}, keys=new Set(), waveT=0, shake=0;
function persist(){try{localStorage.setItem('reel-trouble-save-v1',JSON.stringify(save));}catch(_){}}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
const rand=(a,b)=>a+Math.random()*(b-a);
const irand=(a,b)=>Math.floor(rand(a,b+1));
function roundRect(x,y,w,h,r,fill,stroke,lw=1){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}}
function text(s,x,y,size=20,color=C.cream,align='center',weight=800,letter=0){ctx.save();ctx.textAlign=align;ctx.textBaseline='middle';ctx.font=`${weight} ${size}px system-ui,-apple-system,sans-serif`;if(letter)ctx.letterSpacing=letter+'px';ctx.fillStyle=color;ctx.fillText(String(s),x,y);ctx.restore();}
function line(x1,y1,x2,y2,color,width=2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function polygon(points,fill){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
function button(title,x,y,w,h,action,color=C.coral,secondary=''){
 roundRect(x,y+5,w,h,15,'#030b15');roundRect(x,y,w,h,15,color);
 text(title,x+w/2,y+h/2-(secondary?7:0),secondary?18:20,color===C.cream?C.ink:C.navy,'center',950,.2);
 if(secondary)text(secondary,x+w/2,y+h/2+14,11,C.ink,'center',700,.5);
 hits.push({x,y,w,h,action});
}
function panel(x,y,w,h){roundRect(x,y,w,h,18,'#12384c','#36697c',1);}
function ambient(t,submerged=true){ctx.fillStyle=C.navy;ctx.fillRect(0,0,W,H);
 const gradient=ctx.createLinearGradient(0,0,0,H);
 gradient.addColorStop(0,submerged?'#10596b':'#153e59');gradient.addColorStop(.55,'#0b445b');gradient.addColorStop(1,'#051b2c');ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
 for(let i=0;i<25;i++){const x=((i*177.37+30)%W),y=(i*127.1 +t*(8+i%4*3))% (H+30)-10;circle(x,y,1.5+(i%3),`rgba(186,245,222,${.09+(i%3)*.045})`);}
 for(let l=0;l<3;l++){ctx.fillStyle=['#12495c','#0d394c','#082b3d'][l];ctx.beginPath();ctx.moveTo(0,615+l*52);for(let x=0;x<=W;x+=15)ctx.lineTo(x,620+l*55+Math.sin(x/41+l*2)*14);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();}
}
function fish(x,y,kind=0,dir=1,scale=1,phase=0){const f=species[kind],r=f.size*scale;
 ctx.save();ctx.translate(x,y+Math.sin(phase)*2);ctx.scale(dir,1);
 const color=f.color;
 // Tail, dorsal fin, oval body and gill — all procedurally drawn original art.
 polygon([[-r*.65,0],[-r*1.5,-r*.68],[-r*1.38,r*.7]],color);
 polygon([[-r*.25,-r*.46],[-r*.1,-r*1.1],[r*.4,-r*.48]],color);
 ctx.beginPath();ctx.ellipse(0,0,r*1.13,r*.67,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
 ctx.beginPath();ctx.ellipse(-r*.1,r*.21,r*.58,r*.24,0,0,Math.PI);ctx.fillStyle='#fff7df55';ctx.fill();
 circle(r*.64,-r*.15,Math.max(2.2,r*.125),C.ink);circle(r*.68,-r*.19,1.2,C.cream);
 ctx.beginPath();ctx.arc(r*.26,0,r*.33,-1.05,1.05);ctx.strokeStyle='#12394d66';ctx.lineWidth=1.5;ctx.stroke();
 if(kind===5){ctx.strokeStyle='#c0f9e7';ctx.lineWidth=1.3;line(-r*.75,r*.2,-r*.9,r*1.1,'#c0f9e7',1.2);}
 ctx.restore();
}
function boat(x,seaY){ctx.save();ctx.translate(x,seaY);
 ctx.fillStyle='#15445b';ctx.beginPath();ctx.ellipse(0,8,68,8,0,0,Math.PI*2);ctx.fill();
 polygon([[-66,-10],[64,-10],[44,18],[-44,18]],C.coral);polygon([[-44,18],[44,18],[33,23],[-30,23]],'#993c40');
 roundRect(-28,-33,56,24,5,C.cream);roundRect(-17,-28,15,13,2,'#236a78');roundRect(7,-28,15,13,2,'#236a78');
 line(28,-33,28,-66,C.cream,3);polygon([[28,-64],[28,-38],[55,-40]],C.yellow);ctx.restore();}
function hook(x,y){ctx.save();ctx.translate(x,y);line(0,-25,0,7,C.cream,2.2);ctx.strokeStyle=C.yellow;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(0,10);ctx.bezierCurveTo(-1,30,25,29,19,13);ctx.stroke();polygon([[19,13],[14,19],[24,21]],C.yellow);circle(0,-5,4,C.coral);ctx.restore();}
function bgUndersea(camera){const surf=SEA-camera;ctx.fillStyle='#081e2c';ctx.fillRect(0,0,W,H);
 const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#125c6b');g.addColorStop(.4,'#0d4c61');g.addColorStop(1,'#052539');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 if(surf>-30){ctx.fillStyle='#a7e4d9';ctx.fillRect(0,0,W,Math.max(0,surf));ctx.fillStyle='#277e91';ctx.beginPath();ctx.moveTo(0,surf);
 for(let x=0;x<=W;x+=6)ctx.lineTo(x,surf+4*Math.sin(x/20+waveT*2));ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
 // underwater fill without overwriting gradient significantly
 const g2=ctx.createLinearGradient(0,surf,0,H);g2.addColorStop(0,'#13697ac9');g2.addColorStop(1,'#092a43f0');ctx.fillStyle=g2;ctx.fillRect(0,surf+7,W,H-surf);}
 ctx.save();ctx.globalAlpha=.085;ctx.strokeStyle='#c0ecdf';ctx.lineWidth=20;for(let i=0;i<6;i++){const x=i*113-80+Math.sin(waveT+i)*9;line(x,Math.max(surf,0),x-170,H,'#c0ecdf',12);}ctx.restore();
 for(let i=0;i<38;i++){const x=15+((i*73.27)%390),y=(((i*159)+waveT*(10+i%7))%(H+30))-15;circle(x,y,(i%4+1)*.7,`rgba(168,237,209,${.11+(i%3)*.06})`);}
 for(let i=0;i<7;i++){const y=(i*170+SEA-camera+35);if(y>0&&y<H){ctx.save();ctx.setLineDash([5,9]);line(12,y,408,y,'#caeee31f',1);ctx.restore();}}
 // sea bed weeds and dim silhouette
 ctx.save();ctx.globalAlpha=.26;for(let k=0;k<11;k++){const bx=k*52-14;line(bx,H,bx+9+Math.sin(waveT+k)*7,H-35-(k%4)*14,'#3bc1af',3);}ctx.restore();
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
 if(state==='descent'||state==='ascent'){
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
function overlayParticles(){for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);circle(p.x,p.y,p.r,p.color);}ctx.globalAlpha=1;for(const l of labels){ctx.globalAlpha=clamp(l.life,0,1);text(l.value,l.x,l.y,22,l.color,'center',950);}ctx.globalAlpha=1;}
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
 bottomHint(state==='descent'?'DRAG TO STEER • AVOID FISH':'DRAG TO STEER • CATCH FISH');
}
function shootScene(){// Sundown shooting scene
 const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#193a5c');g.addColorStop(.58,'#477987');g.addColorStop(.82,'#ecad8a');g.addColorStop(1,'#11677a');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 circle(322,295,68,'#ffd99e');for(let i=0;i<14;i++){circle((i*197+35)%W,(i*103+17)%440,1.1,'#e7fff8');}
 polygon([[0,585],[65,552],[130,580],[214,540],[288,578],[355,540],[420,576],[420,H],[0,H]],'#284b60');
 ctx.fillStyle='#0b5c72';ctx.fillRect(0,644,W,H-644);ctx.strokeStyle='#abddd1';ctx.lineWidth=2;ctx.beginPath();for(let x=0;x<=W;x+=8){const y=642+4*Math.sin(x/20+waveT*2);x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();boat(210,636);
 for(const f of airborne)if(!f.shot)fish(f.x,f.y,f.kind,f.vx<0?-1:1,1.55,clock*6+f.phase);
 topBar('SHOOT THE CATCH',`${Math.ceil(shootTime)}s`,'AMMO '+ammo);
 roundRect(146,82,128,35,11,'#0b2939d4');text('EARNED  $'+roundEarnings,210,100,14,C.yellow);
 if(messageTimer>0){roundRect(90,146,240,40,13,'#061d2ce5');text(message,210,166,13,C.cream,'center',900);}
 // sight follows pointer
 ctx.strokeStyle='#fff0cacc';ctx.lineWidth=2;ctx.beginPath();ctx.arc(pointer.x,pointer.y,16,0,Math.PI*2);ctx.stroke();line(pointer.x-25,pointer.y,pointer.x-9,pointer.y,'#fff0cacc',1);line(pointer.x+9,pointer.y,pointer.x+25,pointer.y,'#fff0cacc',1);line(pointer.x,pointer.y-25,pointer.x,pointer.y-9,'#fff0cacc',1);line(pointer.x,pointer.y+9,pointer.x,pointer.y+25,'#fff0cacc',1);
 bottomHint('TAP NEAR FISH TO SHOOT • EACH SHOT COUNTS');
}
function decoFish(){const float=clock;
 fish(58,380,1,1,2.1,float);fish(365,448,2,-1,1.7,float+2);fish(132,535,0,-1,1.4,float*1.5);fish(340,587,4,1,1,float+1);
 for(let i=0;i<20;i++)circle(((i*57+30)%W),((i*86+float*18)%(H)),i%3+1,'#a2e0e442');
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
 text('DRAG OR USE ARROW KEYS TO STEER',210,665,11,C.muted,'center',700);
 button('CAST LINE',75,493,270,64,beginCast,C.yellow);
 button('UPGRADE GEAR',102,712,216,45,()=>{state='shop';age=0;},C.cream);
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
function render(){hits=[];ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
 ctx.save();if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));
 if(state==='menu')menu();else if(state==='descent'||state==='ascent')gameplay();else if(state==='shoot')shootScene();else if(state==='results')results();else if(state==='shop')shop();
 overlayParticles();ctx.restore();}
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
