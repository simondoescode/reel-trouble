// Shop sprites use the same high-contrast, hard-edged pixel vocabulary as fish.
// Every character and object is built on a tiny canvas and drawn nearest-neighbour.
const WIDTH=420,HEIGHT=780;
const background=document.createElement('canvas');
background.width=210;background.height=390;
const p=background.getContext('2d');p.imageSmoothingEnabled=false;
const tile=(x,y,w,h,c)=>{p.fillStyle=c;p.fillRect(x,y,w,h);};
const wood=['#513124','#66402a','#7c4b2d','#9f6739'];
tile(0,0,210,390,'#281e2a');
for(let y=0;y<390;y+=17){
 tile(0,y,210,16,wood[Math.floor(y/17)%4]);tile(0,y,210,2,'#2d2021');
 for(let x=(y*3)%39;x<210;x+=39)tile(x,y+8,2,2,'#c18a50');
}
tile(5,0,8,390,'#34252b');tile(196,0,9,390,'#34252b');
tile(121,34,77,130,'#372a28');tile(125,38,69,122,'#1e688d');
tile(125,38,69,49,'#5dc2dc');tile(125,84,69,5,'#eff3cf');
for(let x=125;x<194;x+=8){tile(x,107+(x%4)*5,8,39,'#277c80');tile(x,135,8,24,'#13546f');}
tile(157,38,3,123,'#815332');tile(125,94,69,3,'#815332');
tile(9,93,106,7,'#38251f');tile(9,100,106,4,'#cf9252');
tile(9,159,104,6,'#3a2822');tile(9,165,104,4,'#d39856');
for(let i=0;i<7;i++){
 const x=13+i*14;tile(x,71,8,21,['#db7351','#62ac93','#e6b357','#557bb5'][i%4]);
 tile(x+2,74,4,3,'#f7e6a4');tile(x,153,9,6,'#bb9e70');tile(x+2,142,5,11,'#487c88');
}
for(let i=0;i<8;i++){const x=15+i*12;tile(x,17,2,42,'#c7ae74');tile(x+1,33,3,3,'#e7c776');}
for(let i=0;i<9;i++){
 const x=110+i*10;tile(x,0,1,22+i%4*4,'#aa966c');
 tile(x-3,23+i%4*4,7,5,['#e4ad53','#ee7762','#53b4a9'][i%3]);
}
tile(10,197,190,12,'#bc8247');tile(10,208,190,8,'#5e3929');
tile(0,211,210,179,'#3b2421');
for(let y=220;y<390;y+=22){
 tile(0,y,210,2,'#6a402d');for(let x=(y*5)%33;x<210;x+=33)tile(x,y+11,3,2,'#8b5938');
}
tile(15,218,56,30,'#69402d');tile(16,219,54,2,'#c8924c');
tile(82,218,36,9,'#d9b56d');tile(86,225,27,4,'#806141');
tile(146,216,39,13,'#785137');tile(152,209,24,8,'#c18b4a');
tile(173,200,4,20,'#e3ac50');tile(168,198,14,5,'#ffd47a');
for(const [x,y,w,h,color] of [[128,144,66,80,'#f6b75a13'],
 [143,154,51,59,'#f6b75a1b'],[158,174,33,38,'#f6b75a24'],
 [169,190,13,15,'#ffe5a35a']])tile(x,y,w,h,color);

const cache=new Map();
const INK='#061321',CREAM='#f1eedc',SHADE='#cad4d0',COAT='#315a72',
 DARK='#18354c',SKIN='#da9e75',SKIN_SHADE='#b87258',GOLD='#e8b35d';
