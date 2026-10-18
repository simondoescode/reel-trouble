import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const game=read('src/game.js'),css=read('src/styles.css');
const scene=(name,next)=>game.slice(game.indexOf(name),game.indexOf(next,game.indexOf(name)+name.length));

test('pixel arcade skin is shared without changing core game state',()=>{
 assert.match(game,/function pixelPlate\(/);
 assert.match(game,/function button\(/);
 assert.match(game,/pixelPlate\(x,y,w,h,base,edge/);
 assert.match(game,/function neonPanel\(/);
 assert.match(game,/function cabinRow\(/);
 assert.match(game,/reel-trouble-save-v1/);
 assert.match(game,/function beginCast\(/);
 assert.match(game,/function shootScene\(/);
});

test('locally bundled display font uses the real weight without glyph compression',()=>{
 assert.match(css,/@import '@fontsource\/press-start-2p\/400\.css'/);
 assert.match(css,/font-synthesis:\s*none/);
 assert.match(game,/ctx\.font='400 '\+fontSize/);
 assert.match(game,/ctx\.font='400 '\+size/);
 assert.match(game,/ctx\.fillText\(label,x,y\)/);
 assert.doesNotMatch(game,/ctx\.fillText\(String\(value\),x,y,width\)/);
 assert.match(game,/function storyCopy\(/);
});

test('gold action text is dark for contrast, other buttons retain light text',()=>{
 assert.match(game,/primary\?'#152637':C\.white/);
 assert.match(game,/primary\?'#ffd45c':'#0e3048'/);
 assert.match(game,/ctx\.fillStyle=color\|\|C\.white/);
});

test('there is one main menu entry for secondary screens',()=>{
 const title=scene('function menu(){','function cabinRow(');
 assert.match(title,/button\('MORE'/);
 assert.doesNotMatch(title,/button\('☰'/);
 assert.match(title,/progress\.discovered/);
 const cabin=scene('function moreMenu(){','function results(){');
 for(const label of ['EXPEDITIONS','FISH BOOK','SETTINGS','INSTALL APP']) assert.ok(cabin.includes(label),label);
});

test('shop preserves categories, scrolling, purchase flow and legible price labels',()=>{
 const shop=scene('function shopTierList(','function shopItemCard(){');
 assert.match(shop,/shopScroll\[shopTab\]/);
 assert.match(shop,/(?:const|let) price=/);
 assert.match(shop,/:\s*'\
 assert.match(shop,/openShopInspect\(/);
 assert.match(shop,/Math\.max\(top,y\+4\)/);
 assert.match(game,/shortLabel=id==='guns'\?'GUNS'/);
 assert.match(game,/storyCopy\(skipperLine\|\|skipperGreeting\(\)/);
});

test('mission parchment and collection still offer every navigation route',()=>{
 assert.match(game,/pixelPlate\(23,150,374,517,'#efdcb5'/);
 assert.match(game,/function bookCard\(/);
 assert.match(game,/pixelPlate\(x,y,width,height,found/);
 assert.match(game,/function shopInspectOverlay\(/);
 assert.match(game,/function installScene\(/);
 assert.match(game,/function settings\(/);
 assert.match(game,/function pausedScene\(/);
});
\+cost/);
 assert.match(shop,/openShopInspect\(/);
 assert.match(shop,/Math\.max\(top,y\+4\)/);
 assert.match(game,/shortLabel=id==='guns'\?'GUNS'/);
 assert.match(game,/storyCopy\(skipperLine\|\|skipperGreeting\(\)/);
});

test('mission parchment and collection still offer every navigation route',()=>{
 assert.match(game,/pixelPlate\(23,150,374,517,'#efdcb5'/);
 assert.match(game,/function bookCard\(/);
 assert.match(game,/pixelPlate\(x,y,width,height,found/);
 assert.match(game,/function shopInspectOverlay\(/);
 assert.match(game,/function installScene\(/);
 assert.match(game,/function settings\(/);
 assert.match(game,/function pausedScene\(/);
});
