// Original in-game shop scene: deliberately low-resolution pixel environment,
// overlaid with a crisp manga-inspired character portrait.
const WIDTH=420, HEIGHT=780;
const bg=document.createElement('canvas'); bg.width=210; bg.height=390;
const p=bg.getContext('2d');p.imageSmoothingEnabled=false;
const rect=(x,y,w,h,c)=>{p.fillStyle=c;p.fillRect(x,y,w,h);};
const line=(x,y,w,h,c)=>rect(x,y,w,h,c);
const wood=['#513124','#66402a','#7c4b2d','#9f6739'];
rect(0,0,210,390,'#281e2a');
for(let y=0;y<390;y+=17){rect(0,y,210,16,wood[(y/17|0)%4]);line(0,y,210,2,'#2d2021');for(let x=(y*3)%39;x<210;x+=39)rect(x,y+8,2,2,'#c18a50');}
rect(5,0,8,390,'#34252b');rect(196,0,9,390,'#34252b');
rect(121,34,77,130,'#372a28');rect(125,38,69,122,'#1e688d');
rect(125,38,69,49,'#5dc2dc');rect(125,84,69,5,'#eff3cf');
for(let x=125;x<194;x+=8){rect(x,107+(x%4)*5,8,39,'#277c80');rect(x,135,8,24,'#13546f');}
rect(157,38,3,123,'#815332');rect(125,94,69,3,'#815332');
rect(147,120,28,2,'#ffe4a1');rect(158,112,3,10,'#ffe4a1');
rect(9,93,106,7,'#38251f');rect(9,100,106,4,'#cf9252');
rect(9,159,104,6,'#3a2822');rect(9,165,104,4,'#d39856');
for(let i=0;i<7;i++){const x=13+i*14;rect(x,71,8,21,['#db7351','#62ac93','#e6b357','#557bb5'][i%4]);rect(x+2,74,4,3,'#f7e6a4');rect(x,153,9,6,'#bb9e70');rect(x+2,142,5,11,'#487c88');}
for(let i=0;i<8;i++){let x=15+i*12;rect(x,17,2,42,'#c7ae74');rect(x+1,33,3,3,'#e7c776');}
for(let i=0;i<9;i++){let x=110+i*10;rect(x,0,1,22+i%4*4,'#aa966c');rect(x-3,23+i%4*4,7,5,['#e4ad53','#ee7762','#53b4a9'][i%3]);}
rect(10,197,190,12,'#bc8247');rect(10,208,190,8,'#5e3929');
rect(0,211,210,179,'#3b2421');
for(let y=220;y<390;y+=22){rect(0,y,210,2,'#6a402d');for(let x=(y*5)%33;x<210;x+=33)rect(x,y+11,3,2,'#8b5938');}
rect(15,218,56,30,'#69402d');rect(16,219,54,2,'#c8924c');
rect(82,218,36,9,'#d9b56d');rect(86,225,27,4,'#806141');
rect(146,216,39,13,'#785137');rect(152,209,24,8,'#c18b4a');
rect(173,200,4,20,'#e3ac50');rect(168,198,14,5,'#ffd47a');
rect(165,193,19,3,'#ffe4a7');
const glow=p.createRadialGradient(174,196,1,174,196,55);glow.addColorStop(0,'#ffc563aa');glow.addColorStop(1,'#ffc56300');p.fillStyle=glow;p.fillRect(118,141,91,109);
const portraitSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="260" height="335" viewBox="0 0 260 335">
<defs><linearGradient id="coat" x2=".9" y2="1"><stop stop-color="#385c74"/><stop offset="1" stop-color="#142f4d"/></linearGradient></defs>
<path d="M30 326 Q-2 251 47 209 L86 190 L174 190 Q245 201 255 324Z" fill="url(#coat)" stroke="#0b2330" stroke-width="7"/>
<path d="M86 203 L101 257 L129 227 L153 263 L177 204 L153 182 L108 182Z" fill="#eee5d2" stroke="#263341" stroke-width="5"/>
<path d="M75 222 L59 289 L102 308 M178 220 L201 293 L166 309" fill="none" stroke="#6d92a0" stroke-width="5"/>
<path d="M99 163 L94 208 L132 228 L167 204 L161 159Z" fill="#c98359" stroke="#422f2c" stroke-width="5"/>
<path d="M72 91 Q60 141 78 175 L101 201 L135 216 L171 194 L190 152 Q201 100 165 74 L94 72Z" fill="#d79b73" stroke="#3b2a30" stroke-width="6"/>
<path d="M71 143 Q51 129 53 151 Q57 175 79 175 M189 138 Q207 123 209 146 Q211 162 187 170" fill="#c78d6b" stroke="#4c3332" stroke-width="5"/>
<path d="M71 156 L81 180 L94 168 L102 199 L122 195 L134 217 L149 195 L171 203 L183 169 L194 150 L180 189 Q158 239 130 227 Q84 223 71 156Z" fill="#f1e8d5" stroke="#3c393a" stroke-width="5"/>
<path d="M102 167 Q134 181 166 165" fill="none" stroke="#734638" stroke-width="5"/>
<path d="M96 133 Q107 124 119 136 M149 132 Q162 119 176 126" fill="none" stroke="#332e32" stroke-width="7" stroke-linecap="round"/>
<path d="M101 140 Q111 148 121 140 M148 139 Q163 147 172 135" fill="none" stroke="#f5ecdf" stroke-width="5"/>
<path d="M115 146 L124 147 M157 145 L164 143" stroke="#182c37" stroke-width="5"/>
<path d="M132 145 L127 158 L145 158" fill="none" stroke="#995f4a" stroke-width="5"/>
<path d="M90 169 Q104 159 126 174 M141 173 Q164 156 179 168" fill="none" stroke="#ece6d4" stroke-width="10" stroke-linecap="round"/>
<path d="M68 103 Q53 81 75 55 Q104 24 155 35 Q195 46 203 100 L180 94 Q156 72 117 82 Q88 91 68 103Z" fill="#ece8d8" stroke="#292f3b" stroke-width="7"/>
<path d="M60 102 Q126 78 207 102 L199 117 Q127 103 65 117Z" fill="#2c4b63" stroke="#1c2d3a" stroke-width="6"/>
<path d="M83 55 Q129 31 170 56" fill="none" stroke="#6f8790" stroke-width="7"/>
<path d="M122 86 L136 77 L148 88 M136 77 L136 65" stroke="#e1b95d" stroke-width="4" fill="none"/>
<path d="M50 228 Q23 229 9 269 L27 294 L72 275" fill="#cf9772" stroke="#242e38" stroke-width="6"/>
<path d="M20 269 L34 252 L43 261 L54 246 L63 258 L70 270" fill="none" stroke="#70493b" stroke-width="4"/>
<path d="M195 237 Q232 254 246 312 L201 325 L177 266" fill="#304d61" stroke="#132d3f" stroke-width="7"/>
<path d="M90 306 L91 332 M162 304 L165 332" stroke="#d6a75d" stroke-width="7"/>
</svg>`;
const captain=new Image();captain.decoding='async';captain.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(portraitSvg);
export function paintShopBackdrop(ctx){
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(bg,0,0,WIDTH,HEIGHT);ctx.restore();
 ctx.fillStyle='#1a1016ad';ctx.fillRect(0,0,WIDTH,HEIGHT);
 const lamp=ctx.createRadialGradient(340,270,5,340,270,320);
 lamp.addColorStop(0,'#e8ae5355');lamp.addColorStop(1,'#e8ae5300');
 ctx.fillStyle=lamp;ctx.fillRect(0,0,WIDTH,650);
}
export function paintSkipper(ctx,clock,x=98,y=215){
 if(!captain.complete)return false;
 ctx.save();ctx.translate(x-110,y-133+Math.sin(clock*1.8)*2);ctx.drawImage(captain,0,0,260,335);ctx.restore();return true;
}
