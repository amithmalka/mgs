/* ───────── MGS · ליבת החישוב ─────────
   כל כלל כאן זהה למנוע הסימולציה שאומת מול מימוש פייתון. */
const K=["BTC","SEM","TEC"];
const NM={BTC:"ביטקוין",SEM:"שבבים",TEC:"טכנולוגיה"};
/* הניירות לפי בורסה · cur = המטבע שבו הנייר נסחר · ref = שער מאומת להשוואה, אם קיים */
const INST={
 BTC:{fx:{t:"CBTC",n:"21Shares Bitcoin Core ETP",id:"CH1199067674",fee:0.10,cur:"CHF",
          mkt:"SIX שווייץ",ref:"16.4380 פרנק ב-21.10.2026"},
      il:{t:"1217835",n:"תכלית סל · CME CF Bitcoin Reference Rate",id:"1217835",fee:0.20,cur:"ILS",
          mkt:"תל אביב",ref:null}},
 SEM:{fx:{t:"SMH",n:"VanEck Semiconductor UCITS",id:"IE00BMC38736",fee:0.35,cur:"USD",
          mkt:"לונדון · אינה נסחרת בת״א",ref:null}},
 TEC:{fx:{t:"XLKS",n:"Invesco Technology S&P US Select Sector",id:"IE00B3VSSL01",fee:0.14,cur:"USD",
          mkt:"לונדון",ref:null},
      il:{t:"1185180",n:"Invesco Technology · נסחרת בתל אביב",id:"IE00B3VSSL01",fee:0.14,cur:"ILS",
          mkt:"תל אביב",ref:"כ-3,274₪ ב-23.10.2026 · מקור משני"}}};
INST.SEM.il={t:"1174119",n:"קסם ETF · MVIS US Listed Semiconductor 25",id:"1174119",fee:0.45,cur:"ILS",
             mkt:"תל אביב · אותו מדד של SMH",ref:null};
const MKT={fx:{nm:"חו״ל",d:"קרנות איריות ו-ETP שווייצרי, דרך ברוקר עם גישה לבורסות אירופה"},
           il:{nm:"תל אביב",d:"הכל נסחר בשקלים בבורסה בתל אביב, בלי המרת מט״ח"}};
const TRACKS={
 flow  :{nm:"תזרים בלבד", down:0.10, startDep:5, wd:"flow",
         d:"ההפקדה יורדת 10% מסכום הבסיס בכל שנה מ-שנה 5 · המשיכה מתחילה בשנה 2"},
 both  :{nm:"תזרים וצמיחה", down:0.05, startDep:5, wd:"both",
         d:"ההפקדה יורדת 5% מסכום הבסיס בכל שנה מ-שנה 5 · המשיכה מתחילה בשנה 5"},
 growth:{nm:"צמיחה בלבד", down:0.10, startDep:null, wd:"growth",
         d:"ההפקדה נשארת בשיאה עד שנת המעבר ואז יורדת 10% · המשיכה מתחילה בשנת המעבר"}};
const AGE={"20-30":20,"30-40":20,"40-50":15,"50-60":10,"60-70":5};
const TAX=0.25, CPI=0.02, UPCAP=10;

