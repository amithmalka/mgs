/* גרפים · Canvas 2D, בלי ספריות */
const C={bg:"#0B0F15",grid:"#1A212C",txt:"#79818F",dim:"#4C5462",
         amb:"#E0A33C",cy:"#4FB8C9",gn:"#4E9E6A",rd:"#C4604F"};
function setup(cv,h){
  const dpr=window.devicePixelRatio||1, w=cv.clientWidth||900;
  cv.width=w*dpr; cv.height=h*dpr; cv.style.height=h+"px";
  const x=cv.getContext("2d"); x.setTransform(dpr,0,0,dpr,0,0);
  x.clearRect(0,0,w,h); return {x,w,h};
}
const fmt=v=>v>=1e6?(v/1e6).toFixed(1)+"M":v>=1e3?Math.round(v/1e3)+"K":Math.round(v);
function axes(x,w,h,pad,maxY,nx,lblX){
  x.font="10px 'IBM Plex Mono',monospace"; x.textBaseline="middle";
  for(let i=0;i<=4;i++){
    const gy=pad.t+(h-pad.t-pad.b)*i/4, v=maxY*(1-i/4);
    x.strokeStyle=C.grid; x.lineWidth=1;
    x.beginPath(); x.moveTo(pad.l,gy+.5); x.lineTo(w-pad.r,gy+.5); x.stroke();
    x.fillStyle=C.dim; x.textAlign="left";
    x.fillText(fmt(v),4,gy);
  }
  x.textAlign="center"; x.textBaseline="top";
  const step=Math.max(1,Math.round(nx/8));
  for(let i=0;i<nx;i+=step){
    const gx=pad.l+(w-pad.l-pad.r)*i/(nx-1);
    x.fillStyle=C.dim; x.fillText(lblX(i),gx,h-pad.b+7);
  }
}
/* גרף שטח: חציון + אחוזון 10 */
function area(cv,med,p10,h,lblX){
  const {x,w}=setup(cv,h), pad={t:14,r:12,b:24,l:42};
  const maxY=Math.max(...med)*1.08||1, n=med.length;
  const px=i=>pad.l+(w-pad.l-pad.r)*i/(n-1);
  const py=v=>pad.t+(h-pad.t-pad.b)*(1-v/maxY);
  axes(x,w,h,pad,maxY,n,lblX);
  // מילוי בין p10 לחציון
  x.beginPath(); x.moveTo(px(0),py(med[0]));
  for(let i=1;i<n;i++) x.lineTo(px(i),py(med[i]));
  for(let i=n-1;i>=0;i--) x.lineTo(px(i),py(p10[i]));
  x.closePath();
  const g=x.createLinearGradient(0,pad.t,0,h-pad.b);
  g.addColorStop(0,"rgba(224,163,60,.24)"); g.addColorStop(1,"rgba(224,163,60,.03)");
  x.fillStyle=g; x.fill();
  // קו אחוזון 10
  x.beginPath(); x.moveTo(px(0),py(p10[0]));
  for(let i=1;i<n;i++) x.lineTo(px(i),py(p10[i]));
  x.strokeStyle=C.rd; x.lineWidth=1.4; x.setLineDash([4,3]); x.stroke(); x.setLineDash([]);
  // קו החציון
  x.beginPath(); x.moveTo(px(0),py(med[0]));
  for(let i=1;i<n;i++) x.lineTo(px(i),py(med[i]));
  x.strokeStyle=C.amb; x.lineWidth=2.2; x.shadowColor=C.amb; x.shadowBlur=9; x.stroke();
  x.shadowBlur=0;
  // נקודת סיום
  x.beginPath(); x.arc(px(n-1),py(med[n-1]),3.6,0,7); x.fillStyle=C.amb; x.fill();
}
/* עמודות: הכנסה חודשית, עם סימון שנים מיוחדות */
function bars(cv,vals,h,lblX,marks){
  const {x,w}=setup(cv,h), pad={t:14,r:12,b:24,l:42};
  const maxY=Math.max(...vals)*1.1||1, n=vals.length;
  const bw=Math.max(2,(w-pad.l-pad.r)/n-2);
  axes(x,w,h,pad,maxY,n,lblX);
  for(let i=0;i<n;i++){
    const gx=pad.l+(w-pad.l-pad.r)*i/n+1;
    const hh=(h-pad.t-pad.b)*vals[i]/maxY;
    const m=marks&&marks[i+1];
    x.fillStyle=m==="cr"?C.cy:m==="z0"?C.gn:m==="fw"?"#F0B855":"rgba(224,163,60,.62)";
    x.fillRect(gx,h-pad.b-hh,bw,hh);
  }
}
/* שלושה תרחישים זה על זה */
function multi(cv,series,h,lblX){
  const {x,w}=setup(cv,h), pad={t:14,r:12,b:24,l:42};
  const all=series.flatMap(s=>s.v);
  const maxY=Math.max(...all)*1.08||1, n=series[0].v.length;
  const px=i=>pad.l+(w-pad.l-pad.r)*i/(n-1);
  const py=v=>pad.t+(h-pad.t-pad.b)*(1-v/maxY);
  axes(x,w,h,pad,maxY,n,lblX);
  for(const s of series){
    x.beginPath(); x.moveTo(px(0),py(s.v[0]));
    for(let i=1;i<n;i++) x.lineTo(px(i),py(s.v[i]));
    x.strokeStyle=s.c; x.lineWidth=2; x.stroke();
    x.beginPath(); x.arc(px(n-1),py(s.v[n-1]),3.2,0,7); x.fillStyle=s.c; x.fill();
  }
}
