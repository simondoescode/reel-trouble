import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('HTML loads the game from relative source paths in both Vite and Pages branch hosting', () => {
  const html = read('index.html');
  assert.match(html, /type="module" src="\.\/src\/game\.js"/);
  assert.match(html, /rel="stylesheet" href="\.\/src\/styles\.css"/);
  assert.doesNotMatch(html, /src="\/src\/main\.js"/);
  assert.match(html, /<canvas id="game"/);
});

test('core fishing phases and player progress remain in the game', () => {
  const game = read('src/game.js');
  for (const phase of ["'menu'", "'descent'", "'ascent'", "'shoot'", "'results'", "'shop'", "'settings'"]) {
    assert.ok(game.includes(phase), `Missing phase: ${phase}`);
  }
  assert.match(game, /reel-trouble-save-v1/);
});

test('GitHub Pages Vite base matches the repo path', () => {
  assert.match(read('vite.config.js'), /base: '\/reel-trouble\/'/);
});

test('original pixel sprites remain while typography renders at full logical resolution', () => {
 const game=read('src/game.js');
 assert.match(game, /sceneCanvas\.width=W;sceneCanvas\.height=H/);
 assert.match(game, /ctx\.imageSmoothingEnabled=false/);
 assert.match(game, /display\.imageSmoothingEnabled=true/);
 assert.match(game, /display\.drawImage\(sceneCanvas/);
 assert.match(game, /const FISH_SPRITE=/);
 assert.match(read('src/styles.css'), /image-rendering:\s*auto/);
});

test('vibrant pixel colours and visual effects stay available', () => {
 const game=read('src/game.js');
 const css=read('src/styles.css');
 assert.match(game, /teal:'#27f4dd'/);
 assert.match(game, /yellow:'#ffed76'/);
 assert.match(game, /const fishPalette=\[/);
 assert.match(game, /oceanPalette\(depthAtPixel\)/);
 assert.match(game, /const sky=\['#4257b5'/);
 assert.match(game, /const sparks=\[color,C\.yellow,C\.teal,C\.cream,C\.pink\]/);
 assert.match(css, /image-rendering: auto/);
 assert.match(css, /radial-gradient/);
});

test('shooting UI and gun rendering remain wired into gameplay',()=>{
 const game=read('src/game.js');
 assert.match(game,/function drawGun\(/);
 assert.match(game,/function drawBulletTrail\(/);
 assert.match(game,/pickShotTargets\(/);
 assert.match(game,/nextCombo\(/);
 assert.match(game,/bestRoundCombo/);
 assert.match(game,/gun:'AIM BOOST \| NEW GUNS L2\/L4'/);
});

test('shooting has unlimited ammunition and ends when fish are shot, fall in the water or time expires',()=>{
 const game=read('src/game.js');
 assert.match(game,/topBar\('SHOOT THE CATCH',Math\.ceil\(shootTime\)\+'s','AMMO ∞'\)/);
 assert.doesNotMatch(game,/ammo\s*--|ammo\s*<=\s*0|ammo\s*=\s*9/);
 assert.match(game,/stepAirborneCatch\(f,dt\)/);
 assert.match(game,/allCatchResolved\(airborne\)/);
 assert.match(game,/emitSplash\(f\.x,SHOOT_WATERLINE/);
 assert.match(game,/if\(endDelay>0\)/);
 assert.match(game,/else if\(shootTime<=0\)endRound\(\)/);
 assert.match(game,/fired\+\+/);
});

test('mobile release pause, options and performance hooks remain in gameplay',()=>{
 const game=read('src/game.js');
 const html=read('index.html');
 assert.match(game,/function pauseGame\(/);
 assert.match(game,/function resumeGame\(/);
 assert.match(game,/document\.addEventListener\('visibilitychange'/);
 assert.match(game,/if\(!paused&&!document\.hidden\)update\(dt\)/);
 assert.match(game,/lowFx\?1000\/30:1000\/60/);
 assert.match(game,/function toggleSound\(/);
 assert.match(game,/function toggleEffects\(/);
 assert.match(html,/id="rotate-notice"/);
 assert.match(html,/id="play-landscape"/);
 assert.match(html,/rel="manifest"/);
});
test('PWA assets have the right scope, icons and worker',()=>{
 const manifest=JSON.parse(read('manifest.webmanifest'));
 assert.equal(manifest.scope,'./');
 assert.equal(manifest.start_url,'./');
 assert.equal(manifest.display,'standalone');
 assert.deepEqual(manifest.icons.map(icon=>icon.sizes),['192x192','512x512','512x512']);
 const worker=read('sw.js');
 assert.match(worker,/self\.addEventListener\('install'/);
 assert.match(worker,/self\.addEventListener\('fetch'/);
 assert.match(worker,/self\.registration\.scope/);
 assert.match(worker,/cache\.match\(base\('\.\/index\.html'\)\)/);
 assert.match(read('vite.config.js'),/name:'copy-mobile-assets'/);
});

test('music, ambience and expressive animation remain integrated',()=>{
 const game=read('src/game.js');
 assert.match(game,/createArcadeAudio\(/);
 assert.match(game,/sound\.update\(realDt,state,document\.hidden\)/);
 assert.match(game,/function toggleMusic\(/);
 assert.match(game,/sound\.pause\(true\)/);
 assert.match(game,/function emitSplash\(/);
 assert.match(game,/function drawSplashEffects\(/);
 assert.match(read('src/ocean.js'),/f\.swimY=Math\.sin/);
 assert.match(game,/const arm=Math\.round\(Math\.sin\(clock\*8\)\*4\)/);
 assert.match(game,/sound\.play\('catch'/);
 assert.match(game,/sound\.play\('hit'/);
 assert.match(game,/sound\.play\('results'/);
 assert.match(read('sw.js'),/src\/audio\.js/);
});

test('ocean expansion is connected to spawning, artwork, hazards and scoring',()=>{
 const game=read('src/game.js');
 assert.match(game,/import \{ SPECIES as species, BIOMES, biomeAtDepth, oceanPalette, spawnOcean, advanceFish, advanceHazard, overlapsHazard \} from '\.\/ocean\.js'/);
 assert.match(game,/createOceanStream\(maxDepth/);
 assert.match(game,/for\(const f of fishes\)advanceFish\(f,dt\)/);
 assert.match(game,/for\(const h of hazards\)advanceHazard\(h,dt\)/);
 assert.match(game,/function jellyfish\(h,y\)/);
 assert.match(game,/startAscent\(null,true\)/);
 assert.match(game,/GOLDEN CATCH!/);
 assert.match(game,/const biome=biomeAtDepth\(depth\)/);
 assert.match(read('sw.js'),/src\/ocean\.js/);
});

test('collection routes and rewards are wired into gameplay and save migration',()=>{
 const game=read('src/game.js');
 assert.match(game,/collection:createCollection\(\)/);
 assert.match(game,/collection:normalizeCollection\(d\.collection\)/);
 assert.match(game,/recordCatch\(save\.collection,f\.kind\)/);
 assert.match(game,/recordShot\(save\.collection,f\.kind,money,streak\.multiplier\)/);
 assert.match(game,/function updateAchievements\(/);
 assert.match(game,/function bookCard\(/);
 assert.match(game,/function collection\(/);
 assert.match(game,/function fishDetail\(/);
 assert.match(game,/FISH ENCYCLOPEDIA/);
 assert.match(game,/else if\(state==='collection'\)collection\(\)/);
 assert.match(read('sw.js'),/src\/collection\.js/);
});

test('brighter canvas typography and new ocean palette stay enabled',()=>{
 const game=read('src/game.js'),ocean=read('src/ocean.js');
 assert.match(game,/Math\.max\(16,size\)/);
 assert.match(game,/Arial,Helvetica,sans-serif/);
 assert.match(game,/ctx\.strokeText\(fitted,x,y,width\)/);
 assert.match(game,/text\(biome\.name,97,130,13/);
 assert.match(ocean,/SUNSKIP SHELF/);
 assert.match(ocean,/KELP KNUCKLES/);
 assert.match(ocean,/BLACKGLASS DROP/);
 assert.match(read('sw.js'),/reel-trouble-offline-v21/);
});

test('readable high-contrast cards and typography across screens',()=>{
 const game=read('src/game.js');
 assert.match(game,/ctx\.fillStyle='#ffffff'/);
 assert.match(game,/ctx\.font='900 '/);
 assert.match(game,/ctx\.strokeText\(fitted,x,y,width\)/);
 assert.match(game,/const pageSize=4/);
 assert.match(game,/const width=370,height=99/);
 assert.match(game,/text\(badge\.description,80,y\+45,16/);
 assert.match(game,/function shopInterior\(/);
 assert.match(game,/function skipperPortrait\(/);
 assert.match(game,/function skipperBubble\(/);
 assert.match(game,/text\('HITS \/ SHOTS',77,405,17/);
 assert.match(game,/text\(p\.discovered\+'\/'\+p\.total\+' SPECIES/);
 assert.doesNotMatch(game,/PIXEL=2|pixelCanvas\.width=W\/PIXEL/);
});

test('optional haptic rumble is integrated without changing fishing rules',()=>{
 const game=read('src/game.js');
 assert.match(game,/import \{ createRumble \} from '\.\/haptics\.js'/);
 assert.match(game,/rumble:typeof saved\.rumble==='boolean'/);
 assert.match(game,/function toggleRumble\(\)/);
 assert.match(game,/rumble\.play\('cast'\)/);
 assert.match(game,/rumble\.play\(species\[f\.kind\]\.rare\?'legendary':'catch'\)/);
 assert.match(game,/rumble\.play\('sting'\)/);
 assert.match(game,/rumble\.play\(combo>=2\?'combo':'hit'\)/);
 assert.match(game,/rumble\.play\('shot'\)/);
 assert.match(game,/rumble\.play\('upgrade'\)/);
 assert.match(game,/rumble\.stop\(\)/);
 assert.match(game,/RUMBLE N\/A/);
 assert.match(read('sw.js'),/src\/haptics\.js/);
});

test('fishing sea uses gradient depth transitions, faint decoration and fish outlines',()=>{
 const game=read('src/game.js');
 const water=game.slice(game.indexOf('function bgUndersea('),game.indexOf('function jellyfish('));
 const fish=game.slice(game.indexOf('function fish('),game.indexOf('function bgUndersea('));
 assert.match(water,/ctx\.createLinearGradient\(0,0,0,H\)/);
 assert.match(water,/water\.addColorStop\(fraction,stop\)/);
 assert.match(water,/ctx\.createRadialGradient\(/);
 assert.match(water,/drawSeaScape\(ctx,camera/);
 assert.match(read('src/seascape.js'),/for\(let idx=first;idx<=last;idx\+\+\)/);
 assert.doesNotMatch(water,/y\+=35|worldDepth%720|fillRect\(0,y,W,36\)/);
 assert.match(fish,/const border=Math\.max\(1\.5,Math\.min\(3,step\*\.72\)\)/);
 assert.match(fish,/ctx\.fillStyle='#061321'/);
 assert.match(fish,/ctx\.fillRect\(dx-border,dy-border,step\+border\*2\+\.1,step\+border\*2\+\.1\)/);
});

test('modern arcade title and phase transitions remain hooked to actual gameplay',()=>{
 const game=read('src/game.js');
 assert.match(game,/function neonPanel\(/);
 assert.match(game,/function drawStageTransition\(/);
 assert.match(game,/stageCue\('dive'\)/);
 assert.match(game,/stageCue\('reel'\)/);
 assert.match(game,/stageCue\('shoot'\)/);
 assert.match(game,/stageCue\('results'\)/);
 assert.match(game,/sceneTransition\.elapsed\+=realDt/);
 assert.match(game,/if\(state!=='shoot'\|\|endDelay>0\|\|sceneTransition\)return/);
 assert.match(game,/drawStageTransition\(\);/);
 assert.match(game,/arcadePill\('RUN COMPLETE'/);
 assert.match(game,/easeOutCubic\(Math\.min\(1,age\/\.95\)\)/);
 assert.match(read('sw.js'),/src\/arcade-ui\.js/);
});

test('pacing is gentler and phase transitions do not interrupt the round',()=>{
 const game=read('src/game.js');
 assert.match(game,/function stageCue\(_kind\)\{sceneTransition=null/);
 assert.match(game,/depth\+= \(91\+save\.upgrades\.line\*3\)\*dt/);
 assert.match(game,/depth<540\?null/);
 assert.match(game,/shootTime=16/);
 assert.match(game,/hazardSlow>0\?125:205/);
});

test('gear shop offers persistent lines, distinct guns and one-use blast charges',()=>{
 const game=read('src/game.js'), guns=read('src/shooting.js');
 assert.match(game,/shopTab='lines'/);
 assert.match(game,/\['lines','REELS'\]/);
 assert.match(game,/\['nets','NETS'\]/);
 assert.match(game,/\['guns','WEAPONS'\]/);
 assert.match(game,/\['gadgets','SUPPLIES'\]/);
 assert.match(game,/function skipperGreeting\(/);
 assert.match(game,/function skipperReply\(/);
 assert.match(game,/skipperSpeak\(/);
 assert.match(game,/charges:clamp\(Number\(d.charges\)\|\|0,0,3\)/);
 assert.match(game,/chargeArmed=save.charges>0/);
 assert.match(game,/save.charges=Math.max\(0,save.charges-1\)/);
 assert.match(game,/collided.bypassed=true/);
 assert.match(game,/!f.bypassed/);
 assert.match(game,/function buyCharge\(/);
 for(const name of ['QUICKSHOT','SCATTERGUN','TWIN SCATTER','NEON BLASTER','STORM CANNON'])
  assert.ok(guns.includes(name),name);
});

test('main game is a single valid script without duplicate or truncated trailing code',()=>{
 const source=read('src/game.js');
 const once=[
  'function render(){','function frame(t){','function installScene(){',
  'function settings(){','function fishDetail(){','function shop(){',
  'function menu(){'
 ];
 for(const symbol of once){
  const needle=symbol;
  assert.equal(source.split(needle).length-1,1,'duplicate or missing '+symbol);
 }
 assert.ok(source.includes("shopSupplyCard('light',577)"), 'light purchase card exists');
 assert.match(source,/function buyLight\(\)/);
 assert.equal([...source.matchAll(/^\}\)\(\);$/gm)].length,1,'exactly one entrypoint closure');
 assert.ok(source.trimEnd().endsWith('})();'),'Game must not contain any code after entry point');
 assert.doesNotMatch(source,/button\(level===3\?'MAX LIGHT':'BUY LIGHT \n/);
});


test('canvas bootstrap shows refresh controls if JavaScript fails',()=>{
 const html=read('index.html'),css=read('src/styles.css'),game=read('src/game.js');
 assert.match(html,/id="game-boot"/);
 assert.match(html,/id="recover-game"/);
 assert.match(html,/navigator\.serviceWorker\.getRegistrations\(\)/);
 assert.match(html,/k\.startsWith\('reel-trouble-offline-'\)/);
 assert.match(html,/window\.addEventListener\('error'/);
 assert.match(html,/location\.replace\(fresh\.href\)/);
 assert.match(css,/body\.game-ready #game-boot\{display:none\}/);
 assert.match(game,/document\.body\.classList\.add\('game-ready'\)/);
});

test('rare discoveries and bespoke deep creature art are integrated without interrupting the fishing loop',()=>{
 const game=read('src/game.js'),worker=read('sw.js');
 assert.match(game,/import \{ isDeepCreature, drawDeepCreature \}/);
 assert.match(game,/import \{ createDiscoveryStream, drawDiscovery \}/);
 assert.ok(game.includes('discoveryStream?.claimAt(depth,hookX)'));
 assert.match(game,/discoveriesThisCast\+\+/);
 assert.match(game,/drawDiscovery\(ctx,item,y,waveT/);
 assert.match(game,/const camera=cameraY/);
 assert.match(game,/pointerDown\?14:9/);
 assert.match(worker,/src\/deep-creatures\.js/);
 assert.match(worker,/src\/discoveries\.js/);
});


test('fishing depth HUD uses an angular current/limit readout and smooth hook-anchored edge ruler',()=>{
 const game=read('src/game.js');
 const hud=game.slice(game.indexOf('function depthReadout()'),game.indexOf('function gameplay()'));
 assert.match(hud,/ctx\.moveTo\(0,y\)/);
 assert.match(hud,/ctx\.fillText\(meter\(depth\),11,y\+23,124\)/);
 assert.match(hud,/ctx\.fillText\('OF '\+meter\(maxDepth\)/);
 assert.match(hud,/const markerY=clamp\(SEA\+depth-cameraY/);
 assert.match(hud,/metres%50===0/);
 assert.match(hud,/metres-currentMetres/);
 assert.match(hud,/const x=W-2/);
 assert.match(game,/sideDepthGauge\(\);\s*depthReadout\(\);/);
 assert.doesNotMatch(game,/360\*depth\/maxDepth/);
});


test('shopfront is a readable in-world scene with individual merchandise and all upgrades accessible',()=>{
 const game=read('src/game.js'),art=read('src/shop-art.js');
 assert.match(game,/function shopInterior\(/);
 assert.match(game,/function shopJobBoard\(/);
 assert.match(game,/function skipperBubble\(/);
 assert.match(game,/function shopInk\(/);
 assert.match(game,/function shopWrap\(/);
 assert.match(game,/function shopTabButton\(/);
 assert.match(game,/shopItemCard\(\)/);
 assert.match(game,/shopSupplyCard\('charge',452\)/);
 assert.match(game,/shopSupplyCard\('light',577\)/);
 assert.match(game,/shopTab==='nets'\?'net'/);
 assert.match(game,/purchase\(type\)/);
 assert.match(game,/save\.upgrades\.net\*13/);
 assert.match(art,/export function paintShopItem\(/);
 for(const type of ["type==='line'","type==='net'","type==='gun'","type==='light'","type==='charge'"])
  assert.ok(art.includes(type),type);
 assert.match(read('sw.js'),/src\/shop-art\.js/);
});


test('skipper and shop gear use matching hard-edged pixel sprites and inspection animations',()=>{
 const game=read('src/game.js'),art=read('src/shop-art.js');
 assert.match(art,/const cache=new Map\(\)/);
 assert.match(art,/imageSmoothingEnabled=false/);
 assert.match(art,/function skipperFrame\(/);
 assert.match(art,/export function paintSkipper\(/);
 assert.match(art,/function gearSprite\(/);
 assert.match(art,/export function paintShopItem\(/);
 assert.doesNotMatch(art,/portraitSvg|<svg|createRadialGradient|ctx\.ellipse|ctx\.arc\(/);
 assert.match(game,/paintSkipper\(ctx,clock,x,y,\{mood:/);
 assert.match(game,/function openShopInspect\(/);
 assert.match(game,/function shopInspectOverlay\(/);
 assert.match(game,/paintShopItem\(ctx,secret\?secret\.item:gear\.type,210,334,2\.08/);
 assert.match(game,/hits\.length=0/);
 assert.match(game,/shopInspect\)shopInspectOverlay\(\)/);
});

test('progressive curio shelf remembers inspected finds separately from fishing saves',()=>{
 const game=read('src/game.js'),secrets=read('src/shop-secrets.js'),sw=read('sw.js');
 assert.match(game,/const SHOP_SECRETS_KEY='reel-trouble-shop-secrets-v1'/);
 assert.match(game,/function loadShopSecretsSeen\(/);
 assert.match(game,/function saveShopSecretsSeen\(/);
 assert.match(game,/shopSecretsSeen\.push\(selected\.id\)/);
 assert.match(game,/function shopStoryButton\(/);
 assert.match(secrets,/export function nextShopSecret/);
 assert.match(sw,/src\/shop-secrets\.js/);
});
