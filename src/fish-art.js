// Unique, hand-pixelled silhouettes. IDs remain tied to the original collection save.
export const FISH_SHAPES=Object.freeze({
 0:['  66      11      ',' 6666111333311    ','6666223334443351  ',' 6666111333311    ','  66    111       '],
 1:[' 66      111111   ','6666111112333311  ',' 6622333444443351 ','6666111112333311  ',' 66      111111   '],
 2:['   66       11    ',' 6666    111311   ','66662223333333511 ',' 666611233444311  ','   66  111111     '],
 3:['   66     111     ',' 66661113333111   ','66662233444433511 ',' 666611233333311  ','   66    11111    '],
 4:[' 66   111111      ','66661133444311    ',' 6622333444433511 ','66661133333311    ',' 66   111111      '],
 6:[' 66      111      ','66661111333111    ',' 6622334734733511 ','66661111333111    ',' 66      111      '],
 7:['      6  6        ',' 66  11111111      ','666611334443311    ',' 6622333444433511  ','666611333333311    ',' 66  11111111      ','      6  6        '],
 8:['66      1111111    ','66661111123333311  ',' 6223333444443351  ','66661111123333311  ','66      1111111    '],
 9:['    6   6   6      ',' 66  111111111     ','66662334444333511   ',' 6223334444433511   ',' 66  111111111     ','    6   6   6      '],
 10:[' 66     11111111    ','66661111223333111   ',' 62233334444433511  ','66661111223333111   ',' 66     11111111    '],
 13:['     6  6  6       ',' 66   11111111      ','666611344444311     ',' 62233447744433511   ','666611344444311     ',' 66   11111111      ','     6  6  6       ']
});
export const fishSilhouette=kind=>FISH_SHAPES[kind]||null;
export function drawUniqueFish(ctx,{x,y,kind,dir=1,scale=1,phase=0,size=22,palette,lowFx=false}){
 const rows=fishSilhouette(kind);if(!rows||!palette)return false;
 const width=Math.max(...rows.map(r=>r.length)),step=Math.max(.9,size*scale/9);
 const tail=lowFx?0:Math.round(Math.sin(phase*2.5)),bob=lowFx?0:Math.sin(phase)*1.5;
 ctx.save();ctx.translate(Math.round(x),Math.round(y+bob));ctx.scale(dir*step,step);
 for(let pass=0;pass<2;pass++)for(let j=0;j<rows.length;j++)for(let i=0;i<rows[j].length;i++){
  const c=rows[j][i];if(c===' ')continue;
  const xx=i-width/2+(i<7?tail:0),yy=j-rows.length/2+(i<7?tail*.28:0);
  ctx.fillStyle=pass===0?'#071522':c==='1'?palette[0]:c==='2'?palette[1]:
   c==='3'?palette[2]:c==='4'?palette[3]:c==='5'?'#061321':c==='7'?'#fffaf0':palette[1];
  if(pass===0)ctx.fillRect(xx-.25,yy-.25,1.5,1.5);
  else ctx.fillRect(xx,yy,1.04,1.04);
 }
 if(kind===7){
  ctx.fillStyle=palette[3];
  for(let i=-2;i<=2;i++){ctx.fillRect(i*2.3,-rows.length/2-1,1,1.5);ctx.fillRect(i*2.3,rows.length/2-.2,1,1.4);}
 }
 if(kind===13){ctx.fillStyle='#fff6c0';ctx.fillRect(-1,-rows.length/2-2,1.5,1.5);}
 ctx.restore();return true;
}
