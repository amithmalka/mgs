const fs=require("fs");
const els={};
function mk(id){return els[id]||(els[id]={id,value:"",textContent:"",_html:"",hidden:false,
  className:"",dataset:{},
  set innerHTML(v){this._html=String(v);},get innerHTML(){return this._html;},
  querySelectorAll(){return [];},querySelector(){return mk("x");},appendChild(){},setAttribute(){},addEventListener(){},remove(){},
  classList:{toggle(){},contains(){return false;},add(){},remove(){}},
  get firstElementChild(){return null;},clientWidth:900,getContext(){return ctx;},style:{}});}
const ctx=new Proxy({},{get:(t,k)=>k==="canvas"?{}:(()=>{})});
global.document={getElementById:mk,querySelectorAll:()=>[],createElement:()=>mk("t"),fonts:{ready:Promise.resolve()}};
global.window={claude:undefined,devicePixelRatio:1,scrollTo(){},addEventListener(){},matchMedia:()=>({matches:false})};
global.addEventListener=()=>{}; global.location={hash:"#home"};
global.localStorage={_d:{},getItem(k){return this._d[k]??null;},setItem(k,v){this._d[k]=v;}};
global.performance={now:()=>0}; global.setTimeout=f=>f();
/* שרת מדומה: מחזיר בדיוק את הצורה שהנקודות האמיתיות מחזירות,
   כדי שנתיב ההצלחה של השליפה ייבדק ולא רק נתיב הכשל. */
let FETCHED=[];
global.fetch=async(url)=>{
  FETCHED.push(String(url));
  const tase=String(url).indexOf("/api/tase")===0;
  const body=tase
    ? {prices:{"1217835":{price:33.06,date:"2026-10-23",source:"tase"},
               "1174119":{price:653.80,date:"2026-10-23",source:"tase"},
               "1159193":{price:158.30,date:"2026-10-23",source:"tase"}}}
    : {prices:{"BTC/USD":{price:79724.98,candles:[{t:"2026-10-26",c:79724.98}]},
               "SMH":{price:527.20,candles:[{t:"2026-10-23",c:527.20}]},
               "XLK":{price:183.23,candles:[{t:"2026-10-23",c:183.23}]}}};
  return {ok:true,status:200,text:async()=>JSON.stringify(body)};
};
const app=["core.js","feed.js","sim.js","chart.js","ui.js"].map(f=>fs.readFileSync(f,"utf8")).join("\n;\n");
const test=`
;(function(){
const pages=["home","track","setup","rates","deposit","withdraw","portfolio","history","returns","scen"];
let bad=0;
for(const p of pages){try{go(p);}catch(e){console.log("✗ "+p+" (ריק): "+e.message);bad++;}}
if(!bad) console.log("✓ עשרה מסכים · בלי מסלול ובלי שער");
PROF.trackIdx=1; PROF.base=4000; PROF.g=7; PROF.startN=20260101;
PX.fx={dateN:20261023,BTC:81754.90,SEM:523.35,TEC:182.34};
PK.fx={BTC:124752.53,SEM:668.91,TEC:202.00};
const sp=split(4000,PX.fx,PK.fx), lines={};
for(const t of K) lines[t]={units:sp.al[t]/PX.fx[t],amount:sp.al[t],price:PX.fx[t],curIdx:1,idx:1,drop:sp.drop[t]};
for(const d of [20260101,20260201,20260301])
  LEDGER.txs.push({seq:LEDGER.txs.length+1,kindIdx:0,mktIdx:0,dateN:d,priceDateN:d,
    amount:4000,year:1,rate:0,tax:0,net:0,trackIdx:1,lines});
bad=0;
for(const p of pages){try{go(p);}catch(e){console.log("✗ "+p+" (עם נתונים): "+e.message);bad++;}}
if(!bad) console.log("✓ עשרה מסכים · עם מסלול, שער ושלוש תנועות");
console.log("  חלוקה: "+K.map(t=>NM[t]+" "+sp.pct[t].toFixed(1)+"%").join(" · "));
const pos=positions(mineTx(),PX.fx);
console.log("  התיק: "+Math.round(pos.total)+"₪ · מעל הממוצע: "+K.filter(t=>pos.P[t].above).length+"/3");
try{ PROF.mktIdx=1; go("deposit"); go("portfolio"); console.log("✓ מעבר לת״א בלי שער — בלי קריסה"); }
catch(e){ console.log("✗ מעבר בורסה: "+e.message); }
try{ PROF.mktIdx=0; PROF.trackIdx=2; PROF.ageIdx=4; go("withdraw"); go("deposit");
     console.log("✓ מסלול צמיחה · גיל 60-70"); }catch(e){ console.log("✗ צמיחה: "+e.message); }
try{ const bad2=cleanProf({track:"<img src=x onerror=alert(1)>",age:"__proto__",base:"4000",
       day:"99",g:"7",start:"<script>",mkt:"__proto__"});
     console.log("✓ קלט זדוני עוקר: trackIdx="+bad2.trackIdx+" ageIdx="+bad2.ageIdx+
       " mktIdx="+bad2.mktIdx+" day="+bad2.day+" startN="+bad2.startN);
}catch(e){ console.log("✗ אימות: "+e.message); }

/* ── השליפה ── */
(async()=>{
  try{
    await PULLQ;            // השליפה שה-boot התחיל
    PROF.mktIdx=1; FEEDMSG=null; PX.il=BLANK();
    await pullRates(false);
    const okIl = PX.il.dateN===20261023 && PX.il.BTC===33.06 && PX.il.TEC===158.30;
    console.log((okIl?"✓":"✗")+" שליפת ת״א: "+K.map(t=>NM[t]+" "+PX.il[t]).join(" · ")
      +" · תאריך "+dStr(PX.il.dateN)+" · exact="+(FEEDMSG&&FEEDMSG.exact));
    const peaked = K.every(t=>PK.il[t]>=PX.il[t]);
    console.log((peaked?"✓":"✗")+" השיא עלה עם השליפה");

    PROF.mktIdx=0; FEEDMSG=null; PX.fx=BLANK();
    await pullRates(false);
    const okFx = PX.fx.BTC===79724.98 && PX.fx.dateN===20261023;
    console.log((okFx?"✓":"✗")+" שליפת חו״ל: תאריך "+dStr(PX.fx.dateN)
      +" (הישן מבין הרכיבים) · exact="+(FEEDMSG&&FEEDMSG.exact));
    if(FEEDMSG&&FEEDMSG.exact!==false) console.log("✗ חו״ל סומן כמדויק והוא לא");

    global.fetch=async()=>({ok:false,status:500,text:async()=>'{"error":"boom"}'});
    FEEDMSG=null; const keep={...PX.fx};
    await pullRates(false);
    const held = PX.fx.BTC===keep.BTC && FEEDMSG && FEEDMSG.ok===false;
    console.log((held?"✓":"✗")+" כשל בשליפה לא מוחק את השער הקיים");

    bad=0;
    for(const p of pages){try{go(p);}catch(e){console.log("✗ "+p+" (אחרי שליפה): "+e.message);bad++;}}
    if(!bad) console.log("✓ עשרה מסכים · אחרי שליפה וכשל");
  }catch(e){ console.log("✗ שליפה: "+e.message); }
})();
})();`;
eval(app+test);