function sprite(key,w,h,draw){
 if(cache.has(key))return cache.get(key);
 const c=document.createElement('canvas');c.width=w;c.height=h;
 const pen=c.getContext('2d');pen.imageSmoothingEnabled=false;
 const r=(x,y,dx,dy,color)=>{pen.fillStyle=color;pen.fillRect(x,y,dx,dy);};
 draw(r);cache.set(key,c);return c;
}
function skipperFrame(mood,blink,talking){
 const face=['neutral','excited','grumpy','curious'].includes(mood)?mood:'neutral';
 return sprite('skipper-'+face+'-'+Number(blink)+'-'+Number(talking),32,38,r=>{
  r(5,26,23,12,INK);r(3,29,7,9,INK);r(24,29,6,9,INK);
  r(6,27,21,11,COAT);r(4,30,6,8,DARK);r(24,30,5,8,DARK);
  r(10,27,4,11,'#72929e');r(21,27,4,11,DARK);
  r(12,26,9,12,CREAM);r(14,29,5,9,'#6b99a2');r(15,30,2,8,GOLD);
  r(13,21,8,8,INK);r(14,22,6,6,SKIN);
  r(8,12,18,16,INK);r(9,13,16,13,SKIN);r(9,18,3,7,SKIN_SHADE);
  r(23,18,2,5,SKIN_SHADE);r(7,18,3,6,INK);r(8,19,2,4,SKIN);
  r(25,18,2,6,INK);r(25,19,1,4,SKIN);
  // A jagged, square-pixel beard with white tufts.
  r(8,23,18,6,INK);r(9,22,16,7,SHADE);r(11,27,14,5,SHADE);
  r(13,30,10,3,INK);r(14,29,8,3,CREAM);r(11,25,5,4,CREAM);
  r(19,25,4,5,CREAM);r(9,20,5,3,SHADE);r(20,20,5,3,SHADE);
  if(blink){r(12,18,4,1,INK);r(20,18,4,1,INK);}
  else if(face==='grumpy'){r(12,18,4,1,INK);r(20,18,4,1,INK);r(13,19,2,1,INK);r(21,19,2,1,INK);}
  else if(face==='excited'){r(12,18,4,2,INK);r(20,18,4,2,INK);r(13,18,1,1,CREAM);r(21,18,1,1,CREAM);}
  else{r(13,18,2,2,INK);r(21,18,2,2,INK);r(13,18,1,1,CREAM);r(21,18,1,1,CREAM);}
  r(11,16,5,1,face==='grumpy'?INK:'#544137');
  r(20,16,5,1,face==='curious'?GOLD:'#544137');
  r(17,20,2,2,SKIN_SHADE);
  r(14,23,7,talking?3:1,INK);
  if(talking)r(16,25,4,1,'#b65c61');
  else r(16,24,4,1,INK);
  // Seafarer's cap with brass insignia.
  r(7,8,21,8,INK);r(8,7,19,7,CREAM);r(10,6,15,2,SHADE);
  r(13,9,9,4,'#486276');r(17,9,1,3,GOLD);r(15,11,5,1,GOLD);
  r(6,13,24,4,INK);r(7,13,22,2,DARK);r(9,15,17,1,'#7992a0');
  r(3,33,8,5,INK);r(4,33,7,4,SKIN);r(6,34,1,3,SKIN_SHADE);
 });
}
export function paintShopBackdrop(ctx){
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.drawImage(background,0,0,WIDTH,HEIGHT);
 ctx.fillStyle='#1a101642';ctx.fillRect(0,0,WIDTH,HEIGHT);
 ctx.restore();
}
export function paintSkipper(ctx,clock,x=98,y=215,{mood='neutral',talking=false,lowFx=false}={}){
 const blink=!lowFx&&((clock+.2)%5.2)<.13;
 const mouth=!lowFx&&talking&&Math.floor(clock*6)%2===0;
 const img=skipperFrame(mood,blink,mouth),size=6;
 const bob=lowFx?0:Math.round(Math.sin(clock*1.7)*2);
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.drawImage(img,Math.round(x-img.width*size/2),Math.round(y-img.height*size/2+bob),
  img.width*size,img.height*size);
 ctx.restore();return true;
}
function gearSprite(type,level=0){
 const n=Math.max(0,Math.floor(Number(level)||0));
 return sprite('gear-'+type+'-'+n,24,24,r=>{
  const metal=n>=3?'#a4dddb':'#aec7c9',blue=n>=3?'#6de8e2':'#397c91',
   warm=n>=3?'#ffd77d':'#f2ad61';
  if(type==='line'){
   r(4,4,14,17,INK);r(2,7,20,12,INK);r(5,5,12,15,warm);
   r(3,9,18,8,'#936240');r(5,7,12,12,metal);r(6,8,10,10,blue);
   r(7,10,8,6,'#195166');for(let y=9;y<17;y+=3)r(7,y,9,1,'#bcebcf');
   r(8,10,6,6,INK);r(9,11,4,4,'#dbb56c');r(10,12,2,2,CREAM);
   r(18,7,4,4,INK);r(19,8,3,2,warm);r(19,5,2,3,INK);
   r(20,4,3,3,metal);r(1,17,3,3,INK);r(2,18,2,2,warm);
  }else if(type==='net'){
   r(3,2,15,2,INK);r(2,4,3,11,INK);r(17,4,3,10,INK);
   r(4,15,14,3,INK);r(4,4,13,11,blue);r(5,5,11,9,'#193f4e');
   for(let y=6;y<15;y+=3)for(let x=5+y%2;x<16;x+=4)r(x,y,2,2,'#b8d3b9');
   r(3,3,14,2,warm);r(2,5,2,9,warm);r(18,5,2,9,warm);
   r(5,16,13,2,warm);r(9,18,5,5,INK);r(10,18,3,5,'#a7794c');
  }else if(type==='gun'){
   r(2,5,18,11,INK);r(4,4,12,3,INK);r(16,7,7,6,INK);
   r(4,7,14,7,'#d57552');r(4,7,14,3,warm);r(17,9,5,3,metal);
   r(20,9,3,2,INK);r(5,13,6,3,metal);r(12,12,5,4,blue);
   r(9,15,9,8,INK);r(11,15,6,7,'#976847');
   r(12,17,3,4,'#543d39');r(7,5,8,2,metal);
   if(n>=2){r(10,3,7,2,blue);r(15,7,3,2,CREAM);}
   if(n>=4){r(4,11,2,2,'#fff0b5');r(19,5,3,2,'#c8f9ee');}
  }else if(type==='light'){
   r(7,3,10,3,INK);r(10,1,4,3,INK);r(7,5,10,15,INK);
   r(6,19,12,3,INK);r(8,6,8,12,metal);r(9,7,6,10,'#f3c66b');
   r(10,8,4,8,CREAM);r(8,6,1,12,'#536f78');r(15,6,1,12,'#536f78');
   r(7,19,10,2,warm);r(10,2,4,2,warm);
   if(n>=3){r(10,10,4,4,'#fffccf');r(5,9,2,4,warm);}
  }else if(type==='charge'){
   r(6,4,13,18,INK);r(7,6,11,14,'#b85647');
   r(9,6,6,14,'#dc7660');r(5,8,15,3,warm);r(5,17,15,3,warm);
   r(9,10,7,7,INK);r(11,12,3,3,CREAM);
   r(12,2,2,4,INK);r(13,1,4,2,warm);r(15,0,2,2,CREAM);
  }else if(type==='map'){
   r(3,4,19,17,INK);r(4,5,17,15,'#ddcb92');
   r(6,6,1,12,'#ae9a6d');r(11,6,1,12,'#ae9a6d');
   r(8,11,3,2,blue);r(12,12,3,2,blue);
   r(16,10,3,4,'#b96951');r(17,11,1,2,INK);
   r(2,3,20,2,warm);r(3,20,18,2,warm);
  }else if(type==='tooth'){
   r(7,2,10,6,INK);r(4,6,16,7,INK);r(6,10,12,8,INK);
   r(8,16,3,6,INK);r(14,16,3,5,INK);
   r(8,4,8,8,'#a9eadf');r(6,8,12,4,blue);
   r(8,12,9,4,'#86caca');r(9,16,2,5,CREAM);
   r(15,15,2,5,CREAM);r(10,5,3,3,CREAM);
  }else if(type==='crate'){
   r(3,5,19,16,INK);r(4,6,17,14,'#8e5b37');
   r(5,7,15,2,warm);r(5,17,15,2,warm);
   r(5,9,3,8,INK);r(16,9,3,8,INK);
   r(8,11,8,3,'#deac5d');r(10,11,4,3,INK);
   r(7,3,11,3,INK);r(8,4,9,1,metal);
  }else if(type==='token'){
   r(7,2,10,2,INK);r(4,4,16,4,INK);r(2,8,20,9,INK);
   r(4,17,16,4,INK);r(7,21,10,2,INK);
   r(6,5,12,14,'#30506d');r(4,9,16,6,blue);
   r(9,7,6,10,'#8fb1d4');r(11,9,3,6,INK);
   r(7,20,10,1,metal);r(8,5,7,1,metal);
  }
 });
}
export function paintShopItem(ctx,type,x,y,scale=1,level=0,clock=0,lowFx=false){
 const img=gearSprite(type,level);
 const size=Math.max(2,Math.round(4.5*scale));
 const bob=lowFx?0:Math.round(Math.sin(clock*2.1+level)*1.6);
 const dx=Math.round(x-img.width*size/2),dy=Math.round(y-img.height*size/2+bob);
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.drawImage(img,dx,dy,img.width*size,img.height*size);
 if(!lowFx&&Math.sin(clock*2.5+level)>.78){
  ctx.fillStyle='#fff3b5';ctx.fillRect(dx+size*19,dy+size*3,size,size);
  ctx.fillRect(dx+size*20,dy+size*2,size,size);
 }
 ctx.restore();
}
