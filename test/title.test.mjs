import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
const code=(start,end)=>{
 const a=game.indexOf(start),b=game.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Missing scene: '+start);return game.slice(a,b);
};
test('new animated title has a deep gradient, soft waves, shafts and vignette',()=>{
 const bg=code('function titleBackdrop(','function titleSeaLife(');
 assert.match(bg,/ctx\.createLinearGradient\(0,0,0,H\)/);
 assert.match(bg,/ctx\.createRadialGradient\(/);
 assert.match(bg,/titleWave\(motion/);
 assert.match(bg,/ctx\.globalAlpha=\.42/);
 assert.match(bg,/ctx\.quadraticCurveTo\(/);
 assert.doesNotMatch(bg,/for\(let i=0;i<31;i\+\+\)/);
});
test('parallax fish and bubbles live behind all white menu controls',()=>{
 const life=code('function titleSeaLife(','function titleActionGlow(');
 const menu=code('function menu(){','function results(){');
 assert.match(life,/fish\(x,y,s\.kind/);
 assert.match(life,/lowFx\?9:20/);
 assert.ok(menu.indexOf('titleBackdrop(t);titleSeaLife(t);')<menu.indexOf("button('CAST LINE'"));
 assert.match(menu,/titleActionGlow\(t,68,511,284,60\)/);
 assert.match(menu,/button\('INSTALL APP'/);
 assert.match(menu,/ctx\.drawImage\(titleLogo/);
 assert.match(menu,/text\('WALLET'/);
});
test('reduced-effects mode freezes title animations',()=>{
 const backdrop=code('function titleBackdrop(','function titleSeaLife(');
 const life=code('function titleSeaLife(','function titleActionGlow(');
 const glow=code('function titleActionGlow(','function menu(){');
 assert.match(backdrop,/const motion=lowFx\?0:t/);
 assert.match(life,/const motion=lowFx\?0:t/);
 assert.match(glow,/if\(lowFx\)return/);
});
test('install screen exists with browser directions and back navigation',()=>{
 const panel=code('function installScene(){','function settings(){');
 assert.match(panel,/installGuide\(\)/);
 assert.match(panel,/serviceWorkerStatus\(\)/);
 assert.match(panel,/COPY GAME LINK/);
 assert.match(panel,/INSTALL NOW/);
 assert.match(panel,/state='menu'/);
 assert.match(game,/else if\(state==='install'\)installScene\(\)/);
});
