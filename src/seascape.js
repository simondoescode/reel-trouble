// Procedural world-anchored scenery, using visible chunks only.
import {biomeAtDepth,CHUNK_DEPTH,seededRandom} from './ocean.js';
function cliff(ctx,x,y,height,width,side,color,edge){
 ctx.fillStyle=color;ctx.beginPath();
 const wall=side===0?0:edge,tip=side===0?width:edge-width;
 ctx.moveTo(wall,y+height);ctx.lineTo(wall,y-height*.65);
 ctx.lineTo(wall+(tip-wall)*.75,y-height);
 ctx.lineTo(tip,y-height*.35);ctx.lineTo(wall+(tip-wall)*.8,y+height*.25);
 ctx.closePath();ctx.fill();
}
function plant(ctx,x,y,biome,height,phase){
 const motif=biome.motif;
 if(motif==='coral'||motif==='kelp'){
  const kelp=motif==='kelp';ctx.fillStyle=kelp?'#276e69':'#458e95';
  for(let i=0;i<4;i++){
   const px=Math.round(x+Math.sin(phase+i*.8)*i*1.6);
   ctx.fillRect(px-2,Math.round(y-i*height/4),kelp?6:5,Math.round(height/4+4));
   if(i)ctx.fillRect(px+(i%2?-13:2),Math.round(y-i*height/4+2),kelp?17:13,5);
  }
  if(!kelp){ctx.fillStyle='#ba8794';ctx.fillRect(x-11,y-height*.65,20,6);}
 }else if(motif==='glow'||motif==='unknown'){
  ctx.fillStyle='#244b68';ctx.fillRect(x-4,y-height,8,height);
  ctx.fillStyle=motif==='unknown'?'#9c7be5':'#76ecd4';
  ctx.fillRect(x-8,y-height-3,16,5);ctx.fillRect(x-3,y-height+height*.3,6,6);
 }else if(motif==='glass'||motif==='spires'){
  ctx.fillStyle=motif==='glass'?'#283751':'#365b73';
  ctx.beginPath();ctx.moveTo(x-10,y);ctx.lineTo(x,y-height);ctx.lineTo(x+12,y);ctx.fill();
 }else{
  ctx.fillStyle='#42778a';ctx.fillRect(x-9,y-height*.55,18,height*.55);
 }
}
export function drawSeaScape(ctx,camera,{width=420,height=780,sea=192,time=0,lowFx=false,seed=1}={}){
 // Staggered parallax planes: no surface-to-player depth loops or repeating strips.
 for(const [layer,rate,alpha] of [[0,.68,.12],[1,.84,.19],[2,1,.28]]){
  const first=Math.max(0,Math.floor((camera*rate-sea-230)/CHUNK_DEPTH)-1);
  const last=Math.floor((camera*rate+height-sea+230)/CHUNK_DEPTH)+1;
  ctx.save();ctx.globalAlpha=alpha;
  for(let idx=first;idx<=last;idx++){
   const rnd=seededRandom(((seed>>>0)^Math.imul(idx+1,0x85ebca6b)^Math.imul(layer+1,0xc2b2ae35))>>>0);
   const base=idx*CHUNK_DEPTH;
   for(let n=0;n<3;n++){
    const world=base+(n+.3)*CHUNK_DEPTH/3+(rnd()-.5)*110;
    const y=sea+world-camera*rate;
    if(y<-200||y>height+200)continue;
    const biome=biomeAtDepth(world),side=rnd()<.5?0:1;
    const dist=23+rnd()*46+layer*6;
    const x=side===0?dist:width-dist,tall=55+rnd()*145+layer*18;
    if(layer<2)cliff(ctx,x,y,tall,36+rnd()*55,side,
     biome.id==='sunskip'?'#306a80':biome.id==='blackglass'?'#25354d':'#284f68',width);
    else plant(ctx,Math.round(x),Math.round(y),biome,Math.round(tall*.8),
     lowFx?0:time*.32+idx+n);
    if(layer===2&&biome.start>=6480&&rnd()<.38){
     ctx.fillStyle='#84fce0';ctx.globalAlpha=.21+Math.sin(lowFx?0:time+idx+n)*.06;
     ctx.fillRect(Math.round(x+12),Math.round(y-tall*.55),3,3);ctx.globalAlpha=alpha;
    }
   }
  }
  ctx.restore();
 }
 // Fine marine snow exists in world space, not screen space.
 ctx.save();
 const spacing=lowFx?150:95;
 const first=Math.floor((camera-sea-30)/spacing),last=Math.floor((camera+height-sea+30)/spacing);
 for(let i=first;i<=last;i++){
  const r=seededRandom(Math.imul(i+100007,0x9e3779b1)^(seed>>>0));
  const d=i*spacing+r()*spacing,x=12+r()*(width-24);
  const y=sea+d-camera+(lowFx?0:Math.sin(time*.8+i)*3);
  ctx.fillStyle=biomeAtDepth(d).start>=6480?'rgba(138,243,229,.22)':'rgba(181,223,228,.15)';
  ctx.fillRect(Math.floor(x/3)*3,Math.round(y),r()>.85?3:2,2);
 }
 ctx.restore();
}
