// Story curiosities unlock from existing saved depth, reel and lantern progress.
export const SHOP_SECRETS=Object.freeze([
 {id:'folded-chart',title:'THE FOLDED CHART',item:'map',
  hint:"Found this tucked behind an old reel. Someone marked a route below the shelf.",
  story:"The ink ends at a place marked with one word: LISTEN.",
  unlock:p=>p.line>=2||p.deepest>=260},
 {id:'whispering-tooth',title:'THE GLASS TOOTH',item:'tooth',
  hint:"That tooth weren't on the counter yesterday. Don't ask me how.",
  story:"Skipper swears it belonged to something bigger than the boat.",
  unlock:p=>p.deepest>=640||p.light>=2},
 {id:'sealed-crate',title:'THE SALTWATER CRATE',item:'crate',
  hint:"A crate washed in. No name, no return address. Just yer boat's mark.",
  story:"A shipping label inside says DELIVER BEFORE THE NEXT TIDE.",
  unlock:p=>p.line>=6||p.chapter>=3},
 {id:'blackglass-token',title:'BLACKGLASS TOKEN',item:'token',
  hint:"Found this by the door after your last deep run. Still warm.",
  story:"Both sides bear the same symbol. Skipper suddenly stops joking.",
  unlock:p=>p.deepest>=3850||p.line>=11}
]);
export function shopSecretProgress(save={}){
 const u=save.upgrades||{},exp=save.expedition||{};
 const n=x=>Math.max(0,Number(x)||0);
 return {line:n(u.line),light:n(u.light),deepest:n(exp.deepest),chapter:n(exp.chapter)};
}
export function unlockedShopSecrets(save={}){
 const p=shopSecretProgress(save);return SHOP_SECRETS.filter(s=>s.unlock(p));
}
export function nextShopSecret(save={},seen=[]){
 const list=Array.isArray(seen)?seen:[];
 return unlockedShopSecrets(save).find(s=>!list.includes(s.id))||null;
}
