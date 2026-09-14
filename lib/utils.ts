export const pairs=['XAUUSD','US100','EURUSD','GBPUSD','USDJPY','AUDJPY','AUDUSD']
export const periods=['Before Work','After Work','Evening','Night','Day Off','Weekend']
export const timeframes=['M1','M5','M15','M30','H1','H4','D1']
export const weights={valid_zone:15,liquidity_marked:10,liquidity_swept:20,fvg_present:15,fvg_mitigated:10,candle_confirmation:20,followed_plan:10} as const
export function scoreFrom(form:FormData, includePlan=true){let s=0; Object.entries(weights).forEach(([k,v])=>{if((includePlan||k!=='followed_plan')&&form.get(k)==='on')s+=v}); return includePlan?s:Math.round(s/90*100)}
export function grade(score:number){return score>=90?'A+':score>=80?'A':score>=70?'B':score>=60?'C':'Needs Review'}
export function money(n:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n||0)}
export function pct(n:number){return `${(n||0).toFixed(1)}%`}
export function plannedRR(entry:number|null,sl:number|null,tp:number|null){if(entry==null||sl==null||tp==null)return null;const risk=Math.abs(entry-sl);return risk?Math.abs(tp-entry)/risk:null}
