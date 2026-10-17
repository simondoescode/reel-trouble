let deferredPrompt=null;
let installed=false;
export function isInstalled(){
 return installed || Boolean(window.matchMedia?.('(display-mode: standalone)').matches) ||
   navigator.standalone===true;
}
export function canInstall(){return Boolean(deferredPrompt)&&!isInstalled();}
export async function requestInstall(){
 if(!canInstall())return false;
 const prompt=deferredPrompt;
 deferredPrompt=null;
 try{
  await prompt.prompt();
  const result=await prompt.userChoice;
  return result?.outcome==='accepted';
 }catch(_){return false;}
}
export function setupPwa(){
 window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();deferredPrompt=event;
 });
 window.addEventListener('appinstalled',()=>{
  installed=true;deferredPrompt=null;
 });
 if(!('serviceWorker' in navigator) || !window.isSecureContext)return;
 // Avoid service worker caching while iterating with the Vite dev server.
 if(['localhost','127.0.0.1'].includes(location.hostname))return;
 window.addEventListener('load',()=>{
  navigator.serviceWorker.register(new URL('./sw.js',document.baseURI),{scope:'./'}).catch(()=>{});
 });
}
