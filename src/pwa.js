// Native install prompt is offered only when the browser deems the site installable.
// Show clear manual installation instructions otherwise, especially in in-app browsers.
let deferredPrompt=null;
let installed=false;
let workerState='checking';
let started=false;
export function isInstalled(){
 return installed||Boolean(window.matchMedia?.('(display-mode: standalone)').matches)
  ||navigator.standalone===true;
}
export function canInstall(){return Boolean(deferredPrompt)&&!isInstalled();}
export function serviceWorkerStatus(){return workerState;}
export function installGuide(userAgent=navigator.userAgent||''){
 const ua=String(userAgent);
 if(/iPhone|iPad|iPod/i.test(ua))
  return {platform:'iPhone / iPad',steps:['OPEN IN SAFARI','TAP THE SHARE BUTTON','CHOOSE ADD TO HOME SCREEN','TAP ADD TO INSTALL']};
 if(/Android/i.test(ua))
  return {platform:'Android',steps:['OPEN IN CHROME','TAP THE THREE-DOT MENU','CHOOSE INSTALL APP OR ADD TO HOME SCREEN','CONFIRM INSTALL']};
 return {platform:'Desktop / Other',steps:['OPEN IN CHROME OR EDGE','OPEN THE BROWSER MENU','CHOOSE INSTALL REEL TROUBLE','CONFIRM THE SHORTCUT']};
}
export async function requestInstall(){
 if(!canInstall())return false;
 const prompt=deferredPrompt;deferredPrompt=null;
 try{
  await prompt.prompt();
  const result=await prompt.userChoice;
  return result?.outcome==='accepted';
 }catch(_){return false;}
}
export function setupPwa(){
 if(started)return;
 started=true;
 window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();deferredPrompt=event;
 });
 window.addEventListener('appinstalled',()=>{
  installed=true;deferredPrompt=null;
 });
 if(!('serviceWorker' in navigator)||!window.isSecureContext){
  workerState='unsupported';return;
 }
 if(['localhost','127.0.0.1'].includes(location.hostname)){
  workerState='development';return;
 }
 const register=()=>{
  // Use the document's directory, NOT the generated Vite JS bundle directory.
  const base=new URL('./',document.baseURI);
  navigator.serviceWorker.register(new URL('sw.js',base).href,{scope:base.pathname})
   .then(registration=>{workerState=registration.active?'ready':'registered';})
   .catch(()=>{workerState='failed';});
 };
 if(document.readyState==='complete')register();
 else window.addEventListener('load',register,{once:true});
}
