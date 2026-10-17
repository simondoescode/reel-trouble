// Procedurally generated, original chiptune soundtrack and sound effects.
// No samples, downloads, tracking, or external assets.
export const ARCADE_MELODY = Object.freeze([64,67,71,76,0,74,71,67,62,66,69,74,0,71,69,66]);
export const UNDERWATER_MELODY = Object.freeze([52,0,59,64,55,0,62,67,57,0,64,69,55,62,59,0]);
export const SHOT_MELODY = Object.freeze([76,79,83,86,83,79,74,77,81,84,81,77,72,76,79,83]);
export function noteFrequency(note){
 if(!Number.isFinite(note)||note<=0)return 0;
 return 440*Math.pow(2,(note-69)/12);
}
export function melodyNote(step,scene){
 const pattern=scene==='shoot'?SHOT_MELODY:
  scene==='descent'||scene==='ascent'?UNDERWATER_MELODY:ARCADE_MELODY;
 const note=pattern[((Math.floor(step)%pattern.length)+pattern.length)%pattern.length];
 return noteFrequency(note);
}
export function createArcadeAudio(){
 let ctx=null,output=null,ocean=null,oceanGain=null;
 let isSound=true,isMusic=true,paused=false,lastScene='',beat=0,beatTime=0,bubbleTime=0;
 function getContext(){
  if(ctx)return ctx;
  const Ctor=typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext);
  if(!Ctor)return null;
  try{
   ctx=new Ctor();
   output=ctx.createGain();output.gain.value=.5;output.connect(ctx.destination);
   return ctx;
  }catch(_){ctx=null;return null;}
 }
 function unlock(){
  if(!isMusic&&!isSound)return;
  const c=getContext();if(!c)return;
  if(c.state==='suspended')void c.resume().catch(()=>{});
 }
 function tone(frequency,duration=.1,type='square',volume=.07,delay=0,fall=.65){
  if(!ctx||!output||ctx.state==='closed'||!Number.isFinite(frequency)||frequency<=0)return;
  const now=ctx.currentTime+Math.max(0,delay),end=now+Math.max(.015,duration);
  try{
   const oscillator=ctx.createOscillator(),gain=ctx.createGain();
   oscillator.type=type;
   oscillator.frequency.setValueAtTime(Math.max(40,frequency),now);
   oscillator.frequency.exponentialRampToValueAtTime(Math.max(40,frequency*fall),end);
   gain.gain.setValueAtTime(.0001,now);
   gain.gain.exponentialRampToValueAtTime(Math.max(.00015,volume),now+.008);
   gain.gain.exponentialRampToValueAtTime(.0001,end);
   oscillator.connect(gain).connect(output);
   oscillator.start(now);oscillator.stop(end+.008);
  }catch(_){}
 }
 function startOcean(){
  if(ocean||!ctx||!output)return;
  try{
   const length=ctx.sampleRate;
   const buffer=ctx.createBuffer(1,length,ctx.sampleRate),samples=buffer.getChannelData(0);
   // Filtered white-noise surf, looped quietly under the chiptune.
   for(let i=0;i<length;i++)samples[i]=Math.random()*2-1;
   ocean=ctx.createBufferSource();ocean.buffer=buffer;ocean.loop=true;
   const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=320;
   oceanGain=ctx.createGain();oceanGain.gain.value=0;
   ocean.connect(filter).connect(oceanGain).connect(output);
   ocean.start();
  }catch(_){ocean=null;oceanGain=null;}
 }
 function setOptions({sound=true,music=true}={}){
  isSound=Boolean(sound);isMusic=Boolean(music);
  if(oceanGain&&ctx){
   const enabled=isSound&&!paused&&['descent','ascent'].includes(lastScene);
   oceanGain.gain.setTargetAtTime(enabled?.042:0,ctx.currentTime,.08);
  }
 }
 function pause(value=true){
  paused=Boolean(value);
  if(ctx&&oceanGain)oceanGain.gain.setTargetAtTime(paused?0:(isSound&&['descent','ascent'].includes(lastScene)?.042:0),ctx.currentTime,.06);
 }
 function play(name,{pitch=0,frequency=400,duration=.07,type='sine'}={}){
  if(!isSound||paused)return;
  if(name==='tone'){tone(frequency,duration,type,.07);return;}
  const shift=Number.isFinite(pitch)?pitch:0;
  if(name==='cast'||name==='splash'){
   tone(205,.17,'triangle',.085,0,.45);
   tone(630,.12,'sine',.038,.045,.37);
  }else if(name==='catch'){
   tone(500+shift*28,.105,'square',.07,0,1.2);
   tone(745+shift*38,.15,'triangle',.06,.085,1.16);
  }else if(name==='reel'){
   tone(310,.16,'triangle',.055,0,1.4);
   tone(470,.1,'square',.035,.1,1.12);
  }else if(name==='shot'){
   tone(170-shift*12,.095,'sawtooth',.07,0,.36);
   tone(650,.035,'square',.025,.016,.45);
  }else if(name==='hit'){
   tone(640+shift*44,.11,'square',.075,0,1.3);
   tone(960+shift*52,.14,'triangle',.06,.07,1.16);
  }else if(name==='miss'){
   tone(195,.085,'triangle',.035,0,.66);
  }else if(name==='combo'){
   tone(740,.09,'square',.065,0,1.12);
   tone(988,.13,'square',.05,.095,1.12);
  }else if(name==='upgrade'||name==='results'){
   for(let i=0;i<3;i++)tone([523,659,784][i],.16,'triangle',.075,i*.1,1.09);
  }else if(name==='bubble'){
   tone(320+shift,.08,'sine',.023,0,1.9);
  }
 }
 function update(dt,scene,hidden=false){
  const blocked=paused||hidden;
  if(!ctx||!output)return;
  if(scene!==lastScene){
   lastScene=scene;beat=0;beatTime=0;
  }
  if(isSound&&!ocean)startOcean();
  if(oceanGain){
   const wet=['descent','ascent'].includes(scene);
   const volume=!blocked&&isSound&&wet?.042:0;
   // Avoid rescheduling ramp automation every frame.
   if(Math.abs(oceanGain.gain.value-volume)>.003)
    oceanGain.gain.setTargetAtTime(volume,ctx.currentTime,.18);
  }
  if(blocked)return;
  if(isMusic){
   beatTime+=Math.min(.08,Math.max(0,dt));
   const interval=scene==='shoot'?.18:.245;
   if(beatTime>=interval){
    beatTime-=interval;
    const freq=melodyNote(beat++,scene);
    if(freq){
     tone(freq,.115,'square',scene==='shoot'?.028:.022,0,1);
     if(beat%4===0)tone(freq/2,.18,'triangle',.025,0,1);
    }
   }
  }else{beatTime=0;}
  if(isSound&&['descent','ascent'].includes(scene)){
   bubbleTime+=Math.min(.08,Math.max(0,dt));
   if(bubbleTime>=1.7){
    bubbleTime-=1.7;
    play('bubble',{pitch:Math.round(Math.random()*125)});
   }
  }else bubbleTime=0;
 }
 function dispose(){
  if(ocean){try{ocean.stop();}catch(_){}ocean=null;}
  if(ctx){void ctx.close().catch(()=>{});ctx=null;}
 }
 return {unlock,play,update,pause,setOptions,dispose};
}
