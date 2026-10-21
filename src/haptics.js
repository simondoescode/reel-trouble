// Browser-native vibration: short, original patterns for arcade feedback.
// Navigator.vibrate requires user interaction and is not supported on all devices.
export const RUMBLE_PATTERNS=Object.freeze({
 cast:Object.freeze([14]),
 catch:Object.freeze([18,30,24]),
 legendary:Object.freeze([36,35,52,35,75]),
 sting:Object.freeze([85,45,110]),
 shot:Object.freeze([12]),
 hit:Object.freeze([25,20,34]),
 combo:Object.freeze([30,23,46]),
 upgrade:Object.freeze([20,26,42]),
 preview:Object.freeze([15,25,22])
});
export function createRumble({vibrate,now=()=>Date.now(),suppressed=()=>false,minimumGap=60}={}){
 const browser=typeof navigator==='undefined'?null:navigator;
 const pulse=typeof vibrate==='function'?vibrate:
  typeof browser?.vibrate==='function'?browser.vibrate.bind(browser):null;
 let enabled=true,lastAt=-Infinity,active=false;
 function stop(){
  if(!pulse||!active)return;
  try{pulse(0);}catch(_){}
  active=false;
 }
 return {
  supported(){return Boolean(pulse);},
  setEnabled(value){enabled=Boolean(value);if(!enabled)stop();},
  isEnabled(){return enabled;},
  stop,
  play(kind){
   const pattern=RUMBLE_PATTERNS[kind];
   if(!enabled||!pulse||!pattern||suppressed())return false;
   const at=now();
   if(at-lastAt<minimumGap)return false;
   try{
    const result=pulse([...pattern]);
    if(result===false)return false;
    lastAt=at;active=true;
    return true;
   }catch(_){return false;}
  }
 };
}
