// A deterministic UTC ocean, without remote accounts or changes to the campaign save.
export const DAILY_KEY='reel-trouble-daily-v1';
export function utcDay(date=new Date()){
 const d=date instanceof Date?date:new Date(date);
 if(Number.isNaN(d.valueOf()))throw new TypeError('Invalid date');
 return d.toISOString().slice(0,10);
}
export function dailySeed(day=utcDay()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new TypeError('Expected YYYY-MM-DD');
 let hash=2166136261;
 for(const ch of 'REEL-TROUBLE-V02:'+day){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}
 return hash>>>0;
}
export function dailyCode(day=utcDay()){return day.replaceAll('-','')+'-'+dailySeed(day).toString(16).padStart(8,'0').toUpperCase();}
export function normalizeDaily(raw,day=utcDay()){
 const src=raw&&typeof raw==='object'&&raw.day===day?raw:{};
 return {day,dives:Number.isSafeInteger(src.dives)&&src.dives>=0?src.dives:0,
  best:Number.isFinite(src.best)?Math.max(0,Math.floor(src.best)):0};
}
export function recordDaily(raw,score,day=utcDay()){
 const prev=normalizeDaily(raw,day);
 const result={day,dives:prev.dives+1,best:Math.max(prev.best,Math.max(0,Math.floor(Number(score)||0)))};
 return {result,newBest:result.best>prev.best};
}
