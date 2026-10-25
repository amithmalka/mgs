/* המנוע · זהה לגרסת הפייתון. הפרמטרים נמדדו על 146 חודשים, 9.2014–10.2026 */
const SIM={
  keys:["BTC","SEM","TEC"],
  vol:{BTC:0.662738,SEM:0.272745,TEC:0.198347},
  chol:[[1,0,0],[0.212201,0.977226,0],[0.327987,0.827266,0.456132]],
  /* שני תרחישים · ההפרש ביניהם הוא הביטקוין בלבד
     pess · פסימי  — ביטקוין 10.0% (JPMorgan, בסיס)
     real · ריאלי  — ביטקוין 16.6% (JPMorgan, התרחיש השורי שלהם)
     השבבים והטכנולוגיה זהים בשניהם — אין בעולם מקור גבוה יותר מדאמודראן */
  sc:{pess:{BTC:0.100,SEM:0.1072,TEC:0.0964},
      real:{BTC:0.166,SEM:0.1072,TEC:0.0964}},
  ter:{fx:{BTC:0.0010,SEM:0.0035,TEC:0.0014},
       il:{BTC:0.0020,SEM:0.0045,TEC:0.0014}},
  fx:0.004, cpi:0.02, tax:0.25, upcap:10,
  /* מסלול המשיכה — שונה בכל פרופיל:
     flow   · תזרים בלבד   — שנה 1 אפס · 2–5 אחוז אחד · 6 שניים · 7 שלושה · 8+ ארבעה
     both   · תזרים וצמיחה — שנים 1–4 אפס · 5–10 אחוז אחד · 11 ואילך ארבעה
     growth · צמיחה בלבד   — אפס עד שנת המעבר · ומשנת המעבר ארבעה אחוזים  */
  wramp:{flow:[0,0.01,0.01,0.01,0.01,0.02,0.03,0.04],
         both:[0,0,0,0,0.01,0.01,0.01,0.01,0.01,0.01,0.04]},
  // שנת המעבר לפי קבוצת גיל — השנה שבה היינו מעבירים למסלול גלובלי
  ageStart:{"20-30":20,"30-40":20,"40-50":15,"50-60":10,"60-70":5}
};
function sRng32(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;
  let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;};}
