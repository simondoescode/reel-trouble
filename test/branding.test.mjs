import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const file=(name)=>readFileSync(new URL('../'+name,import.meta.url));
function pngSize(name){
 const data=file(name);
 assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a',name+' signature');
 return [data.readUInt32BE(16),data.readUInt32BE(20)];
}
test('title screen draws the original logo and retains a safe fallback',()=>{
 const game=file('src/game.js').toString('utf8');
 assert.match(game,/titleLogo\.src='\.\x2fassets\x2ftitle-logo\.webp'/);
 assert.match(game,/titleLogo\.naturalWidth>0/);
 assert.match(game,/ctx\.drawImage\(titleLogo/);
 assert.match(game,/text\('REEL'/);
 const logo=file('assets/title-logo.webp');
 assert.equal(logo.subarray(0,4).toString('utf8'),'RIFF');
 assert.equal(logo.subarray(8,12).toString('utf8'),'WEBP');
});
test('app icons have correct resolutions and maskable image is separate',()=>{
 assert.deepEqual(pngSize('icons/icon-192.png'),[192,192]);
 assert.deepEqual(pngSize('icons/icon-512.png'),[512,512]);
 assert.deepEqual(pngSize('icons/icon-maskable-512.png'),[512,512]);
 assert.deepEqual(pngSize('icons/apple-touch-icon.png'),[180,180]);
 assert.deepEqual(pngSize('icons/favicon.png'),[64,64]);
 const ico=file('icons/favicon.ico');
 assert.equal(ico.readUInt16LE(2),1);
 const m=JSON.parse(file('manifest.webmanifest').toString('utf8'));
 assert.deepEqual(m.icons.map(i=>i.purpose),['any','any','maskable']);
});
test('every image is referenced, included in production build, and offline',()=>{
 const html=file('index.html').toString('utf8');
 const vite=file('vite.config.js').toString('utf8');
 const worker=file('sw.js').toString('utf8');
 for(const path of ['assets/title-logo.webp','icons/favicon.png','icons/favicon.ico','icons/apple-touch-icon.png','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png']){
  assert.ok(vite.includes(path),'Missing Vite asset: '+path);
  assert.ok(worker.includes(path),'Missing offline asset: '+path);
 }
 assert.match(worker,/reel-trouble-offline-v8/);
 assert.match(html,/rel="preload".*title-logo\.webp/);
 assert.match(html,/rel="apple-touch-icon".*apple-touch-icon\.png/);
 assert.match(html,/rel="icon".*favicon\.ico/);
});
