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
 assert.match(read('src/styles.css'), /image-rendering:pixelated/);
});
