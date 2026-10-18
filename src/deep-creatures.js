// Distinctive, original pixel silhouettes for Reel Trouble's three deep-water species.
// Species indices are never changed: saves and fish-book entries use them as persistent IDs.
export const DEEP_CREATURES=Object.freeze({
 5:{name:'Hushwisp',palette:['#163e5f','#5399b3','#bafdf2','#f2fff9'],
  rows:['       333        ','     3322233      ','   33222222233    ','  32222222222233  ',' 3222211122222223 ','32221122222211123 ',' 3222211122222223 ','  32222222222233  ','   33222222233    ','     3322233      ','       333        ']},
 11:{name:'Riftglimmer',palette:['#144f66','#2e9b8a','#7dffca','#f0ffe3'],
  rows:['      4            ','     4443          ','   33333333        ','  32222222222333   ','433222111222222233 ','  32222222222333   ','   33333333        ','     4443          ','      4            ']},
 12:{name:'Blackglass Lurker',palette:['#261d48','#74539a','#c69cff','#fff0bf'],
  rows:['       4444        ','    333333333      ','  3222222223333    ',' 3222221111111133  ','3222222111222222233','3222333   33221133',' 3222221111111133  ','  3332222223333    ','    33  3333       ']}
});
export function isDeepCreature(kind){return Object.hasOwn(DEEP_CREATURES,kind);}
export function drawDeepCreature(ctx,{x,y,kind,dir=1,scale=1,phase=0,size=20,lowFx=false}){
 const model=DEEP_CREATURES[kind];if(!model)return false;
 const rows=model.rows,columns=Math.max(...rows.map(r=>r.length));
 const unit=Math.max(.9,size*scale/8.5);
 const bob=lowFx?0:Math.sin(phase*1.4)*1.5;
 ctx.save();ctx.translate(Math.round(x),Math.round(y+bob));ctx.scale(dir*unit,unit);
 const originX=-columns/2,originY=-rows.length/2;
 const wiggle=lowFx?0:Math.round(Math.sin(phase*2.5));
 // Build a hard dark silhouette first, then coloured tiles; no expensive blur.
 ctx.fillStyle='#061321';
 for(let row=0;row<rows.length;row++)for(let col=0;col<rows[row].length;col++){
  const tile=rows[row][col];if(tile===' ')continue;
  const sway=col<4?wiggle:0,dx=originX+col+sway,dy=originY+row+(col<4?wiggle*.3:0);
  ctx.fillRect(dx-.32,dy-.32,1.64,1.64);
 }
 for(let row=0;row<rows.length;row++)for(let col=0;col<rows[row].length;col++){
  const tile=rows[row][col];if(tile===' ')continue;
  const sway=col<4?wiggle:0;
  ctx.fillStyle=model.palette[(Number(tile)-1)%4];
  ctx.fillRect(originX+col+sway,originY+row+(col<4?wiggle*.3:0),1.07,1.07);
 }
 // Each creature has a different living light organ and movement signature.
 if(kind===5){
  ctx.fillStyle='#e7fff8';ctx.fillRect(originX+columns-5,originY+4,1.25,1.25);
  ctx.fillStyle='#84f5ed';
  for(let i=0;i<3;i++)ctx.fillRect(originX+3+i*3,originY+rows.length+(lowFx?0:Math.sin(phase*1.3+i)*1.2),.8,2.2+i%2);
 }else if(kind===11){
  ctx.fillStyle='#f0ffe3';ctx.fillRect(originX+columns-3,originY+4,1.1,1.1);
  ctx.fillStyle='#85ffdd';
  for(let i=0;i<4;i++)ctx.fillRect(originX+6+i*3,originY+rows.length-2+(lowFx?0:Math.sin(phase*2+i)*.4),1,.8);
 }else{
  ctx.fillStyle='#ffd978';
  const lureX=originX+columns-7,lureY=originY-5+(lowFx?0:Math.sin(phase*1.8));
  ctx.fillRect(lureX,lureY,2,2);
  ctx.fillStyle='#947bc5';ctx.fillRect(lureX-.5,lureY+2,1,4);
  ctx.fillStyle='#fff8e2';ctx.fillRect(originX+columns-5,originY+3,1.4,1.4);
  // Pixelated teeth, visible even at ordinary in-game scale.
  ctx.fillStyle='#eadcf9';
  for(let i=0;i<4;i++)ctx.fillRect(originX+columns-9+i*2,originY+5,1,1.3);
 }
 ctx.restore();return true;
}
