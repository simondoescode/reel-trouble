import {biomeAtDepth} from './ocean.js';
// Deterministic region-specific effects: discoverable, steerable and never random punishment.
export const REGION_RULES=Object.freeze({
 sunskip:{label:'TIDAL LANE',hint:'CENTRE = QUICKER DIVE'},
 bluewander:{label:'CROSS CURRENT',hint:'STEER INTO THE FLOW'},
 knuckles:{label:'KELP DRAG',hint:'AVOID THE OUTER KELP'},
 hush:{label:'ECHO PULSE',hint:'TIME THE SONAR'},
 lantern:{label:'LUMEN TRAIL',hint:'FOLLOW THE LIGHT'},
 blackglass:{label:'PRESSURE SURGE',hint:'TIME YOUR STEERING'},
 unmarked:{label:'REVERSE DRIFT',hint:'COUNTER THE CURRENT'}
});
export function regionField(depth,elapsed=0,hookX=210){
 const id=biomeAtDepth(depth).id,t=Math.max(0,Number(elapsed)||0),x=Number.isFinite(hookX)?hookX:210;
 const base={id,...REGION_RULES[id],drift:0,diveRate:1,steerRate:1,visionBoost:0,catchBoost:0,active:false,laneX:210};
 switch(id){
 case 'sunskip':return {...base,active:Math.abs(x-210)<55,diveRate:Math.abs(x-210)<55?1.2:1};
 case 'bluewander':return {...base,drift:Math.sin(t*.82+depth*.0002)*44,active:true};
 case 'knuckles':return {...base,active:x<100||x>320,diveRate:x<100||x>320?.7:1};
 case 'hush':return {...base,active:t%5.5<1.7,visionBoost:t%5.5<1.7?145:0};
 case 'lantern':{
  const laneX=210+105*Math.sin(t*.5+depth*.0004),active=Math.abs(x-laneX)<64;
  return {...base,laneX,active,visionBoost:active?105:0,catchBoost:active?18:0};
 }
 case 'blackglass':{const active=t%4.8<.9;return {...base,active,diveRate:active?1.33:1,steerRate:active?.77:1};}
 case 'unmarked':return {...base,drift:Math.sin(t*1.15)>0?52:-52,active:true};
 default:return base;
 }
}
