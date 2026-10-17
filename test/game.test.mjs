import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Vite entry loads CSS and the game module', () => {
  assert.match(read('index.html'), /type="module" src="\/src\/main\.js"/);
  assert.match(read('src/main.js'), /import '\.?\/styles\.css'/);
  assert.match(read('src/main.js'), /import '\.?\/game\.js'/);
  assert.match(read('index.html'), /<canvas id="game"/);
});

test('core fishing phases and player progress remain in the game', () => {
  const game = read('src/game.js');
  for (const phase of ["'menu'", "'descent'", "'ascent'", "'shoot'", "'results'", "'shop'"]) {
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
