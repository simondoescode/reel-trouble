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

test('pixel art uses nearest-neighbour scaling and hand-authored sprites', () => {
 const game=read('src/game.js');
 assert.match(game, /PIXEL=2/);
 assert.match(game, /pixelCanvas\.width=W\/PIXEL/);
 assert.match(game, /display\.imageSmoothingEnabled=false/);
 assert.match(game, /display\.drawImage\(pixelCanvas/);
 assert.match(game, /const FISH_SPRITE=/);
 assert.match(read('src/styles.css'), /image-rendering:\s*pixelated/);
});

test('vibrant pixel colours and visual effects stay available', () => {
 const game=read('src/game.js');
 const css=read('src/styles.css');
 assert.match(game, /teal:'#20e3d0'/);
 assert.match(game, /yellow:'#ffe35b'/);
 assert.match(game, /const fishPalette=\[/);
 assert.match(game, /oceanPalette\(worldDepth\)/);
 assert.match(game, /const sky=\['#293d83'/);
 assert.match(game, /const sparks=\[color,C\.yellow,C\.teal,C\.cream,C\.pink\]/);
 assert.match(css, /image-rendering: pixelated/);
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

test('shooting has unlimited ammunition and ends when caught fish are shot or time expires',()=>{
 const game=read('src/game.js');
 assert.match(game,/topBar\('SHOOT THE CATCH',Math\.ceil\(shootTime\)\+'s','AMMO ∞'\)/);
 assert.doesNotMatch(game,/ammo\s*--|ammo\s*<=\s*0|ammo\s*=\s*9/);
 assert.match(game,/if\(airborne\.every\(f=>f\.shot\)\)setTimeoutSafe\(endRound,380\)/);
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
 assert.deepEqual(manifest.icons.map(icon=>icon.sizes),['192x192','512x512']);
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
 assert.match(game,/sound\.update\(dt,state,document\.hidden\)/);
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
 assert.match(game,/const populated=spawnOcean\(maxDepth,Math\.random\)/);
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
