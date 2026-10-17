// Original, fully synthesised 16-bar arcade soundtrack. No streamed music,
// licensed samples or network dependency: every instrument is played by Web Audio.
export const ARCADE_MELODY = Object.freeze([74,78,81,0,86,81,78,0,74,78,81,83,81,78,76,0]);
export const UNDERWATER_MELODY = Object.freeze([69,71,74,76,78,76,74,71,69,71,74,78,76,74,71,0]);
export const SHOT_MELODY = Object.freeze([74,81,86,81,78,81,88,86,83,81,78,81,86,83,81,0]);
export const ARCADE_BASS = Object.freeze([38,0,0,38,0,0,45,0,38,0,0,42,38,0,45,0]);
export const MUSIC_BPM = 128;
export const MUSIC_STEP_SECONDS = Object.freeze({
 menu:60/MUSIC_BPM/4,shop:60/MUSIC_BPM/4,descent:60/MUSIC_BPM/4,
 ascent:60/MUSIC_BPM/4,shoot:60/MUSIC_BPM/4,results:60/MUSIC_BPM/4
});
// Four sections: opening, chorus, bridge, and final chorus (16 bars / ~30 sec).
// The harmonic progression is shared by all scenes so changing pages is musical,
// not a forced restart or abrupt key change.
export const SONG_CHORDS = Object.freeze([
 50,47,43,45, 50,47,43,45, 43,50,47,45, 50,43,45,50
]);
const TRIADS = Object.freeze({
 50:[50,54,57,62],47:[47,50,54,59],43:[43,47,50,55],45:[45,49,52,57]
});
const TRANSPOSE = Object.freeze({50:0,47:-3,43:-7,45:-5});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function noteFrequency(note){
 if(!Number.isFinite(note)||note<=0)return 0;
 return 440*Math.pow(2,(note-69)/12);
}
export function melodyNote(step,scene){
 const melody=scene==='shoot'?SHOT_MELODY:
  scene==='descent'||scene==='ascent'?UNDERWATER_MELODY:ARCADE_MELODY;
 return noteFrequency(melody[((Math.floor(step)%16)+16)%16]);
}
export function soundtrackStep(step,scene='menu'){
 const index=((Math.floor(step)%256)+256)%256;
 const bar=Math.floor(index/16),part=index%16,root=SONG_CHORDS[bar];
 const motif=scene==='shoot'?SHOT_MELODY:
  scene==='descent'||scene==='ascent'?UNDERWATER_MELODY:ARCADE_MELODY;
 let note=motif[part];
 // Short answers and fills change every four bars rather than repeating the same riff.
 if(note){
  note+=TRANSPOSE[root];
  if(bar>=4&&bar<8&&part>=8)note+=part%4===0?12:0;
  if(bar>=8&&bar<12&&part%8===4)note-=12;
  if(bar>=12&&part===12)note+=12;
 }
 return {index,bar,part,root,chord:TRIADS[root],lead:note||0,
  section:Math.floor(bar/4)};
}
export function createArcadeAudio(){
 let ctx=null,output=null,musicBus=null,ocean=null,oceanGain=null,noiseBuffer=null;
 let isSound=true,isMusic=true,paused=false,lastScene='menu',bubbleTime=0;
 let step=0,nextStepAt=0;
 function getContext(){
  if(ctx)return ctx;
  const Ctor=typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext);
  if(!Ctor)return null;
  try{
   ctx=new Ctor();
   output=ctx.createGain();output.gain.value=.5;output.connect(ctx.destination);
   musicBus=ctx.createGain();musicBus.gain.value=isMusic?.82:0;
   musicBus.connect(output);
   return ctx;
  }catch(_){ctx=null;output=null;musicBus=null;return null;}
 }
 function unlock(){
  if(!isMusic&&!isSound)return;
  const c=getContext();if(!c)return;
  if(c.state==='suspended')void c.resume().catch(()=>{});
 }
 function fade(node,value,time=.075){
  if(!ctx||!node)return;
  const gain=node.gain||node;
  gain.cancelScheduledValues?.(ctx.currentTime);
  gain.setTargetAtTime(value,ctx.currentTime,time);
 }
 // Effects are mixed independently of the soundtrack, with their familiar feedback.
 function tone(frequency,duration=.1,type='square',volume=.07,delay=0,fall=.65){
  if(!ctx||!output||ctx.state!=='running'||!Number.isFinite(frequency)||frequency<=0)return;
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
 function voice(note,time,length,{wave='triangle',volume=.04,attack=.008,
   release=.13,cutoff=0,detune=0}={}){
  if(!ctx||!musicBus||!note)return;
  const start=Math.max(time,ctx.currentTime),end=start+Math.max(.025,length);
  try{
   const oscillator=ctx.createOscillator(),envelope=ctx.createGain();
   oscillator.type=wave;oscillator.frequency.setValueAtTime(noteFrequency(note),start);
   oscillator.detune.value=detune;
   envelope.gain.setValueAtTime(.0001,start);
   envelope.gain.linearRampToValueAtTime(volume,start+Math.min(attack,length*.4));
   envelope.gain.setValueAtTime(volume*.7,Math.max(start+attack,end-release));
   envelope.gain.exponentialRampToValueAtTime(.0001,end);
   if(cutoff){
    const filter=ctx.createBiquadFilter();filter.type='lowpass';
    filter.frequency.value=cutoff;
    oscillator.connect(filter).connect(envelope);
   }else oscillator.connect(envelope);
   envelope.connect(musicBus);
   oscillator.start(start);oscillator.stop(end+.025);
  }catch(_){}
 }
 function initNoise(){
  if(noiseBuffer||!ctx)return;
  const length=Math.ceil(ctx.sampleRate*.25);
  noiseBuffer=ctx.createBuffer(1,length,ctx.sampleRate);
  const samples=noiseBuffer.getChannelData(0);
  for(let i=0;i<length;i++)samples[i]=Math.random()*2-1;
 }
 function percussion(time,length,frequency,volume,type='highpass'){
  try{
   initNoise();
   const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
   source.buffer=noiseBuffer;filter.type=type;filter.frequency.value=frequency;
   gain.gain.setValueAtTime(volume,time);
   gain.gain.exponentialRampToValueAtTime(.0001,time+length);
   source.connect(filter).connect(gain).connect(musicBus);
   source.start(time);source.stop(time+length+.005);
  }catch(_){}
 }
 function kick(time,level=1){
  try{
   const oscillator=ctx.createOscillator(),gain=ctx.createGain();
   oscillator.type='sine';
   oscillator.frequency.setValueAtTime(135,time);
   oscillator.frequency.exponentialRampToValueAtTime(45,time+.16);
   gain.gain.setValueAtTime(.0001,time);
   gain.gain.linearRampToValueAtTime(.18*level,time+.007);
   gain.gain.exponentialRampToValueAtTime(.0001,time+.21);
   oscillator.connect(gain).connect(musicBus);
   oscillator.start(time);oscillator.stop(time+.22);
  }catch(_){}
 }
 function startOcean(){
  if(ocean||!ctx||!output)return;
  try{
   initNoise();
   ocean=ctx.createBufferSource();ocean.buffer=noiseBuffer;ocean.loop=true;
   const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=340;
   oceanGain=ctx.createGain();oceanGain.gain.value=0;
   ocean.connect(filter).connect(oceanGain).connect(output);ocean.start();
  }catch(_){ocean=null;oceanGain=null;}
 }
 function wetScene(scene){return scene==='descent'||scene==='ascent';}
 function setOptions({sound=true,music=true}={}){
  isSound=Boolean(sound);isMusic=Boolean(music);
  if(musicBus)fade(musicBus,isMusic&&!paused?.82:0);
  if(oceanGain)fade(oceanGain,isSound&&!paused&&wetScene(lastScene)?.035:0);
 }
 function pause(value=true){
  paused=Boolean(value);
  if(musicBus)fade(musicBus,paused?0:(isMusic?.82:0),.05);
  if(oceanGain)fade(oceanGain,paused?0:(isSound&&wetScene(lastScene)?.035:0),.05);
 }
 function play(name,{pitch=0,frequency=400,duration=.07,type='sine'}={}){
  if(!isSound||paused)return;
  if(name==='tone'){tone(frequency,duration,type,.07);return;}
  const shift=Number.isFinite(pitch)?pitch:0;
  if(name==='cast'||name==='splash'){
   tone(205,.17,'triangle',.085,0,.45);tone(630,.12,'sine',.038,.045,.37);
  }else if(name==='catch'){
   tone(500+shift*28,.105,'square',.07,0,1.2);
   tone(745+shift*38,.15,'triangle',.06,.085,1.16);
  }else if(name==='reel'){
   tone(310,.16,'triangle',.055,0,1.4);tone(470,.1,'square',.035,.1,1.12);
  }else if(name==='shot'){
   tone(170-shift*12,.095,'sawtooth',.07,0,.36);
   tone(650,.035,'square',.025,.016,.45);
  }else if(name==='hit'){
   tone(640+shift*44,.11,'square',.075,0,1.3);
   tone(960+shift*52,.14,'triangle',.06,.07,1.16);
  }else if(name==='water-return'){
   tone(220,.19,'triangle',.072,0,.42);tone(475,.11,'sine',.042,.045,.38);
  }else if(name==='finisher'){
   tone(265,.24,'sawtooth',.075,0,.48);
   tone(530,.16,'square',.057,.09,1.4);
   tone(784,.24,'triangle',.085,.2,1.28);
   tone(1047,.28,'sine',.06,.31,1.15);
  }else if(name==='miss')tone(195,.085,'triangle',.035,0,.66);
  else if(name==='combo'){
   tone(740,.09,'square',.065,0,1.12);
   tone(988,.13,'square',.05,.095,1.12);
  }else if(name==='upgrade'||name==='results'){
   for(let i=0;i<3;i++)tone([523,659,784][i],.16,'triangle',.075,i*.1,1.09);
  }else if(name==='bubble')tone(320+shift,.08,'sine',.023,0,1.9);
 }
 // A single score and fixed BPM for every screen. Instruments build or relax
 // with gameplay, but the current bar and beat never rewind on scene changes.
 function scheduleStep(index,time,scene){
  const s=soundtrackStep(index,scene),pulse=MUSIC_STEP_SECONDS.menu;
  const underwater=wetScene(scene),battle=scene==='shoot';
  const shop=scene==='shop',celebration=scene==='results';
  const leadGain=underwater?.025:battle?.054:.046;
  const leadWave=underwater?'triangle':battle?'sawtooth':shop?'triangle':'square';
  const phrase=s.section===1||s.section===3;
  if(s.part===0){
   const padVolume=underwater?.018:.015;
   for(const n of s.chord.slice(0,3)){
    voice(n+12,time,pulse*19,{wave:'triangle',volume:padVolume,
     attack:.12,release:.32,cutoff:underwater?1000:1850});
   }
  }
  if(s.lead&&(!underwater||s.part%2===0||s.part===1)){
   const note=s.lead+(phrase&&s.part===0?12:0);
   voice(note,time,pulse*(s.part%4===0?2.5:1.65),{
    wave:leadWave,volume:leadGain*(phrase?1.13:1),
    attack:.008,release:underwater?.15:.09,cutoff:underwater?1950:4200
   });
   if(battle&&s.part%4===0)voice(note-12,time,pulse*1.8,
    {wave:'square',volume:.019,attack:.004,release:.06,cutoff:2200});
  }
  // Answering arpeggios and offbeat plucks fill the space between melody notes.
  if(s.part%2===1||s.part===6||s.part===14){
   const arpNotes=s.chord;
   const n=arpNotes[(s.part+s.bar)%4]+24;
   voice(n,time,pulse*(underwater?2.9:1.1),{
    wave:underwater?'sine':'triangle',volume:underwater?.012:shop?.025:.016,
    attack:.006,release:.08,cutoff:underwater?1350:3700
   });
  }
  if([0,6,8,11,12,14].includes(s.part)){
   const bassNote=s.root-12+(s.part===6||s.part===14?7:0);
   voice(bassNote,time,pulse*(s.part===0?4.6:2.1),{
    wave:'triangle',volume:underwater?.058:battle?.105:.083,
    attack:.005,release:.07,cutoff:500});
   if(!underwater&&s.part%4===0)voice(bassNote,time,pulse*1.6,
    {wave:'sawtooth',volume:.012,attack:.003,release:.05,cutoff:700});
  }
  if(s.part%4===0)kick(time,underwater?.58:battle?1.14:.91);
  if(s.part===4||s.part===12){
   percussion(time,underwater?.095:.13,underwater?1400:1900,
    underwater?.025:battle?.083:.056,'bandpass');
   voice(50,time,pulse*.7,{wave:'triangle',volume:.016,release:.05});
  }
  if(s.part%2===0&&(!underwater||s.part%4===0)){
   percussion(time,underwater?.045:.057,battle?6400:4900,
    underwater?.008:battle?.032:.019);
  }
  if((battle||phrase)&&s.part%4===3)
   percussion(time,.13,4400,battle?.03:.014);
  if(celebration&&s.part===0)
   voice(s.root+24,time,pulse*6,{wave:'square',volume:.02,release:.22});
 }
 function update(dt,scene,hidden=false){
  lastScene=scene;
  if(!ctx||!output)return;
  if(isSound&&!ocean)startOcean();
  if(oceanGain){
   const wanted=!paused&&!hidden&&isSound&&wetScene(scene)?.035:0;
   if(Math.abs(oceanGain.gain.value-wanted)>.003)fade(oceanGain,wanted,.18);
  }
  const blocked=paused||hidden||ctx.state!=='running';
  if(blocked){
   // AudioContext time may advance while gameplay is paused: skip the elapsed
   // wall-clock time rather than bursting queued notes upon return.
   nextStepAt=0;
   if(musicBus)fade(musicBus,0,.05);
   return;
  }
  if(musicBus&&musicBus.gain.value<(isMusic?.7:-1))fade(musicBus,isMusic?.82:0);
  if(!nextStepAt||nextStepAt<ctx.currentTime-.25)nextStepAt=ctx.currentTime+.02;
  const duration=MUSIC_STEP_SECONDS.menu;
  // Tiny lookahead eliminates mobile frame-rate jitter without playing music
  // in advance of a new page or generating an audio backlog.
  let scheduled=0;
  while(nextStepAt<ctx.currentTime+.135&&scheduled<3){
   if(isMusic)scheduleStep(step,nextStepAt,scene);
   step++;nextStepAt+=duration;scheduled++;
  }
  if(isSound&&wetScene(scene)){
   bubbleTime+=Math.min(.08,Math.max(0,dt));
   if(bubbleTime>=1.7){
    bubbleTime-=1.7;play('bubble',{pitch:Math.round(Math.random()*125)});
   }
  }else bubbleTime=0;
 }
 function transport(){return {step,scene:lastScene};}
 function dispose(){
  if(ocean){try{ocean.stop();}catch(_){}ocean=null;}
  if(ctx){void ctx.close().catch(()=>{});ctx=null;}
 }
 return {unlock,play,update,pause,setOptions,dispose,transport};
}
