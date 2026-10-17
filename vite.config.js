import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Copy the same root PWA assets into dist, keeping branch publishing usable as a fallback.
const root=dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  base: '/reel-trouble/',
  plugins:[{
    name:'copy-mobile-assets',
    apply:'build',
    generateBundle(){
      for(const name of ['sw.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png']){
        this.emitFile({type:'asset',fileName:name,source:readFileSync(resolve(root,name))});
      }
    }
  }]
});
