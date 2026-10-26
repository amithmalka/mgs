/* ───────── MGS · ממשק ושמירה ─────────
   שערים נפרדים לכל בורסה: הניירות שונים ונסחרים במטבע אחר,
   ולכן שער של נייר אחד אינו תקף לאחר. אין שערי פתיחה מומצאים. */
let DB=null, USER=null, CANW=true, MODE="local";
let PROF=null, LEDGER={txs:[]};
const BLANK=()=>({date:null,BTC:null,SEM:null,TEC:null});
let PX={fx:BLANK(),il:BLANK()}, PK={fx:{},il:{}};
const P=()=>PX[pMkt()], KP=()=>PK[pMkt()];
const ready=m=>{const p=PX[MKT_KEYS[idxOf(MKT_KEYS,m,PROF?PROF.mktIdx:0)]||pMkt()];return !!p&&K.every(t=>p[t]>0);};
const f0=n=>Math.round(n||0).toLocaleString("en-US");
const f2=n=>(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const f5=n=>(n||0).toLocaleString("en-US",{minimumFractionDigits:5,maximumFractionDigits:5});
const today=()=>dStr(todayN());
const he=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const DEF_PROF=()=>({trackIdx:-1,ageIdx:1,base:4000,day:1,g:7,startN:todayN(),mktIdx:0});
const CUR={ILS:"₪",USD:"$",CHF:"CHF"};
const LS={get(k){try{const v=localStorage.getItem("mgs2_"+k);return v?JSON.parse(v):null;}catch(e){return null;}},
          set(k,v){try{localStorage.setItem("mgs2_"+k,JSON.stringify(v));return true;}catch(e){return false;}}};


/* ───────── אימות בגבול הקלט ─────────
   הכלל כאן מוחלט: *שום מחרוזת מהאחסון לא נשמרת ולא מוצגת*.
   תאריכים, קבוצות גיל, מסלולים, בורסות ומספרי אישור נשמרים כ**מספרים**,
   והמחרוזת לתצוגה נבנית בקוד מתוך מספרים ומתוך רשימות מקומיות.
   לכן גם אם ערך זדוני נכתב לאחסון, מה שזורם ל-innerHTML נוצר כאן. */
const TRACK_KEYS=Object.freeze(["flow","both","growth"]);
const AGE_KEYS=Object.freeze(["20-30","30-40","40-50","50-60","60-70"]);
const MKT_KEYS=Object.freeze(["fx","il"]);
const CUR_KEYS=Object.freeze(["ILS","USD","CHF"]);
const KIND_KEYS=Object.freeze(["deposit","withdraw"]);
/* אינדקס מאומת בלבד — לא הערך שהגיע מהאחסון */
function idxOf(list,v,def){
  if(typeof v!=="string") return def;
  for(let i=0;i<list.length;i++) if(list[i]===v) return i;
  return def;
}
const okNum=(v,min,max,def)=>{const n=+v;return Number.isFinite(n)&&n>=min&&n<=max?n:def;};
const pad2=n=>(n<10?"0":"")+n;
/* תאריך כמספר yyyymmdd · והמחרוזת נבנית מחשבון, לא מהקלט */
function dNum(v,def){
  if(typeof v==="number") v=String(v|0);
  if(typeof v!=="string") return def;
  const m=/^(\d{4})-?(\d{2})-?(\d{2})$/.exec(v);
  if(!m) return def;
  const y=+m[1],mo=+m[2],d=+m[3];
  if(!(y>=1970&&y<=2200&&mo>=1&&mo<=12&&d>=1&&d<=31)) return def;
  return y*10000+mo*100+d;
}
const dStr=n=>{const y=Math.floor(n/10000),m=Math.floor(n/100)%100,d=n%100;
  return y+"-"+pad2(m)+"-"+pad2(d);};
const dJs=n=>new Date(dStr(n));
const todayN=()=>dNum(new Date().toISOString().slice(0,10),20260101);
const daysBetween=(a,b)=>Math.floor((dJs(a)-dJs(b))/86400000);
/* מספר אישור נבנה מאות קבועה ומשני מספרים */
const idStr=(kindIdx,dateN,seq)=>(kindIdx===1?"W":"D")+String(dateN)+"-"+String(seq);

function cleanProf(o){
  if(!o||typeof o!=="object") return null;
  const base=okNum(o.base,0,1e9,null); if(base===null) return null;
  return {trackIdx:idxOf(TRACK_KEYS,o.track,-1), ageIdx:idxOf(AGE_KEYS,o.age,1),
          base, day:okNum(o.day,1,28,1), g:okNum(o.g,0,50,0),
          startN:dNum(o.startN!=null?o.startN:o.start,todayN()),
          mktIdx:idxOf(MKT_KEYS,o.mkt,0)};
}
function cleanPrices(o){
  if(!o||typeof o!=="object") return null;
  const d=dNum(o.dateN!=null?o.dateN:o.date,null); if(!d) return null;
  const r={dateN:d};
  for(const t of K){const v=okNum(o[t],0,1e12,null); if(v===null||v<=0) return null; r[t]=v;}
  return r;
}
function cleanPeaks(o){
  const r={};
  if(o&&typeof o==="object") for(const t of K){const v=okNum(o[t],0,1e12,0); if(v>0) r[t]=v;}
  return r;
}
function cleanLines(o){
  const r={};
  if(!o||typeof o!=="object") return r;
  for(const t of K){
    const l=o[t]; if(!l||typeof l!=="object") continue;
    const un=okNum(l.units,0,1e15,null), am=okNum(l.amount,0,1e12,null), pr=okNum(l.price,0,1e12,null);
    if(un===null||am===null||pr===null) continue;
    r[t]={units:un,amount:am,price:pr,curIdx:idxOf(CUR_KEYS,l.cur!=null?l.cur:CUR_KEYS[l.curIdx|0],0),
          idx:okNum(l.idx,0,100,1),drop:okNum(l.drop,0,100,0),
          tax:okNum(l.tax,0,1e12,0),net:okNum(l.net,0,1e12,0),
          realGain:okNum(l.realGain,0,1e12,0)};
  }
  return r;
}
function cleanLedger(o){
  const out={txs:[]};
  if(!o||!Array.isArray(o.txs)) return out;
  let n=0;
  for(const x of o.txs.slice(0,5000)){
    if(!x||typeof x!=="object") continue;
    const kindIdx=idxOf(KIND_KEYS,KIND_KEYS[x.kindIdx],-1); if(kindIdx<0) continue;
    const dateN=dNum(x.dateN!=null?x.dateN:dStr(x.dateN),null); if(!dateN) continue;
    const amount=okNum(x.amount,0,1e12,null); if(amount===null) continue;
    out.txs.push({seq:okNum(x.seq,0,1e6,++n), kindIdx, mktIdx:idxOf(MKT_KEYS,MKT_KEYS[x.mktIdx],0), dateN,
      priceDateN:dNum(x.priceDateN!=null?x.priceDateN:dStr(x.priceDateN),dateN), amount,
      year:okNum(x.year,1,200,1), rate:okNum(x.rate,0,1,0),
      tax:okNum(x.tax,0,1e12,0), net:okNum(x.net,0,1e12,0),
      trackIdx:idxOf(TRACK_KEYS,x.track,-1), lines:cleanLines(x.lines)});
  }
  return out;
}
/* קיצורי קריאה — כולם מחזירים מחרוזות מקומיות */
const pTrack=()=>TRACK_KEYS[PROF.trackIdx]||null;
const pAge=()=>AGE_KEYS[PROF.ageIdx]||AGE_KEYS[1];
const pMkt=()=>MKT_KEYS[PROF.mktIdx]||"fx";
const pStart=()=>dStr(PROF.startN);

/* ── ניווט ── */
function go(p){
  document.querySelectorAll(".pg").forEach(e=>e.classList.toggle("on",e.id==="p-"+p));
  document.querySelectorAll(".nav a").forEach(a=>a.classList.toggle("on",a.dataset.p===p));
  window.scrollTo(0,0); render(p);
}
const route=()=>go((location.hash||"#home").slice(1));
addEventListener("hashchange",route);
const yearNo=()=>Math.max(1,Math.floor((new Date(today())-new Date(pStart()))/86400000/365.25)+1);
const staleDays=()=>dStr(P().dateN)?Math.floor((new Date(today())-new Date(dStr(P().dateN)))/86400000):null;

/* ── התראות ── */
function toast(cls,title,body,link){
  const d=document.createElement("div"); d.className="toast "+cls;
  d.innerHTML=`<b>${he(title)}</b><span>${body}</span>`+
    (link?`<a href="#${link[1]}">${he(link[0])}</a>`:"")+`<button class="x">סגור</button>`;
  d.querySelector(".x").onclick=()=>d.remove();
  document.getElementById("toasts").appendChild(d);
}
function notices(){
  document.getElementById("toasts").innerHTML="";
  if(MODE==="local") toast("c","נשמר במחשב הזה",
    "אין חיבור לחשבון — האישורים נשמרים בדפדפן הזה בלבד ולא יופיעו במחשב אחר.");
  if(!pTrack()){toast("c","בחרו מסלול להתחיל",
    "המערכת צריכה לדעת איזה כלל הפקדה ומשיכה להפעיל.",["אל המסלול","track"]); return;}
  if(!ready()){toast("r","אין שער ל"+MKT[pMkt()].nm,
    "בלי שער לשלושת הניירות אי אפשר להנפיק אישור. <b>הניירות בכל בורסה שונים</b> — שער של אחת אינו תקף לאחרת.",
    ["הזינו שער","rates"]); return;}
  const sd=staleDays();
  if(sd>=3) toast("r","השער לא עודכן "+sd+" ימים",
    "כל אישור נבנה מהשער שבמערכת, והשיא נקבע ממנו.",["עדכנו שער","rates"]);
  const now=new Date(), dd=now.getDate(), ym=today().slice(0,7);
  const mine=LEDGER.txs.filter(x=>MKT_KEYS[x.mktIdx]===pMkt());
  if(!mine.some(x=>KIND_KEYS[x.kindIdx]==="deposit"&&dStr(x.dateN).slice(0,7)===ym) && dd>=PROF.day)
    toast("a","יום ההפקדה הגיע","היום "+dd+" בחודש, וההפקדה ב-"+PROF.day+". טרם הונפק אישור לחודש הזה.",
      ["הנפיקו אישור","deposit"]);
  const y=yearNo(), r=wrate(pTrack(),pAge(),y);
  if(r>0 && mine.length && !mine.some(x=>KIND_KEYS[x.kindIdx]==="withdraw"&&dStr(x.dateN).slice(0,7)===ym)){
    const w=withdrawal(pTrack(),pAge(),y,mine,P(),today(),pStart());
    if(w.blocked==="below") toast("r","אין משיכה החודש",
      "כל שלושת הניירות מתחת לעלות הקנייה הממוצעת. הכלל חוסם — וזה בכוונה.");
    else if(w.net>0) toast("g","המשיכה לחודש הזה מוכנה",
      f0(w.net)+"₪ נטו · שיעור "+(r*100).toFixed(0)+"% שנתי ÷ 12.",["לאישור המשיכה","withdraw"]);
  }
}

/* ── טעינה ושמירה ── */
async function boot(){
  try{
    if(window.claude&&typeof window.claude.use==="function"){
      USER=await window.claude.use("user").catch(()=>null);
      DB=await window.claude.use("db").catch(()=>null);
    }
  }catch(e){}
  MODE=DB?"cloud":"local";
  if(DB){
    try{
      const [pf,lg,pfx,pil,kfx,kil]=await Promise.all([
        DB.collection("data/users/me").doc("profile").get().catch(()=>null),
        DB.collection("data/users/me").doc("ledger").get().catch(()=>null),
        DB.doc("prices/fx").get().catch(()=>null), DB.doc("prices/il").get().catch(()=>null),
        DB.doc("peaks/fx").get().catch(()=>null), DB.doc("peaks/il").get().catch(()=>null)]);
      const cp=cleanProf(pf); if(cp) PROF=cp;
      const cl=cleanLedger(lg); if(cl.txs.length) LEDGER=cl;
      const a=cleanPrices(pfx); if(a) PX.fx=a;
      const b=cleanPrices(pil); if(b) PX.il=b;
      PK.fx=cleanPeaks(kfx); PK.il=cleanPeaks(kil);
      if(USER&&USER.can("data.write")===false) CANW=false;
    }catch(e){}
  }
  if(!PROF){const v=cleanProf(LS.get("prof")); if(v) PROF=v;}
  if(!LEDGER.txs.length){const v=cleanLedger(LS.get("ledger")); if(v.txs.length) LEDGER=v;}
  for(const m of ["fx","il"]){
    if(!PX[m].dateN){const v=cleanPrices(LS.get("px_"+m)); if(v) PX[m]=v;}
    if(!Object.keys(PK[m]).length) PK[m]=cleanPeaks(LS.get("pk_"+m));
  }
  PROF=PROF||DEF_PROF();
  document.getElementById("who").textContent =
    (MODE==="cloud"?(CANW?"נשמר בחשבון":"קריאה בלבד"):"נשמר במחשב הזה");
  fillForms(); route(); notices();
  // המשיכה האוטומטית — אחרי שהמסך כבר מצויר, כדי שהדף לא יחכה לרשת
  pullRates(true);
}
async function save(what){
  const m=pMkt();
  let ok=true;
  if(what==="prices"){ok=LS.set("px_"+m,PX[m])&&LS.set("pk_"+m,PK[m]);}
  else ok=LS.set(what,what==="prof"?PROF:LEDGER);
  if(!DB||!CANW) return ok;
  try{
    if(what==="prof") await DB.collection("data/users/me").doc("profile").set(PROF);
    if(what==="ledger") await DB.collection("data/users/me").doc("ledger").set(LEDGER);
    if(what==="prices"){await DB.doc("prices/"+m).set(PX[m]); await DB.doc("peaks/"+m).set(PK[m]);}
    return true;
  }catch(e){return ok;}
}
/* ───────── שליפת שערים ─────────
   הכל כאן textContent ולא innerHTML: הטקסט שמגיע מהרשת לא נכנס ל-DOM
   כ-HTML בשום מצב. */
let FEEDMSG=null, PULLING=false;
function renderFeedNote(){
  const el=document.getElementById("feedNote"); if(!el) return;
  if(PULLING){el.textContent="מושך שערים מהשוק…"; el.className="fnote"; return;}
  if(!FEEDMSG){el.textContent=""; el.className="fnote"; return;}
  if(FEEDMSG.ok){
    el.textContent="שער סגירה "+dStr(FEEDMSG.dateN)+" · "
      +(FEEDMSG.exact?"שער הנייר עצמו, כפי שהבורסה בתל אביב מדווחת אותו"
                     :"שער המדד שהנייר עוקב אחריו — ולא שער היחידה")
      +(FEEDMSG.saved?"":" · נשמר רק בדף הזה");
    el.className="fnote "+(FEEDMSG.exact?"good":"warn");
  }else{
    el.textContent="השליפה נכשלה: "+FEEDMSG.msg+" — אפשר להזין שער ידנית למטה.";
    el.className="fnote bad";
  }
}
/* שליפות מסתדרות בתור ולא נזרקות: החלפת בורסה בזמן שהשליפה באוויר
   חייבת להסתיים בשער של הבורסה שנבחרה, ולא בשתיקה. */
let PULLQ=Promise.resolve();
function pullRates(auto){
  PULLQ=PULLQ.then(()=>doPull(auto),()=>doPull(auto));
  return PULLQ;
}
async function doPull(auto){
  const mk=pMkt();
  PULLING=true; renderFeedNote();
  const btn=document.getElementById("pullRates");
  if(btn) btn.disabled=true;
  try{
    const r=await fetchRates(mk);
    const np={dateN:r.dateN||todayN()};
    for(const t of K) np[t]=r[t];
    const cl=cleanPrices(np);
    if(!cl) throw new Error("השערים שחזרו לא עברו אימות");
    PX[mk]=cl;
    for(const t of K) PK[mk][t]=Math.max(PK[mk][t]||0,cl[t]);
    const ok=await save("prices");
    FEEDMSG={ok:true,exact:!!r.exact,dateN:cl.dateN,saved:ok};
    PULLING=false; renderFeedNote();
    fillRates(); route(); notices();
    if(!auto) say("mRates","נשלפו שערי "+MKT[mk].nm,false);
  }catch(e){
    FEEDMSG={ok:false,msg:String((e&&e.message)||e)};
    PULLING=false; renderFeedNote();
    if(!auto) say("mRates","השליפה נכשלה",true);
  }finally{
    PULLING=false;
    if(btn) btn.disabled=false;
  }
}
function say(id,txt,bad){const e=document.getElementById(id); if(!e)return;
  e.textContent=txt; e.className="msg"+(bad?" e":""); setTimeout(()=>{e.textContent="";},4500);}

/* ── טפסים ── */
function seg(id,val,onPick){
  const el=document.getElementById(id); if(!el) return;
  [...el.querySelectorAll("button")].forEach(b=>{
    b.setAttribute("aria-pressed",b.dataset.v===String(val));
    b.onclick=()=>{[...el.querySelectorAll("button")].forEach(x=>x.setAttribute("aria-pressed",x===b));
      onPick&&onPick(b.dataset.v);};
  });
}
function fillForms(){
  document.getElementById("sD").value=PROF.base;
  document.getElementById("sDay").value=PROF.day;
  document.getElementById("sG").value=PROF.g;
  document.getElementById("sStart").value=pStart();
  document.getElementById("segAge").innerHTML=Object.keys(AGE)
    .map(a=>`<button data-v="${a}">${a} · שנה ${AGE[a]}</button>`).join("");
  seg("segAge",pAge(),v=>{PROF.ageIdx=idxOf(AGE_KEYS,v,1);});
  seg("segMkt",pMkt(),v=>{PROF.mktIdx=idxOf(MKT_KEYS,v,0); save("prof"); mktBar(); fillRates();
    route(); notices(); FEEDMSG=null; pullRates(true);});
  document.getElementById("picks").innerHTML=Object.entries(TRACKS).map(([k,v])=>
    `<button class="pick" data-v="${k}" aria-pressed="${pTrack()===k}">
      <b>${he(v.nm)}</b><span class="d">${he(v.d)}</span>
      <span class="tg">${k==="growth"?"לפי קבוצת גיל":"מתחיל בשנה "+(k==="flow"?2:5)}</span></button>`).join("");
  document.querySelectorAll("#picks .pick").forEach(b=>b.onclick=()=>{
    PROF.trackIdx=idxOf(TRACK_KEYS,b.dataset.v,-1);
    document.querySelectorAll("#picks .pick").forEach(x=>x.setAttribute("aria-pressed",x.dataset.v===pTrack()));
    document.getElementById("ageWrap").hidden=pTrack()!=="growth";});
  document.getElementById("ageWrap").hidden=pTrack()!=="growth";
  mktBar(); fillRates();
}
/* פס הבורסה — מופיע בכל עמוד */
function mktBar(){
  document.querySelectorAll(".mktbar").forEach(el=>{
    el.innerHTML=["fx","il"].map(m=>
      `<button data-v="${m}" aria-pressed="${pMkt()===m}">${MKT[m].nm}${ready(m)?"":" · ללא שער"}</button>`).join("")+
      `<span class="mkd">${he(MKT[pMkt()].d)}</span>`;
    [...el.querySelectorAll("button")].forEach(b=>b.onclick=()=>{
      PROF.mktIdx=idxOf(MKT_KEYS,b.dataset.v,0); save("prof"); mktBar(); fillRates();
      route(); notices(); FEEDMSG=null; pullRates(true);});
  });
}
function fillRates(){
  const p=P();
  document.getElementById("rDate").value=dStr(p.dateN)||today();
  for(const t of K) document.getElementById("r"+t).value=p[t]!=null?p[t]:"";
  document.getElementById("rateLbl").textContent=MKT[pMkt()].nm;
  renderFeedNote();
  for(const t of K){
    const i=INST[t][pMkt()];
    document.getElementById("rl"+t).innerHTML=
      `${he(i.t)} · ${he(i.n)}<br>${he(i.mkt)} · במטבע <b>${CUR[i.cur]||i.cur}</b>`+
      (i.ref?`<br><span style="color:var(--amb)">להשוואה: ${he(i.ref)}</span>`:
             `<br><span style="color:var(--dim)">אין לי שער מאומת לנייר הזה</span>`);
  }
}

/* ── רינדור ── */
function render(p){({home:rHome,rates:rRates,deposit:rDeposit,withdraw:rWithdraw,
  portfolio:rPortfolio,history:rHistory,returns:rReturns,scen:rScen}[p]||(()=>{}))();}
/* core.js מצפה ל-kind ו-date כמחרוזות — ממירים כאן, מתוך מספרים מאומתים */
const asCore=x=>({kind:KIND_KEYS[x.kindIdx],date:dStr(x.dateN),amount:x.amount,
  tax:x.tax,net:x.net,lines:x.lines});
const mineTx=()=>LEDGER.txs.filter(x=>MKT_KEYS[x.mktIdx]===pMkt()).map(asCore);
function needRates(msg){
  return `<div class="empty" style="border-color:var(--rd)"><b>אין שער ל${he(MKT[pMkt()].nm)}</b>
  ${he(msg)}<br><br><b style="font-size:14px;display:inline">הניירות בכל בורסה שונים</b> ונסחרים במטבע אחר —
  ‏<b style="display:inline">שער של בורסה אחת אינו תקף לאחרת</b>.
  <br><br><a href="#rates" style="color:var(--amb);font-weight:700">הזינו שער ל${he(MKT[pMkt()].nm)}</a></div>`;
}
function rHome(){
  const tx=mineTx(), pos=ready()?positions(tx,P()):null;
  const total=pos?pos.total:0;
  const dep=tx.filter(x=>KIND_KEYS[x.kindIdx]==="deposit").reduce((a,x)=>a+x.amount,0);
  const wd=tx.filter(x=>KIND_KEYS[x.kindIdx]==="withdraw").reduce((a,x)=>a+(x.net||0),0);
  const tax=tx.filter(x=>KIND_KEYS[x.kindIdx]==="withdraw").reduce((a,x)=>a+(x.tax||0),0);
  document.getElementById("homeState").innerHTML=`<div class="cards">
    <div class="card a"><span class="l">המסלול · ${he(MKT[pMkt()].nm)}</span>
      <span class="v" style="font-size:18px">${pTrack()?he(TRACKS[pTrack()].nm):"לא נבחר"}</span>
      <span class="n">${pTrack()?(pTrack()==="growth"?"גיל "+pAge()+" · שנת מעבר "+AGE[pAge()]:"שנה "+yearNo()+" בתוכנית"):"בחרו מסלול להתחיל"}</span></div>
    <div class="card"><span class="l">שווי התיק</span>
      <span class="v">${ready()?f0(total):"—"}</span>
      <span class="n">${tx.length} אישורים · ${ready()?"שער "+dStr(P().dateN):"אין שער"}</span></div>
    <div class="card c"><span class="l">הופקד</span><span class="v">${f0(dep)}</span>
      <span class="n">${ready()&&dep?(total+wd>=dep?"רווח ":"הפסד ")+f0(Math.abs(total+wd-dep))+" כולל משיכות":"—"}</span></div>
    <div class="card g"><span class="l">נמשך נטו</span><span class="v">${f0(wd)}</span>
      <span class="n">מס ששולם ${f0(tax)}₪</span></div></div>`;
  const st=[];
  if(!pTrack()) st.push(["בחרו מסלול","המערכת צריכה לדעת איזה כלל להפעיל","track"]);
  else if(!ready()) st.push(["הזינו שער ל"+MKT[pMkt()].nm,"בלי שער אי אפשר להנפיק אישור","rates"]);
  else{
    const sd=staleDays(); const ym=today().slice(0,7);
    if(sd>=3) st.push(["עדכנו את השער","עברו "+sd+" ימים מהשער האחרון","rates"]);
    if(!tx.some(x=>KIND_KEYS[x.kindIdx]==="deposit"&&dStr(x.dateN).slice(0,7)===ym))
      st.push(["הנפיקו אישור הפקדה","טרם הונפק אישור לחודש "+ym,"deposit"]);
    const r=wrate(pTrack(),pAge(),yearNo());
    if(r>0&&!tx.some(x=>KIND_KEYS[x.kindIdx]==="withdraw"&&dStr(x.dateN).slice(0,7)===ym))
      st.push(["בדקו את המשיכה","השיעור החודש "+(r*100).toFixed(0)+"% שנתי","withdraw"]);
    if(!st.length) st.push(["הכל מעודכן","אין פעולה פתוחה לחודש הזה","portfolio"]);
  }
  document.getElementById("homeNext").innerHTML=`<div class="picks">`+st.map(s=>
    `<a class="pick" href="#${s[2]}" style="text-decoration:none"><b>${he(s[0])}</b>
      <span class="d">${he(s[1])}</span></a>`).join("")+`</div>`;
}
function rRates(){
  mktBar();
  const el=document.getElementById("rateCards");
  if(!ready()){el.innerHTML=`<div class="empty"><b>טרם הוזן שער ל${he(MKT[pMkt()].nm)}</b>
    מלאו את שלושת השערים למטה. <b>אין שערי התחלה</b> — כי לכל בורסה ניירות אחרים
    במטבע אחר, ושער מומצא היה מייצר מספר יחידות שגוי.</div>`;return;}
  const p=P(), k=KP(), sp=split(PROF.base||4000,p,k);
  el.innerHTML=K.map(t=>{const i=INST[t][pMkt()];
    return `<div class="card ${sp.drop[t]>20?"r":sp.drop[t]>5?"a":""}">
      <span class="l">${he(NM[t])} · ${he(i.t)}</span>
      <span class="v">${f2(p[t])}<span style="font-size:13px;color:var(--dim)"> ${he(CUR[i.cur]||i.cur)}</span></span>
      <span class="n">שיא ${f2(k[t]||p[t])} · <b class="${sp.drop[t]>0?"rd":"gn"}">${sp.drop[t]>0?"−"+sp.drop[t].toFixed(1)+"%":"בשיא"}</b> מהשיא
      <br>מקבל <b class="amb">${sp.pct[t].toFixed(1)}%</b> מההפקדה</span></div>`;}).join("")+
    `<div class="card c"><span class="l">סכום האחוזים</span><span class="v">${sp.sum.toFixed(0)}%</span>
      <span class="n">${sp.overflowTo?"העודף "+f0(sp.overflow)+"₪ → "+he(NM[sp.overflowTo]):"מנורמל — אין עודף"}</span></div>`;
}
function depRow(t,amount,price,units,pct,drop){
  const i=INST[t][pMkt()], c=CUR[i.cur]||i.cur;
  return `<div class="ln"><span class="k">${he(NM[t])}<span class="s">${he(i.t)} · ${he(i.id)}</span></span>
    <span class="n">${drop>0?"−"+drop.toFixed(1)+"%":"בשיא"}<span class="s">מהשיא</span></span>
    <span class="n">${f2(price)} ${he(c)}<span class="s">שער היחידה</span></span>
    <span class="n amb">${f0(amount)}₪<span class="s">${f5(units)} יחידות · ${pct.toFixed(1)}%</span></span></div>`;
}
function rDeposit(){
  const b=document.getElementById("depBody");
  if(!pTrack()){b.innerHTML=`<div class="empty"><b>אין מסלול</b>בחרו מסלול כדי שהמערכת תדע איך לחלק.</div>`;schedDep();return;}
  const y=yearNo(), amt=depFor(pTrack(),pAge(),y,PROF.base,PROF.g/100);
  const head=`<div class="mktbar"></div>`;
  if(amt<=0){b.innerHTML=head+`<div class="empty"><b>ההפקדות נגמרו</b>
    במסלול ${he(TRACKS[pTrack()].nm)}, בשנה ${y}, ההפקדה המחושבת היא אפס.
    התיק ממשיך לשלם בלי שנכנס אליו עוד שקל.</div>`;mktBar();schedDep();return;}
  const p=P(), k=KP(), sd=staleDays();
  const fields=K.map(t=>{const i=INST[t][pMkt()];
    return `<div class="f"><label>${he(NM[t])} · ${he(i.t)}</label>
      <input type="number" id="d${t}" step="0.0001" min="0" value="${p[t]!=null?p[t]:""}">
      <span class="u">במטבע <b>${he(CUR[i.cur]||i.cur)}</b> · ${he(i.mkt)}</span></div>`;}).join("");
  const rates=`<h3 style="margin-top:0">שער היום · ${he(MKT[pMkt()].nm)}</h3>
    <p class="l">הזינו את שער הסגירה של היום — <b>האישור ייבנה ממנו</b>.
    ${dStr(p.dateN)?(sd>0?`השער שבמערכת הוא מ-<b>${he(dStr(p.dateN))}</b>, לפני ${sd} ימים.`:`השער שבמערכת הוא <b>מהיום</b>.`)
            :`<b>טרם הוזן שער לבורסה הזאת.</b>`}</p>
    <div class="form"><div class="f"><label>תאריך</label>
      <input type="date" id="dDate" value="${he(today())}"></div>${fields}</div>
    <div class="bar"><button class="btn sec" id="useRates">עדכן את השער וחשב מחדש</button>
      <span class="msg" id="mDR"></span></div>`;
  if(!ready()){b.innerHTML=head+rates+needRates("הזינו את שלושת השערים ולחצו ״עדכן״, והאישור ייבנה.");
    mktBar(); wireDepRates(); return;}
  const sp=split(amt,p,k), id="D"+today().replace(/-/g,"")+"-"+(LEDGER.txs.length+1);
  b.innerHTML=head+rates+`<div class="conf">
    <div class="hd"><b>אישור הפקדה · ${f0(amt)}₪</b>
      <span class="id">${he(id)} · ${he(MKT[pMkt()].nm)} · שער ${he(dStr(p.dateN))} · שנה ${y}</span></div>
    <div class="bd">
      <div class="ln h"><span>הנייר</span><span>מול השיא</span><span>השער</span><span>הסכום והיחידות</span></div>
      ${K.map(t=>depRow(t,sp.al[t],p[t],sp.al[t]/p[t],sp.pct[t],sp.drop[t])).join("")}
    </div><div class="tot"><span>סך ההפקדה</span><span class="n">${f0(amt)}₪</span></div></div>
  <div class="note a"><div class="b"></div><p><b>איך חולק.</b> סכום אחוזי הירידה הוא
  <b>${sp.sum.toFixed(1)}%</b>${sp.overflowTo?`, ולכן העודף — <b>${f0(sp.overflow)}₪</b> —
  הולך כולו ל<b>${he(NM[sp.overflowTo])}</b>, שנפל העמוק ביותר`:`, כלומר מעל 100%, ולכן הכל מנורמל פרופורציונלית ואין עודף`}.</p></div>
  <div class="bar"><button class="btn" id="okDep">אשרו את ההפקדה</button>
    <span class="msg" id="mDep"></span></div>`;
  mktBar(); wireDepRates(); schedDep();
  document.getElementById("okDep").onclick=async(e)=>{
    const lines={};
    for(const t of K) lines[t]={units:sp.al[t]/p[t],amount:sp.al[t],price:p[t],
      curIdx:idxOf(CUR_KEYS,INST[t][pMkt()].cur,0),idx:idxAt(today(),pStart()),drop:sp.drop[t]};
    LEDGER.txs.push({seq,kindIdx:0,mktIdx:PROF.mktIdx,dateN:todayN(),priceDateN:p.dateN,
      amount:amt,year:y,rate:0,tax:0,net:0,trackIdx:PROF.trackIdx,lines});
    e.target.disabled=true;
    const ok=await save("ledger");
    rDeposit(); notices(); say("mDep",ok?"אושר ונשמר · "+id:"אושר אך השמירה נכשלה",!ok);
  };
}
function wireDepRates(){
  const ur=document.getElementById("useRates"); if(!ur) return;
  ur.onclick=async()=>{
    const d=document.getElementById("dDate").value||today(), np={date:d};
    for(const t of K){const v=+document.getElementById("d"+t).value;
      if(!(v>0)){say("mDR","כל שלושת השערים חייבים להיות גדולים מאפס",true);return;} np[t]=v;}
    PX[pMkt()]=np;
    {const mk=pMkt();
    for(const t of K) PK[mk][t]=Math.max(PK[mk][t]||0,np[t]);}
    const ok=await save("prices");
    fillRates(); rDeposit(); notices();
    say("mDR",ok?"השער עודכן ל-"+d+" · החלוקה חושבה מחדש":"עודכן בדף, השמירה נכשלה",!ok);
  };
}
function rWithdraw(){
  const b=document.getElementById("wdBody"), head=`<div class="mktbar"></div>`;
  if(!pTrack()){b.innerHTML=`<div class="empty"><b>אין מסלול</b>בחרו מסלול.</div>`;schedWd();return;}
  if(!ready()){b.innerHTML=head+needRates("בלי שער אי אפשר לחשב שווי, עלות ממוצעת או מס.");mktBar();schedWd();return;}
  const tx=mineTx();
  if(!tx.length){b.innerHTML=head+`<div class="empty"><b>התיק ריק ב${he(MKT[pMkt()].nm)}</b>
    הנפיקו אישור הפקדה ראשון.</div>`;mktBar();schedWd();return;}
  const y=yearNo(), p=P();
  const w=withdrawal(pTrack(),pAge(),y,tx,p,today(),pStart());
  if(w.rate<=0){b.innerHTML=head+`<div class="empty"><b>אין משיכה בשנה ${y}</b>
    במסלול ${he(TRACKS[pTrack()].nm)} המשיכה מתחילה
    ${pTrack()==="flow"?"בשנה 2":pTrack()==="both"?"בשנה 5":"בשנה "+AGE[pAge()]}.
    עד אז כל שקל נשאר בתיק ומרכיב.</div>`;mktBar();schedWd();return;}
  if(w.blocked==="below"){
    b.innerHTML=head+`<div class="empty" style="border-color:var(--rd)"><b>לא מושכים החודש</b>
    כל שלושת הניירות <b>מתחת לעלות הקנייה הממוצעת</b> שלהם, והכלל חוסם משיכה.
    זה לא תקלה — זה מה שמונע מכירה בהפסד.</div>
    <div class="scroll"><table><thead><tr><th>הנייר</th><th>השער</th><th>עלות ממוצעת</th><th>פער</th></tr></thead>
    <tbody>${K.map(t=>`<tr><td style="font-weight:600">${he(NM[t])}</td>
      <td class="n">${f2(p[t])}</td><td class="n">${f2(w.P[t].avg)}</td>
      <td class="n rd">${w.P[t].avg?((p[t]/w.P[t].avg-1)*100).toFixed(1)+"%":"—"}</td></tr>`).join("")}
    </tbody></table></div>`;mktBar();schedWd();return;}
  const el=Object.keys(w.lines), seq=LEDGER.txs.length+1, id=idStr(1,todayN(),seq);
  const rg=Object.values(w.lines).reduce((a,l)=>a+l.realGain,0);
  b.innerHTML=head+`<div class="cards">
    <div class="card"><span class="l">שווי התיק</span><span class="v">${f0(w.total)}</span>
      <span class="n">${he(MKT[pMkt()].nm)} · שער ${he(dStr(p.dateN))}</span></div>
    <div class="card a"><span class="l">השיעור · שנה ${y}</span><span class="v">${(w.rate*100).toFixed(0)}%</span>
      <span class="n">שנתי ÷ 12 = ${(w.rate/12*100).toFixed(3)}% החודש</span></div>
    <div class="card c"><span class="l">ברוטו</span><span class="v">${f0(w.gross)}₪</span>
      <span class="n">מ-${el.length} מתוך 3 שמעל הממוצע</span></div>
    <div class="card r"><span class="l">מס · רווח ריאלי</span><span class="v">${f0(w.tax)}₪</span>
      <span class="n">25% · עלות מוצמדת ×${w.idx.toFixed(3)}</span></div>
    <div class="card g"><span class="l">נטו לחשבון</span><span class="v">${f0(w.net)}₪</span>
      <span class="n">אחרי מס</span></div></div>
  <div class="conf"><div class="hd"><b>אישור משיכה · ${f0(w.net)}₪ נטו</b>
    <span class="id">${he(id)} · ${he(MKT[pMkt()].nm)} · שער ${he(dStr(p.dateN))}</span></div>
  <div class="bd">
    <div class="ln h"><span>הנייר</span><span>יחידות</span><span>רווח ריאלי</span><span>ברוטו · מס · נטו</span></div>
    ${el.map(t=>`<div class="ln"><span class="k">${he(NM[t])}
      <span class="s">שער ${f2(p[t])} · ממוצע ${f2(w.P[t].avg)}</span></span>
      <span class="n">${f5(w.lines[t].units)}<span class="s">נמכרות</span></span>
      <span class="n">${f0(w.lines[t].realGain)}₪<span class="s">עלות מוצמדת ${f0(w.lines[t].idxCost)}₪</span></span>
      <span class="n amb">${f0(w.lines[t].net)}₪<span class="s">ברוטו ${f0(w.lines[t].amount)} · מס ${f0(w.lines[t].tax)}</span></span></div>`).join("")}
    ${K.filter(t=>!w.P[t].above).map(t=>`<div class="ln"><span class="k" style="color:var(--dim)">${he(NM[t])}
      <span class="s">מתחת לעלות הממוצעת — לא נמכר</span></span>
      <span class="n d">—</span><span class="n d">—</span><span class="n d">—</span></div>`).join("")}
  </div><div class="tot"><span>נטו לחשבון</span><span class="n">${f0(w.net)}₪</span></div></div>
  <div class="note a"><div class="b"></div><p><b>איך חושב המס.</b> לא על כל הסכום —
  <b>רק על הרווח הריאלי</b>: הסכום שנמשך פחות עלות הקנייה <b>מוצמדת למדד</b>
  (×${w.idx.toFixed(3)} מתחילת התוכנית). סך הרווח הריאלי במשיכה הזאת <b>${f0(rg)}₪</b>,
  והמס עליו 25% = <b>${f0(w.tax)}₪</b>.</p></div>
  <div class="bar"><button class="btn" id="okWd">אשרו את המשיכה</button>
    <span class="msg" id="mWd"></span></div>`;
  mktBar(); schedWd();
  document.getElementById("okWd").onclick=async(e)=>{
    const lines={};
    for(const t of el) lines[t]={units:w.lines[t].units,amount:w.lines[t].amount,price:p[t],
      curIdx:idxOf(CUR_KEYS,INST[t][pMkt()].cur,0),tax:w.lines[t].tax,net:w.lines[t].net,realGain:w.lines[t].realGain};
    LEDGER.txs.push({seq,kindIdx:1,mktIdx:PROF.mktIdx,dateN:todayN(),priceDateN:p.dateN,year:y,
      rate:w.rate,amount:w.gross,tax:w.tax,net:w.net,trackIdx:PROF.trackIdx,lines});
    e.target.disabled=true;
    const ok=await save("ledger");
    rWithdraw(); notices(); say("mWd",ok?"אושר ונשמר · "+id:"אושר אך השמירה נכשלה",!ok);
  };
}
function rPortfolio(){
  const b=document.getElementById("pfBody"), head=`<div class="mktbar"></div>`;
  if(!ready()){b.innerHTML=head+needRates("בלי שער אי אפשר להציג שווי.");mktBar();return;}
  const tx=mineTx();
  if(!tx.length){b.innerHTML=head+`<div class="empty"><b>התיק ריק ב${he(MKT[pMkt()].nm)}</b>
    הנפיקו אישור הפקדה ראשון.</div>`;mktBar();return;}
  const p=P(), {P:pos,total}=positions(tx,p);
  const dep=tx.filter(x=>KIND_KEYS[x.kindIdx]==="deposit").reduce((a,x)=>a+x.amount,0);
  const wd=tx.filter(x=>KIND_KEYS[x.kindIdx]==="withdraw").reduce((a,x)=>a+(x.net||0),0);
  const cost=K.reduce((a,t)=>a+pos[t].cost,0);
  b.innerHTML=head+`<div class="cards">
    <div class="card"><span class="l">שווי</span><span class="v">${f0(total)}</span>
      <span class="n">${he(MKT[pMkt()].nm)} · שער ${he(dStr(p.dateN))}</span></div>
    <div class="card c"><span class="l">עלות מוחזקת</span><span class="v">${f0(cost)}</span>
      <span class="n">מתוך ${f0(dep)}₪ שהופקדו</span></div>
    <div class="card ${total>=cost?"g":"r"}"><span class="l">רווח או הפסד</span>
      <span class="v">${total>=cost?"+":"−"}${f0(Math.abs(total-cost))}</span>
      <span class="n">${cost?((total/cost-1)*100).toFixed(1)+"%":"—"} על המוחזק</span></div>
    <div class="card a"><span class="l">נמשך נטו</span><span class="v">${f0(wd)}</span>
      <span class="n">בתוספת השווי = ${f0(total+wd)}₪</span></div></div>
  <div class="scroll"><table><thead><tr>
    <th>הנייר</th><th>הנייר במערכת</th><th>יחידות</th><th>עלות ממוצעת</th><th>השער</th>
    <th>שווי</th><th>משקל</th><th>מעל הממוצע</th></tr></thead><tbody>
    ${K.map(t=>{const i=INST[t][pMkt()], c=CUR[i.cur]||i.cur;return `<tr>
      <td style="font-weight:600">${he(NM[t])}</td>
      <td class="d" style="white-space:normal;min-width:200px">${he(i.n)}<br>
        <span style="font-family:var(--m);font-size:11px">${he(i.t)} · ${he(i.id)} · ${i.fee}% · ${he(i.mkt)}</span></td>
      <td class="n">${f5(pos[t].units)}</td>
      <td class="n">${f2(pos[t].avg)} ${he(c)}</td>
      <td class="n">${f2(p[t])} ${he(c)}</td>
      <td class="n amb">${f0(pos[t].value)}</td>
      <td class="n">${total?(pos[t].value/total*100).toFixed(1)+"%":"—"}</td>
      <td class="n ${pos[t].above?"gn":"rd"}">${pos[t].units?(pos[t].above?"כן · +":"לא · ")+((p[t]/pos[t].avg-1)*100).toFixed(1)+"%":"—"}</td>
    </tr>`;}).join("")}</tbody></table></div>
  <div class="note a"><div class="b"></div><p><b>העלות הממוצעת היא הלב של כלל המשיכה.</b>
  נמשך <b>רק מנייר שהשער שלו מעל העלות הממוצעת</b>. כרגע
  <b>${K.filter(t=>pos[t].above).length} מתוך 3</b> עומדים בתנאי.</p></div>`;
  mktBar();
}
function rHistory(){
  const b=document.getElementById("hsBody");
  if(!LEDGER.txs.length){b.innerHTML=`<div class="empty"><b>אין אישורים</b>ההיסטוריה תתמלא מכאן.</div>`;return;}
  b.innerHTML=`<div class="scroll"><table><thead><tr>
    <th>אישור</th><th>סוג</th><th>בורסה</th><th>תאריך</th><th>שער מתאריך</th>
    <th>סכום</th><th>מס</th><th>נטו</th><th>פירוט</th></tr></thead><tbody>
    ${LEDGER.txs.slice().reverse().map(x=>`<tr>
      <td class="n">${he(idStr(x.kindIdx,x.dateN,x.seq))}</td>
      <td class="${KIND_KEYS[x.kindIdx]==="deposit"?"cy":"amb"}" style="font-weight:600">${KIND_KEYS[x.kindIdx]==="deposit"?"הפקדה":"משיכה"}</td>
      <td class="d">${he(MKT[MKT_KEYS[x.mktIdx]]?MKT[MKT_KEYS[x.mktIdx]].nm:MKT_KEYS[x.mktIdx]||"—")}</td>
      <td class="n d">${he(dStr(x.dateN))}</td><td class="n d">${he(dStr(x.priceDateN)||"—")}</td>
      <td class="n">${f0(x.amount)}₪</td>
      <td class="n d">${x.tax?f0(x.tax)+"₪":"—"}</td>
      <td class="n amb">${x.net?f0(x.net)+"₪":"—"}</td>
      <td class="d" style="white-space:normal;min-width:280px;font-size:12px">${
        K.filter(t=>x.lines&&x.lines[t]).map(t=>he(NM[t])+" "+f5(x.lines[t].units)+" @ "+
          f2(x.lines[t].price)+" "+he(CUR[CUR_KEYS[x.lines[t].curIdx]]||"")).join(" · ")}</td>
    </tr>`).join("")}</tbody></table></div>`;
}


/* ── לוח הקניות · כמה מפקידים בכל שנה ── */
function schedDep(){
  const el=document.getElementById("depSched"); if(!el) return;
  if(!pTrack()){el.innerHTML=`<div class="empty">בחרו מסלול כדי לראות את הלוח.</div>`;return;}
  const yNow=yearNo(), g=PROF.g/100, rows=[];
  let zero=null, tot=0;
  for(let y=1;y<=45;y++){
    const d=depFor(pTrack(),pAge(),y,PROF.base,g);
    tot+=d*12;
    if(d<=0&&zero===null) zero=y;
    rows.push([y,d,tot]);
  }
  const show=rows.filter(r=>r[0]<=(zero||45)+1);
  el.innerHTML=`<p class="l">במסלול <b>${he(TRACKS[pTrack()].nm)}</b>${pTrack()==="growth"?
    ` · קבוצת גיל ${he(pAge())} · שנת מעבר ${AGE[pAge()]}`:""},
    עם הפקדה של <b>${f0(PROF.base)}₪</b> ועליה של <b>${PROF.g}%</b> בחמש השנים הראשונות.
    ${zero?`<b>ההפקדות נגמרות בשנה ${zero}.</b>`:`ההפקדה ממשיכה לאורך כל הדרך.`}</p>
  <div class="scroll"><table><thead><tr><th>שנה</th><th>הפקדה לחודש</th><th>לשנה</th>
    <th>מצטבר</th><th>שיעור המשיכה</th><th>מצב</th></tr></thead><tbody>
    ${show.map(([y,d,t])=>{const r=wrate(pTrack(),pAge(),y);
      const cls=y===yNow?' style="background:rgba(224,163,60,.1)"':(y===zero?' style="background:rgba(78,158,106,.1)"':'');
      return `<tr${cls}><td class="n" style="font-weight:600">${y}</td>
        <td class="n ${d>0?"amb":"d"}">${d>0?f0(d)+"₪":"אפס"}</td>
        <td class="n d">${d>0?f0(d*12)+"₪":"—"}</td>
        <td class="n d">${f0(t)}₪</td>
        <td class="n ${r>0?"":"d"}">${r>0?(r*100).toFixed(0)+"%":"—"}</td>
        <td class="d">${y===yNow?"<b class='amb'>השנה</b>":y===zero?"<b class='gn'>ההפקדות נגמרות</b>":
          (r>0&&wrate(pTrack(),pAge(),y-1)===0?"<b class='cy'>המשיכה מתחילה</b>":"")}</td></tr>`;}).join("")}
  </tbody></table></div>`;
}
/* ── לוח המשיכות · השיעור בכל שנה, וכמה זה בשווי התיק הנוכחי ── */
function schedWd(){
  const el=document.getElementById("wdSched"); if(!el) return;
  if(!pTrack()){el.innerHTML=`<div class="empty">בחרו מסלול כדי לראות את הלוח.</div>`;return;}
  const yNow=yearNo(), tx=mineTx();
  const have=ready()&&tx.length;
  const V=have?positions(tx,P()).total:0;
  const first=(()=>{for(let y=1;y<=60;y++) if(wrate(pTrack(),pAge(),y)>0) return y; return null;})();
  const rows=[];
  for(let y=1;y<=Math.max(25,yNow+5);y++) rows.push([y,wrate(pTrack(),pAge(),y)]);
  el.innerHTML=`<p class="l">במסלול <b>${he(TRACKS[pTrack()].nm)}</b> המשיכה מתחילה
    <b>בשנה ${first}</b>, והשיעור עולה עד 4% ושם נשאר. בכל חודש נמשך
    <b>השיעור השנתי חלקי 12</b> משווי התיק באותו חודש — ורק מנייר שמעל העלות הממוצעת.
    ${have?`עמודת ״בשווי של היום״ מחשבת את זה על <b>${f0(V)}₪</b>, שווי התיק כרגע.`:
    `<b>עמודת ״בשווי של היום״ תתמלא אחרי אישור ההפקדה הראשון.</b>`}</p>
  <div class="scroll"><table><thead><tr><th>שנה</th><th>השיעור השנתי</th><th>לחודש</th>
    <th>בשווי של היום · ברוטו</th><th>מצב</th></tr></thead><tbody>
    ${rows.map(([y,r])=>{
      const cls=y===yNow?' style="background:rgba(224,163,60,.1)"':(y===first?' style="background:rgba(79,184,201,.1)"':'');
      return `<tr${cls}><td class="n" style="font-weight:600">${y}</td>
        <td class="n ${r>0?"amb":"d"}">${r>0?(r*100).toFixed(0)+"%":"אפס"}</td>
        <td class="n d">${r>0?(r/12*100).toFixed(3)+"%":"—"}</td>
        <td class="n ${r>0&&have?"":"d"}">${r>0&&have?f0(V*r/12)+"₪":"—"}</td>
        <td class="d">${y===yNow?"<b class='amb'>השנה</b>":y===first?"<b class='cy'>המשיכה מתחילה</b>":
          (r===0.04&&wrate(pTrack(),pAge(),y-1)<0.04?"<b class='gn'>מגיע ל-4% ונשאר</b>":"")}</td></tr>`;}).join("")}
  </tbody></table></div>
  <div class="note a"><div class="b"></div><p><b>הסכום בעמודה הוא ברוטו, לפני מס.</b>
  המס הוא 25% על <b>הרווח הריאלי</b> בלבד — ולכן הוא תלוי בעלות הקנייה הממוצעת
  ובכמה זמן הכסף שם. בפועל הוא קטן מ-25% מהסכום, ואת החישוב המדויק רואים באישור עצמו.</p></div>`;
}


/* ───────── התשואות · הסימולציה על ההגדרות שנשמרו ───────── */
let SC2="real", QRES=null, QBASE=null;
const SCN2={pess:"פסימי",real:"ריאלי"};
const SRC2={
 real:{cls:"g",nm:"ריאלי",rows:[
   ["ביטקוין","16.60%","<b>JPMorgan · התרחיש השורי שלהם עצמם</b> · LTCMA 2027"],
   ["שבבים","10.72%","<b>Damodaran</b> · NYU Stern · 66 פירמות · 5.1.2026"],
   ["טכנולוגיה","9.64%","Damodaran · סקטור התוכנה · 309 פירמות"]],
  bd:[["כי זה לא מספר של מישהו שמוכר קריפטו","‏16.6% הוא <b>התרחיש השורי של JPMorgan עצמם</b>. אותו בנק מפרסם <b>10.0% כבסיס ו-−11.2% כתרחיש תחתון</b> — זה הקצה העליון של טווח שבנק פרסם, לא מספר שהומצא."],
   ["וכי הוא נמוך בהרבה ממה שמנהלי הקריפטו מפרסמים","ואן אק <b>15%</b>, פידליטי דיגיטל <b>25%</b>, ביטוויז <b>28.3%</b> — חציון <b>25%</b>. ‏16.6% הם <b>שני שלישים</b> מזה."],
   ["וכי בשני רכיבים מתוך שלושה הוא לא מניח שום דבר טוב יותר","<b>השבבים והטכנולוגיה זהים לפסימי.</b> לא מתוך שמרנות — <b>אין בעולם מקור גבוה יותר מדאמודראן</b>. התרחיש הזה הוא בפועל ״ביטקוין ריאלי, השאר אותו דבר״."],
   ["וכי כל השלושה מתחת למה שבאמת קרה","בחלון 9.2014–10.2026 <b>הביטקוין עשה כ-54% בשנה</b>, והשבבים והטכנולוגיה הרבה מעל 10.72% ו-9.64%. התרחיש הזה <b>נמוך מהתשואה שהתממשה</b> בשלושת הרכיבים."],
   ["ומה שקיים וגבוה — ולא נלקח","‏<b>BlackRock</b> מפרסמים ״פריון AI״ של <b>15.94%</b> למניות ארה״ב. ‏<b>Fidelity</b> מניחים לביטקוין <b>25%</b>. <b>התרחיש הריאלי כאן אינו הגבוה האפשרי.</b>"],
   ["ומה שמאזן את זה","גם כאן <b>הירידה המקסימלית החציונית מעל 80%</b>, ואחוזון 10 נמוך <b>פי 19</b> מהחציון — יותר מהפסימי. <b>הנחה גבוהה לא מקטינה את התנודתיות.</b>"]]},
 pess:{cls:"m",nm:"פסימי",rows:[
   ["ביטקוין","10.00%","<b>JPMorgan AM</b> · LTCMA 2027 · הבסיס"],
   ["שבבים","10.72%","<b>Damodaran</b> · NYU Stern · 66 פירמות"],
   ["טכנולוגיה","9.64%","Damodaran · סקטור התוכנה · 309 פירמות"]],
  bd:[["כל ההפרש בין שני התרחישים הוא הביטקוין","השבבים והטכנולוגיה <b>זהים בשניהם</b>. הפסימי לוקח את <b>הבסיס</b> של JPMorgan במקום התרחיש השורי: <b>10.0% במקום 16.6%</b>. זה כל השינוי."],
   ["והוא פסימי מול מי שמוכר את הנכס","חציון מנהלי הקריפטו הוא <b>25%</b>. ‏10.0% הם 40% מזה."],
   ["אבל — וזה חייב להיאמר","<b>מול הקונצנזוס המוסדי 10.0% אינו פסימי אלא הגבוה שקיים.</b> מי שאינו מוכר קריפטו מפרסם: Meketa <b>2.9%</b>, מורגן סטנלי <b>6.0%</b>, JPMorgan <b>10.0%</b> — חציון <b>6.0%</b>. ‏10.0% הוא <b>המספר הגבוה ביותר שגוף שאינו מוכר קריפטו פרסם מעולם</b>."],
   ["ומה שקיים ונמוך — ולא נלקח","‏Meketa <b>2.9%</b>. ‏GMO <b>−5.0%</b> למניות ארה״ב. ‏Schilling ו-Uhlig ב-<i>JME</i> 106 (2019): בשיווי משקל <b>התשואה הדולרית הצפויה אפס</b>. וחציון 19 התחזיות למניות ארה״ב הוא <b>6.24%</b>, והולנד קובעת <b>5.4% כתקרה חוקית</b>."],
   ["והחולשה המשותפת לשניהם","<b>שתי הנחות מתוך שלוש תלויות באדם אחד</b> — דאמודראן, המקור הסקטוריאלי היחיד בעולם. אין אף בית השקעות שמפרסם תשואה לסקטור; אומת בספירה מלאה של 20 גופים וסקר 43 יועצים שבו technolog מופיע <b>אפס פעמים</b>."]]}};
function rScen(){
  const el=document.getElementById("scenCards"); if(!el) return;
  el.innerHTML=["real","pess"].map(k=>{const s=SRC2[k];
    return `<details class="sc ${s.cls}"${k===SC2?" open":""}>
      <summary><span class="nm">${he(s.nm)}<span class="more"></span></span>
        <span class="big">${s.rows[0][1]}</span>
        <span class="cap">ביטקוין</span>
        ${s.rows.map(r=>`<span class="row"><span class="k">${he(r[0])}</span><span class="n">${r[1]}</span></span>`).join("")}
      </summary>
      <div class="bd">
        ${s.rows.map(r=>`<p style="font-size:12.5px"><b>${he(r[0])} ${r[1]}</b> — ${r[2]}</p>`).join("")}
        ${s.bd.map(b=>`<div class="hd">${he(b[0])}</div><p>${b[1]}</p>`).join("")}
      </div></details>`;}).join("");
}
function simOpts(lump){
  return {sc:SC2,mkt:pMkt(),years:+document.getElementById("qY").value||40,paths:1500,
    seed:20261025,D0:PROF.base,g:PROF.g/100,pf:pTrack()||"both",age:pAge(),
    lump:lump,floor:0,targets:[5000,10000,20000,30000,50000]};
}
function runSim(){
  if(!pTrack()){document.getElementById("qCards").innerHTML=
    `<div class="empty" style="grid-column:1/-1"><b>אין מסלול</b>בחרו מסלול כדי להריץ.</div>`;return;}
  const btn=document.getElementById("runSim"), st=document.getElementById("qStat");
  btn.disabled=true; st.textContent="מחשב 1,500 מסלולים…";
  setTimeout(()=>{
    const t0=performance.now(), L=+document.getElementById("qL").value||0;
    QRES=simulate(simOpts(L)); QBASE=L>0?simulate(simOpts(0)):QRES;
    st.textContent="הושלם ב-"+Math.round(performance.now()-t0)+"ms · החציון רועד ±5.5%";
    btn.disabled=false; rReturns();
  },20);
}
function rReturns(){
  const el=document.getElementById("qCards"); if(!el) return;
  mktBar(); rScen();
  if(!QRES){el.innerHTML=`<div class="empty" style="grid-column:1/-1">לחצו ״הרץ״.</div>`;return;}
  const r=QRES, YR=r.rows.length, last=r.rows[YR-1], L=+document.getElementById("qL").value||0;
  el.innerHTML=`
    <div class="card"><span class="l">הוכנס בסך הכל</span><span class="v">${f0(r.paid)}</span>
      <span class="n">${L>0?f0(L)+"₪ ראשוני + הפקדות":"הפקדות בלבד"}</span></div>
    <div class="card a"><span class="l">ההכנסה בשנה ${YR}</span><span class="v">${f0(last[2])}₪</span>
      <span class="n">לחודש · חציון · ${he(SCN2[SC2])}</span></div>
    <div class="card r"><span class="l">אחוזון 10</span><span class="v">${f0(last[3])}₪</span>
      <span class="n">לחודש · אחד מכל עשרה</span></div>
    <div class="card"><span class="l">שווי התיק</span><span class="v">${f0(r.V)}</span>
      <span class="n">בשנה ${YR}</span></div>
    <div class="card g"><span class="l">לכל שקל שהוכנס</span>
      <span class="v">×${((r.cash+r.V)/r.paid).toFixed(1)}</span><span class="n">תיק + מזומן</span></div>`;
  const lx=i=>"ש"+(i+1);
  area(document.getElementById("q1"),r.rows.map(x=>x[1]),r.rows.map(x=>x[5]),220,lx);
  bars(document.getElementById("q2"),r.rows.map(x=>x[2]),220,lx,{});
  const ym=m=>m==null?"—":"שנה "+(Math.floor(m/12)+1)+", חודש "+(m%12+1);
  document.getElementById("qGoals").innerHTML=`<div class="scroll"><table><thead><tr>
    <th>היעד · לחודש</th><th>מתי מגיעים</th><th>בלי השקעה ראשונית</th><th>הקיצור</th>
  </tr></thead><tbody>${[5000,10000,20000,30000,50000].map(T=>{
    const a=r.goals[T], b=QBASE.goals[T]; let sh="—";
    if(L>0&&a!=null&&b!=null){const d=b-a;
      sh=d<=0?"אין קיצור":(d>=12?Math.floor(d/12)+" שנים ו-"+(d%12)+" חודשים":d+" חודשים");}
    return `<tr><td style="font-weight:600">${f0(T)}₪</td>
      <td class="n amb">${ym(a)}</td><td class="n d">${L>0?ym(b):"—"}</td>
      <td class="n gn" style="font-weight:600">${sh}</td></tr>`;}).join("")}</tbody></table></div>`;
}

/* ── שמירה ── */
document.getElementById("saveTrack").onclick=async()=>{
  if(!pTrack()){say("mTrack","בחרו מסלול קודם",true);return;}
  const ok=await save("prof");
  say("mTrack",ok?"המסלול נשמר · "+TRACKS[pTrack()].nm:"השמירה נכשלה",!ok); notices();
};
document.getElementById("saveSetup").onclick=async()=>{
  PROF.base=+document.getElementById("sD").value||0;
  PROF.day=Math.min(28,Math.max(1,+document.getElementById("sDay").value||1));
  PROF.g=+document.getElementById("sG").value||0;
  PROF.startN=dNum(document.getElementById("sStart").value,todayN());
  const ok=await save("prof");
  say("mSetup",ok?"ההגדרות נשמרו":"השמירה נכשלה",!ok); route(); notices();
};
document.getElementById("saveRates").onclick=async()=>{
  const d=document.getElementById("rDate").value||today(), np={date:d};
  for(const t of K){const v=+document.getElementById("r"+t).value;
    if(!(v>0)){say("mRates","כל שלושת השערים חייבים להיות גדולים מאפס",true);return;} np[t]=v;}
  PX[pMkt()]=np;
  {const mk=pMkt();
    for(const t of K) PK[mk][t]=Math.max(PK[mk][t]||0,np[t]);}
  const ok=await save("prices");
  fillRates(); rRates(); notices();
  say("mRates",ok?"השער ל"+MKT[pMkt()].nm+" עודכן ל-"+d:"עודכן בדף אך השמירה נכשלה",!ok);
};
document.getElementById("pullRates").onclick=()=>pullRates(false);
document.getElementById("resetPeaks").onclick=async()=>{
  if(!ready()){say("mRates","אין שער לאפס ממנו",true);return;}
  {const mk=pMkt();
  for(const t of K) PK[mk][t]=P()[t];}
  const ok=await save("prices");
  rRates(); say("mRates",ok?"השיאים אופסו לשער הנוכחי":"אופס בדף אך השמירה נכשלה",!ok);
};
seg("segSc",SC2,v=>{SC2=v;QRES=null;rScen();rReturns();});
document.getElementById("runSim").onclick=runSim;
addEventListener("resize",()=>{if(QRES&&document.getElementById("p-returns").classList.contains("on"))rReturns();});
boot();
