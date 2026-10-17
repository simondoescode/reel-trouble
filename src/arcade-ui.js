// Pure timing and stage definitions for the canvas arcade interstitials.
// Gameplay owns the timer so pausing or backgrounding a round freezes the cue.
export const ARCADE_STAGES = Object.freeze({
 dive: Object.freeze({number:'01',title:'DIVE IN!',subtitle:'DODGE FISH • GO DEEP',accent:'#43f5e2'}),
 reel: Object.freeze({number:'02',title:'REEL IT IN!',subtitle:'SWEEP UP YOUR CATCH',accent:'#ffe76a'}),
 shoot: Object.freeze({number:'03',title:'LOCK & LOAD!',subtitle:'TAP THE FLYING FISH',accent:'#ff76ba'}),
 results: Object.freeze({number:'04',title:'CAST COMPLETE',subtitle:'YOUR HAUL IS IN!',accent:'#ffe76a'})
});
export const STAGE_DURATION=0.82;
export const easeOutCubic=value=>1-Math.pow(1-Math.max(0,Math.min(1,Number(value)||0)),3);
export function stageFrame(elapsed,duration=STAGE_DURATION){
 const t=Math.max(0,Math.min(1,(Number(elapsed)||0)/Math.max(.01,duration)));
 const entrance=Math.min(1,t/.22),exit=Math.min(1,(1-t)/.27);
 const visibility=easeOutCubic(Math.max(0,Math.min(entrance,exit)));
 return {progress:t,visibility,slide:(1-easeOutCubic(entrance))*58,accentProgress:easeOutCubic(t)};
}
export function startStage(kind,reduced=false){
 if(reduced||!ARCADE_STAGES[kind])return null;
 return {kind,elapsed:0,duration:STAGE_DURATION};
}
