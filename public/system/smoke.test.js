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
const app=["core.js","sim.js","chart.js","ui.js"].map(f=>fs.readFileSync(f,"utf8")).join("\n;\n");
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
})();`;
eval(app+test);