function sGauss(r){let u=0,v=0;while(u===0)u=r();while(v===0)v=r();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function sWrate(pf,age,y){
  if(pf==="growth"){
    const st=SIM.ageStart[age]||20;
    return y<st?0:0.04;
  }
  const r=SIM.wramp[pf]||SIM.wramp.both;
  return r[Math.min(y-1,r.length-1)];
}
/* שלושה פרופילים · ההפקדה עולה g% בחמש השנים הראשונות, ואז יורדת:
   flow   · תזרים בלבד      — ‏10% מסכום הבסיס בשנה, מתחילה בשנה 5
   both   · תזרים וצמיחה    — ‏5% מסכום הבסיס בשנה, מתחילה בשנה 5
   growth · צמיחה בלבד      — ‏10% מסכום הבסיס בשנה, מתחילה בשנת המעבר לפי גיל  */
function profile(pf,age){
  if(pf==="flow")   return {down:0.10, start:5};
  if(pf==="both")   return {down:0.05, start:5};
  if(pf==="growth") return {down:0.10, start:SIM.ageStart[age]||20};
  if(pf==="stop")   return {down:1.00, start:5};
  return {down:0, start:null};          // up · ממשיכה לעלות
}
function sDepFn(pf,age,y,D0,g){
  const P=profile(pf,age);
  if(P.start===null) return D0*Math.pow(1+g,y-1);          // ממשיכה לעלות
  const peakY=Math.min(5,P.start);
  const peak=D0*Math.pow(1+g,Math.min(y,peakY)-1);
  if(y<=P.start) return D0*Math.pow(1+g,Math.min(y,5)-1);  // עדיין עולה או קבועה
  const base=D0*Math.pow(1+g,Math.min(P.start,5)-1);
  return Math.max(0, base - D0*P.down*(y-P.start));
}
function sZeroYear(pf,age,D0,g){
  if(profile(pf,age).start===null) return null;
  for(let y=2;y<=300;y++) if(sDepFn(pf,age,y,D0,g)<=0) return y;
  return null;
}
function sMakePath(sc,mkt,mon,r){
  const K=SIM.keys, mu={}, sd={};
  for(const t of K){
    mu[t]=Math.log(1+SIM.sc[sc][t]-SIM.fx-SIM.ter[mkt][t])/12;
    sd[t]=SIM.vol[t]/Math.sqrt(12);
  }
  const px={}; for(const t of K) px[t]=new Float64Array(mon);
  const cur={}; for(const t of K) cur[t]=100;
  for(let m=0;m<mon;m++){
    const z=[sGauss(r),sGauss(r),sGauss(r)];
    for(let i=0;i<3;i++){
      let cz=0; for(let j=0;j<=i;j++) cz+=SIM.chol[i][j]*z[j];
      const t=K[i];
      cur[t]*=Math.exp(mu[t]+sd[t]*cz);
      px[t][m]=cur[t];
    }
  }
  return px;
}
function sRunOne(PR,mon,o){
  const K=SIM.keys, sh={},cost={},cidx={},mark={};
  for(const t of K){sh[t]=0;cost[t]=0;cidx[t]=0;mark[t]=0;}
  let cash=0,paid=0,ytot=0,skip=0,below=0,first=null,cross=null;
  const yr=[], hit={}; for(const T of (o.targets||[])) hit[T]=null;
  const cm=Math.pow(1+SIM.cpi,1/12);
  for(let m=0;m<mon;m++){
    const y=Math.floor(m/12)+1;
    if(m%12===0) ytot=0;
    const idx=Math.pow(cm,m);
    let dep=sDepFn(o.pf,o.age,y,o.D0,o.g);
    for(const t of K) mark[t]=mark[t]>0?Math.max(mark[t],PR[t][m]):PR[t][m];
    if(o.lump>0&&m===0){
      for(const t of K){const a=o.lump/3; sh[t]+=a/PR[t][m]; cost[t]+=a; cidx[t]+=a/idx;}
      paid+=o.lump;
    }
    if(dep>0){
      const f={},drop={}; let s=0,mx=K[0],mv=-1;
      for(const t of K){
        const x=(PR[t][m]/mark[t]-1)*100;
        f[t]=(x>=0?Math.min(x,SIM.upcap):-x)/100; drop[t]=Math.max(0,-x);
        s+=f[t]; if(drop[t]>mv){mv=drop[t];mx=t;}
      }
      const al={};
      if(s>=1){for(const t of K) al[t]=dep*f[t]/s;}
      else {for(const t of K) al[t]=dep*f[t]; al[mx]+=dep*(1-s);}
      for(const t of K) if(al[t]>0){sh[t]+=al[t]/PR[t][m]; cost[t]+=al[t]; cidx[t]+=al[t]/idx;}
      paid+=dep;
    }
    let V=0; for(const t of K) V+=sh[t]*PR[t][m];
    let net=0; const r=sWrate(o.pf,o.age,y);
    if(r>0&&V>0){
      const gross=V*r/12;
      if(gross<o.floor) below++;
      else{
        let pv=0; const pool={};
        for(const t of K) if(sh[t]>0&&PR[t][m]>cost[t]/sh[t]){pool[t]=sh[t]*PR[t][m];pv+=pool[t];}
        if(pv<=0) skip++;
        else{
          for(const t in pool){
            const tk=gross*pool[t]/pv, fr=Math.min(0.999,tk/(sh[t]*PR[t][m]));
            const rg=Math.max(0,tk-fr*idx*cidx[t]);
            sh[t]*=(1-fr); cost[t]*=(1-fr); cidx[t]*=(1-fr);
            const nt=tk-rg*SIM.tax; cash+=nt; net+=nt; ytot+=nt;
          }
          if(first===null) first=m;
        }
      }
    }
    if(cross===null&&dep>0&&net>=dep&&net>0) cross=[m,net,dep];
    for(const T in hit) if(hit[T]===null&&net>=+T) hit[T]=m;
    V=0; for(const t of K) V+=sh[t]*PR[t][m];
    if(m%12===11) yr.push([dep,V,ytot/12,cash]);
  }
  let Vend=0; for(const t of K) Vend+=sh[t]*PR[t][mon-1];
  return {yr,V:Vend,cash,paid,skip,below,first,cross,hit};
}
function sPctl(a,q){a=a.slice().sort((x,y)=>x-y);const i=q*(a.length-1),lo=Math.floor(i);
  return a[lo]+(a[Math.min(lo+1,a.length-1)]-a[lo])*(i-lo);}
function sMedian(a){return sPctl(a,0.5);}
function simulate(o){
  const mon=o.years*12, N=o.paths||400, r=sRng32(o.seed||20261025);
  const paths=[]; for(let i=0;i<N;i++) paths.push(sMakePath(o.sc,o.mkt,mon,r));
  const R=paths.map(p=>sRunOne(p,mon,o));
  const rows=[];
  for(let i=0;i<o.years;i++){
    const inc=R.map(x=>x.yr[i][2]), vv=R.map(x=>x.yr[i][1]);
    rows.push([R[0].yr[i][0], sMedian(vv),
               sMedian(inc), sPctl(inc,0.10), sMedian(R.map(x=>x.yr[i][3])),
               sPctl(vv,0.10)]);   // אחוזון 10 של שווי התיק — נמדד, לא נגזר
  }
  const mid=k=>{const v=R.map(x=>x[k]).filter(x=>x!==null);
    if(v.length<N*0.5) return null;
    const m=sMedian(v.map(x=>Array.isArray(x)?x[0]:x));
    const pick=v.find(x=>(Array.isArray(x)?x[0]:x)===Math.round(m));
    const mm=Math.round(m);
    return Array.isArray(pick)?[Math.floor(mm/12)+1,mm%12+1,Math.round(pick[1]),Math.round(pick[2])]
                              :[Math.floor(mm/12)+1,mm%12+1];};
  const goals={};
  for(const T of (o.targets||[])){
    const v=R.map(x=>x.hit[T]).filter(x=>x!==null);
    goals[T]=v.length>=N*0.5?Math.round(sMedian(v)):null;
  }
  return {rows,V:sMedian(R.map(x=>x.V)),cash:sMedian(R.map(x=>x.cash)),paid:R[0].paid,
          skip:Math.round(sMedian(R.map(x=>x.skip))),below:Math.round(sMedian(R.map(x=>x.below))),
          first:mid("first"),cross:mid("cross"),goals,
          zero:sZeroYear(o.pf,o.age,o.D0,o.g)};
}