/* שיעור המשיכה השנתי לפי מסלול ושנה */
function wrate(track,age,year){
  if(track==="growth"){const st=AGE[age]||20; return year<st?0:0.04;}
  if(track==="flow"){const r=[0,.01,.01,.01,.01,.02,.03,.04]; return r[Math.min(year-1,7)];}
  const r=[0,0,0,0,.01,.01,.01,.01,.01,.01,.04]; return r[Math.min(year-1,10)];
}
/* ההפקדה החודשית בשנה נתונה */
function depFor(track,age,year,base,g){
  const T=TRACKS[track];
  const st=T.startDep===null?(AGE[age]||20):T.startDep;
  if(year<=Math.min(5,st)) return base*Math.pow(1+g,Math.min(year,5)-1);
  if(year<=st) return base*Math.pow(1+g,4);
  return Math.max(0, base*Math.pow(1+g,Math.min(st,5)-1) - base*T.down*(year-st));
}
/* חלוקת ההפקדה לפי אחוזי ירידה מהשיא */
function split(amount,px,peak){
  const f={},drop={}; let s=0,mx=K[0],mv=-1;
  for(const t of K){
    const pk=peak[t]||px[t];
    const x=(px[t]/pk-1)*100;
    f[t]=(x>=0?Math.min(x,UPCAP):-x)/100;
    drop[t]=Math.max(0,-x); s+=f[t];
    if(drop[t]>mv){mv=drop[t];mx=t;}
  }
  const al={},pct={};
  if(s>=1){for(const t of K) al[t]=amount*f[t]/s;}
  else {for(const t of K) al[t]=amount*f[t]; al[mx]+=amount*(1-s);}
  for(const t of K) pct[t]=amount>0?al[t]/amount*100:0;
  return {al,pct,drop,sum:s*100,overflowTo:s<1?mx:null,overflow:s<1?amount*(1-s):0};
}
/* מדד המחירים מתאריך הבסיס — להצמדת העלות לצורך מס ריאלי */
function idxAt(dateStr,baseStr){
  const d=(new Date(dateStr)-new Date(baseStr))/86400000/365.25;
  return Math.pow(1+CPI,Math.max(0,d));
}
/* מצב התיק מתוך רשימת התנועות */
function positions(txs,px){
  const P={}; for(const t of K) P[t]={units:0,cost:0,costIdx:0};
  for(const x of txs){
    for(const t of K){
      const l=x.lines&&x.lines[t]; if(!l) continue;
      if(x.kind==="deposit"){
        P[t].units+=l.units; P[t].cost+=l.amount; P[t].costIdx+=l.amount/(l.idx||1);
      } else {
        const fr=P[t].units>0?Math.min(1,l.units/P[t].units):0;
        P[t].units-=l.units; P[t].cost*=(1-fr); P[t].costIdx*=(1-fr);
      }
      if(P[t].units<1e-9){P[t].units=0;P[t].cost=0;P[t].costIdx=0;}
    }
  }
  let total=0;
  for(const t of K){
    P[t].avg = P[t].units>0?P[t].cost/P[t].units:0;
    P[t].value = P[t].units*(px[t]||0);
    P[t].pl = P[t].value-P[t].cost;
    P[t].above = P[t].units>0 && (px[t]||0)>P[t].avg;
    total+=P[t].value;
  }
  return {P,total};
}
/* חישוב המשיכה החודשית */
function withdrawal(track,age,year,txs,px,dateStr,baseStr){
  const {P,total}=positions(txs,px);
  const rate=wrate(track,age,year);
  const gross=total*rate/12;
  const idx=idxAt(dateStr,baseStr);
  const elig=K.filter(t=>P[t].above);
  if(rate<=0) return {rate,gross:0,blocked:"rate",lines:{},net:0,tax:0,total};
  if(total<=0) return {rate,gross:0,blocked:"empty",lines:{},net:0,tax:0,total};
  if(!elig.length) return {rate,gross,blocked:"below",lines:{},net:0,tax:0,total,P};
  const pv=elig.reduce((a,t)=>a+P[t].value,0);
  const lines={}; let net=0,tax=0;
  for(const t of elig){
    const take=gross*P[t].value/pv;
    const fr=Math.min(0.999,take/P[t].value);
    const units=P[t].units*fr;
    const idxCost=fr*idx*P[t].costIdx;
    const nomCost=fr*P[t].cost;
    const realGain=Math.max(0,take-idxCost);
    const tx=realGain*TAX;
    lines[t]={units,amount:take,price:px[t],idxCost,nomCost,realGain,tax:tx,net:take-tx};
    net+=take-tx; tax+=tx;
  }
  return {rate,gross,lines,net,tax,total,P,idx};
}
