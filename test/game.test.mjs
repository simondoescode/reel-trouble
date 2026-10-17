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
 assert.match(game, /const bands=\['#1599ae'/);
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
