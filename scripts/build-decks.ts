/** MGS · מחולל המצגות העצמאיות.
 *
 *  **למה קובץ ולא עוד מסך במערכת.** מצגת שמוצגת מול קהל צריכה
 *  להיפתח בכל דפדפן, בלי התחברות, ולהיות ניתנת להדפסה ל-PDF. והיא
 *  לא צריכה להכביד על המערכת שהתלמידים עובדים בה יום-יום.
 *
 *  **ומקור אחד בלבד.** הקובץ נבנה מאותו `DECKS` שמזין את המסך
 *  בתוך MGS, ומאותו קטלוג ומנוע — ולכן אין כאן גרסה שנייה שיכולה
 *  להתיישן ביחס למערכת.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { DECKS } from '../src/constants/decks';
import type { Block, Slide, Deck } from '../src/types/deck';
import { IRISH, BUY, TIER_HE, type Tier } from '../src/constants/irish';
import { FORWARD } from '../src/constants/forward';
import { depositAt, WITHDRAW_AFTER_STOP, DEPOSIT_YEARS } from '../src/utils/comboProject';
import { withdrawRate } from '../src/utils/mgsSim';
import { COMBOS, TRACK_HE, type TrackKey } from '../src/constants/combos';
import { CEILINGS, RATE } from '../src/constants/studyFunds';

const pc = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const sg = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`;
const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const DOT: Record<Tier, string> = { calm: 'calm', mid: 'mid', hot: 'hot' };

/** בריחה ל-HTML — הטקסט הוא נתון, לא תבנית */
const esc = (s: string) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
/** `**כך**` → מודגש, אחרי הבריחה */
const rich = (s: string) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

function table(head: string[], rows: string[][], note?: string) {
  return `<div class="scroll"><table><thead><tr>${
    head.map((h, i) => `<th${i === 0 ? ' class="lead"' : ''}>${rich(h)}</th>`).join('')
  }</tr></thead><tbody>${
    rows.map(r => `<tr>${r.map((c, j) =>
      `<td${j === 0 ? ' class="lead"' : ' dir="ltr"'}>${rich(c)}</td>`).join('')}</tr>`).join('')
  }</tbody></table></div>${note ? `<p class="note">${rich(note)}</p>` : ''}`;
}

/** הרכיבים החיים — נבנים כאן מהנתונים, לא מועתקים */
function live(id: string): string {
  if (id === 'catalog') {
    const rows = IRISH.filter(f => BUY[f.k]).sort((a, b) => b.cagr - a.cagr);
    return table(
      ['הקרן', 'הטיקר האירי', 'המקבילה', 'רמה', 'תשואה', 'תנודתיות', 'ד״נ', 'ההנחה קדימה'],
      rows.map(f => [f.he, BUY[f.k]!.sym, f.us, TIER_HE[f.tier],
        sg(f.cagr), pc(f.vol), pc(f.ter, 2), pc(FORWARD[f.k]?.real ?? 0.075, 2)]),
      'נמדד על **60 חודשים** (11.2021–11.2026) בדולר, על הקרן האירית עצמה. ההנחה קדימה היא הנחה מפורסמת ולא תחזית שלנו.');
  }
  if (id === 'depositCurve') {
    const base = 2000, g = 0.05, dy = 20;
    const rows = Array.from({ length: dy + 2 }, (_, i) => ({ y: i + 1, d: depositAt(i + 1, base, g, dy) }));
    const max = Math.max(...rows.map(r => r.d), 1);
    const bars = rows.map(r =>
      `<span class="bar" title="שנה ${r.y}: ${n0(r.d)}₪"><i class="${
        r.d === 0 ? 'off' : r.y <= 5 ? 'up' : 'dn'
      }" style="height:${(r.d / max) * 100}%"></i><small>${r.y}</small></span>`).join('');
    return `<div class="curve">${bars}</div><p class="note">${rich(
      `**בסיס ${n0(base)}₪, עליה ${pc(g)} בשנה, אופק ${dy} שנה.** שנים 1–5 עולות עד ` +
      `**${n0(depositAt(5, base, g, dy))}₪**, ומשם יורדות עד שהן מתאפסות בשנה ${dy + 1}. ` +
      `**סך הכל ${n0(rows.reduce((s, r) => s + r.d * 12, 0))}₪.**`)}</p>`;
  }
  if (id === 'tracks') {
    const T: TrackKey[] = ['flow', 'both', 'growth'];
    const first: Record<TrackKey, string> = { flow: 'שנה 2', both: 'שנה 5', growth: 'לא מושך כלל' };
    return table(
      ['המסלול', 'תנודתיות', 'מתי מתחילים למשוך', 'הקצב בשלב הצבירה', 'אחרי עצירת ההפקדות'],
      T.map(t => [TRACK_HE[t],
        t === 'flow' ? 'עד 14%' : t === 'both' ? '14%–22%' : 'מעל 22%',
        first[t],
        t === 'growth' ? '—' : `${pc(withdrawRate(t, '30-40', 2), 0)} → ${pc(withdrawRate(t, '30-40', 12), 0)}`,
        WITHDRAW_AFTER_STOP[t] > 0 ? pc(WITHDRAW_AFTER_STOP[t], 1) : 'אין משיכות']));
  }
  if (id === 'combos') {
    const T: TrackKey[] = ['flow', 'both', 'growth'];
    return table(['המסלול', 'כמה תמהילים', 'טווח תנודתיות', 'טווח תשואה', 'היחס הטוב ביותר'],
      T.map(t => {
        const c = COMBOS.filter(x => x.track === t);
        if (!c.length) return [TRACK_HE[t], '—', '—', '—', '—'];
        const best = c.reduce((a, b) => (b.ratio > a.ratio ? b : a));
        return [TRACK_HE[t], String(c.length),
          `${pc(Math.min(...c.map(x => x.vol)))}–${pc(Math.max(...c.map(x => x.vol)))}`,
          `${sg(Math.min(...c.map(x => x.cagr)), 0)}–${sg(Math.max(...c.map(x => x.cagr)), 0)}`,
          best.ratio.toFixed(2)];
      }));
  }
  if (id === 'ceilings') {
    return `<div class="stats">${[
      ['עצמאי — הפקדה מוטבת', `${n0(CEILINGS.selfExempt)}₪`, `${pc(RATE.self)} מההכנסה, עד ${n0(CEILINGS.selfIncome)}₪`],
      ['שכיר — הפקדה מוטבת', `${n0(CEILINGS.empExempt)}₪`, `${pc(RATE.employee)} מהשכר, עד ${n0(CEILINGS.empMonthly)}₪ לחודש`],
      ['שניהם יחד', `${n0(CEILINGS.selfExempt + CEILINGS.empExempt)}₪`, 'שני חשבונות נפרדים'],
      ['לחודש, שניהם', `${n0((CEILINGS.selfExempt + CEILINGS.empExempt) / 12)}₪`, 'מעל זה — לברוקר'],
    ].map(([k, v, s]) => `<div class="stat"><span class="k">${esc(k)}</span><span class="n" dir="ltr">${esc(v)}</span><span class="s">${esc(s)}</span></div>`).join('')}</div>` +
      `<p class="note">${rich(`שנות ההפקדה לפי קבוצת גיל: ${Object.entries(DEPOSIT_YEARS).map(([k, v]) => `${k} → ${v}`).join(' · ')}.`)}</p>`;
  }
  return '';
}

function block(b: Block): string {
  switch (b.t) {
    case 'lede':    return `<p class="lede">${rich(b.text)}</p>`;
    case 'p':       return `<p>${rich(b.text)}</p>`;
    case 'bullets': return `<ul>${b.items.map(x => `<li>${rich(x)}</li>`).join('')}</ul>`;
    case 'stats':   return `<div class="stats">${b.items.map(x =>
      `<div class="stat ${x.tone ?? ''}"><span class="k">${esc(x.k)}</span>` +
      `<span class="n" dir="ltr">${esc(x.v)}</span>` +
      `<span class="s">${esc(x.s ?? '')}</span></div>`).join('')}</div>`;
    case 'table':   return table(b.head, b.rows, b.note);
    case 'quote':   return `<blockquote><p>${rich(b.text)}</p>${b.by ? `<cite>${esc(b.by)}</cite>` : ''}</blockquote>`;
    case 'warn':    return `<p class="box warn">${rich(b.text)}</p>`;
    case 'good':    return `<p class="box good">${rich(b.text)}</p>`;
    case 'vs':      return `<div class="vs">${[b.a, b.b].map(c =>
      `<div class="col"><h4>${esc(c.h)}</h4><ul>${c.items.map(x => `<li>${rich(x)}</li>`).join('')}</ul></div>`).join('')}</div>`;
    case 'timeline': return `<ol class="tl">${b.items.map(x =>
      `<li><b dir="ltr">${esc(x.when)}</b><span>${rich(x.what)}</span></li>`).join('')}</ol>`;
    case 'live':    return live(b.id);
  }
}

function slide(s: Slide, d: Deck, i: number, n: number): string {
  return `<section class="slide" id="${esc(d.id)}-${esc(s.id)}">
  <header><span class="eyebrow">${esc(s.eyebrow ?? d.he)}</span><span class="pos" dir="ltr">${i + 1} / ${n}</span></header>
  <h2>${rich(s.title)}</h2>
  <div class="body">${s.blocks.map(block).join('')}</div>
  ${s.src ? `<p class="src">${rich(s.src)}</p>` : ''}
  <footer><a href="./" class="crumb">${esc(d.he)}</a><span class="brand">MGS</span></footer>
</section>`;
}

/** **הדיסקליימר — שקופית פתיחה בכל מצגת, לא הערת שוליים.**
 *  מצגת שמוצגת מול קהל צריכה לפתוח במה שהיא אינה. */
function cover(d: Deck): string {
  return `<section class="slide cover" id="${esc(d.id)}-cover">
  <header><span class="eyebrow">MGS · Money Growth System</span><span class="pos" dir="ltr">0 / ${d.slides.length}</span></header>
  <h1>${esc(d.he)}</h1>
  <p class="lede">${esc(d.sub)}</p>
  <div class="disc">
    <b>לפני הכול — מה המצגת הזאת אינה.</b>
    <ul>
      <li><b>אין באמור ייעוץ השקעות, ייעוץ פנסיוני, שיווק השקעות או ייעוץ מס</b>, ואין בו תחליף לייעוץ אישי המתחשב בנתוניו ובצרכיו של כל אדם.</li>
      <li><b>תשואות עבר אינן מנבאות תשואות עתיד.</b> התשואות והתנודתיות שמוצגות כאן נמדדו על חלון של 60 חודשים, והוא חלון מסוים ולא מייצג.</li>
      <li><b>ההנחות קדימה הן הנחות של בתי השקעות, לא תחזיות שלנו</b>, והן נכונות למועד פרסומן בלבד. הפיזור ביניהן גדול.</li>
      <li><b>השקעה בניירות ערך כרוכה בסיכון</b>, לרבות אובדן מלא או חלקי של הקרן.</li>
      <li><b>הנתונים המשפטיים והמיסויים הם תיאור של דין נכון למועד הכתיבה</b>, לא חוות דעת. חלקם מסומנים במצגת במפורש כ״לא אומת מול מקור רשמי״.</li>
    </ul>
    <small>נכון לנובמבר 2026. המספרים נבנים מהקטלוג והמנוע של MGS בעת יצירת הקובץ.</small>
  </div>
  <footer><a href="./" class="crumb">${esc(d.he)}</a><span class="brand">MGS</span></footer>
</section>`;
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--ground:#07090A;--surface:#0E1114;--sunk:#151A1E;--ink:#ECF2EF;
 --mid:#AFBCB7;--muted:#76837F;--rule:#1F272B;--grid:#161C20;
 --gold:#E3BE45;--goldsoft:#8A7220;--up:#2FD898;--down:#FF6A5C;--bar:#2B3338;
 --sans:'Heebo',system-ui,-apple-system,'Segoe UI',Arial,sans-serif;
 --mono:'IBM Plex Mono',SFMono-Regular,Consolas,monospace}
html,body{background:var(--ground);color:var(--ink);font-family:var(--sans);
 font-weight:300;line-height:1.55;direction:rtl}
body{padding:18px}
.deck{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
.slide{display:none;background:var(--surface);border:1px solid var(--rule);
 border-radius:12px;padding:30px 32px 22px;min-height:560px;
 flex-direction:column;gap:15px}
.slide.on{display:flex}
.slide header{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.eyebrow{font-size:10.5px;font-weight:600;letter-spacing:2.4px;color:var(--gold)}
.pos{font-family:var(--mono);font-size:12px;color:var(--muted)}
h1{font-size:clamp(28px,5vw,46px);font-weight:800;line-height:1.08;letter-spacing:-.6px;text-wrap:balance}
h2{font-size:clamp(21px,3.6vw,33px);font-weight:800;line-height:1.14;letter-spacing:-.4px;text-wrap:balance}
h4{font-size:14px;font-weight:700;margin-bottom:7px}
.body{display:flex;flex-direction:column;gap:13px;flex:1}
p{font-size:15px;color:var(--mid);max-width:74ch}
.lede{font-size:17px;color:var(--mid);max-width:68ch}
b{color:var(--ink);font-weight:600}
ul,ol{padding-inline-start:21px;display:flex;flex-direction:column;gap:8px;
 font-size:14.5px;color:var(--mid);max-width:74ch}
li::marker{color:var(--goldsoft)}
.box{border:1px solid var(--rule);border-radius:7px;padding:12px 14px;font-size:14px;max-width:none}
.box.warn{border-color:color-mix(in srgb,#FF6A5C 42%,var(--rule));background:rgba(255,106,92,.05)}
.box.warn b{color:var(--down)}
.box.good{border-color:color-mix(in srgb,#2FD898 40%,var(--rule));background:rgba(47,216,152,.04)}
.box.good b{color:var(--up)}
blockquote{border-inline-start:3px solid var(--gold);padding-inline-start:15px;
 display:flex;flex-direction:column;gap:6px}
blockquote p{font-size:16.5px;color:var(--ink);font-style:italic}
cite{font-style:normal;font-size:12px;color:var(--muted)}
.stats{display:grid;gap:9px;grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr))}
.stat{background:var(--sunk);border:1px solid var(--rule);border-radius:7px;
 padding:11px 13px;display:grid;gap:2px}
.stat .k{font-size:10px;letter-spacing:1.2px;color:var(--muted)}
.stat .n{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:23px;font-weight:700}
.stat .s{font-size:10.5px;color:var(--muted);line-height:1.45}
.stat.gold .n{color:var(--gold)}.stat.up .n{color:var(--up)}.stat.warn .n{color:var(--down)}
.scroll{overflow-x:auto;border:1px solid var(--rule);border-radius:7px}
table{width:100%;border-collapse:separate;border-spacing:0;font-size:12.5px}
th{background:var(--sunk);font-size:9.5px;font-weight:600;letter-spacing:.9px;
 color:var(--muted);text-align:start;padding:8px 10px;border-bottom:1px solid var(--rule);white-space:nowrap}
td{padding:7px 10px;border-bottom:1px solid var(--grid);white-space:nowrap}
td.lead,th.lead{color:var(--ink);font-weight:500;white-space:normal;min-width:130px}
td[dir=ltr]{font-family:var(--mono);font-variant-numeric:tabular-nums}
tr:last-child td{border-bottom:0}
.vs{display:grid;gap:11px;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))}
.col{background:var(--sunk);border:1px solid var(--rule);border-radius:8px;padding:14px 15px}
.col ul{font-size:13px;color:var(--muted);gap:7px}
.tl{list-style:none;padding:0;gap:10px}
.tl li{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:baseline;
 padding-inline-start:13px;border-inline-start:2px solid var(--rule)}
.tl b{font-family:var(--mono);font-size:12px;color:var(--gold);white-space:nowrap}
.tl span{font-size:13.5px;color:var(--mid)}
.note{font-size:11.5px;color:var(--muted);line-height:1.6}
.src{font-size:10.5px;color:var(--muted);padding-top:9px;border-top:1px solid var(--rule)}
.slide footer{display:flex;justify-content:space-between;align-items:center;
 font-size:10px;letter-spacing:1.4px;color:var(--muted);padding-top:9px;border-top:1px solid var(--rule)}
.brand{color:var(--gold);font-weight:700;letter-spacing:3px}
.crumb{color:var(--muted);text-decoration:none;letter-spacing:1.4px}
.crumb:hover{color:var(--gold);text-decoration:underline}
.curve{display:flex;align-items:flex-end;gap:3px;height:170px;padding-top:10px;
 border-bottom:1px solid var(--rule)}
.bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:4px;min-width:0}
.bar i{display:block;width:100%;border-radius:2px 2px 0 0;background:var(--gold)}
.bar i.dn{background:var(--goldsoft)}.bar i.off{background:var(--bar);min-height:2px}
.bar small{font-size:8.5px;color:var(--muted);font-family:var(--mono)}
.disc{border:1px solid var(--down);border-radius:9px;padding:16px 18px;
 background:rgba(255,106,92,.045);display:flex;flex-direction:column;gap:9px}
.disc>b{color:var(--down);font-size:15px}
.disc ul{font-size:13px;gap:7px;color:var(--muted)}
.disc small{font-size:11px;color:var(--muted);padding-top:7px;border-top:1px solid var(--rule)}
nav{position:sticky;bottom:0;background:var(--ground);padding:11px 0 2px;
 display:flex;align-items:center;gap:11px;flex-wrap:wrap;border-top:1px solid var(--rule);z-index:5}
button,select{appearance:none;background:var(--sunk);border:1px solid var(--rule);
 border-radius:6px;color:var(--ink);font-family:inherit;font-size:13px;
 padding:8px 15px;cursor:pointer;min-height:38px}
button:hover:not(:disabled){border-color:var(--gold)}
button:disabled{opacity:.35;cursor:default}
button.go{background:var(--gold);border-color:var(--gold);color:#0B0F11;font-weight:700}
select{min-width:190px;padding-inline-end:10px}
.back{display:inline-flex;align-items:center;min-height:38px;padding:8px 15px;
 border:1px solid var(--rule);border-radius:6px;background:var(--sunk);
 color:var(--gold);text-decoration:none;font-size:13px;font-weight:600;white-space:nowrap}
.back:hover{border-color:var(--gold)}
.rail{flex:1;height:3px;background:var(--grid);border-radius:2px;overflow:hidden;min-width:90px}
.rail i{display:block;height:100%;background:var(--gold);transition:width .25s}
.hint{font-size:10.5px;color:var(--muted);text-align:center;padding:7px 0 2px}
@media (max-width:620px){
 body{padding:11px}
 .slide{padding:19px 16px;min-height:0}
 .bar small{display:none}.curve{height:120px}
 td.lead,th.lead{min-width:112px}
 select{min-width:100%;order:-1}
}
@media print{
 body{background:#fff;padding:0}
 nav,.hint{display:none}
 .slide{display:flex!important;page-break-after:always;border:0;min-height:0;
  background:#fff;color:#111}
 h1,h2,b{color:#000}p,li,.note,.src{color:#333}
}`;

const JS = `
const S=[...document.querySelectorAll('.slide')];
const sel=document.getElementById('jump'),rail=document.getElementById('rail');
const prev=document.getElementById('prev'),next=document.getElementById('next');
let i=0;
function show(n){
  i=Math.max(0,Math.min(S.length-1,n));
  S.forEach((s,j)=>s.classList.toggle('on',j===i));
  sel.value=String(i);
  rail.style.width=((i+1)/S.length*100)+'%';
  prev.disabled=i===0; next.disabled=i===S.length-1;
  window.scrollTo(0,0);
  try{location.hash=S[i].id}catch(e){}
}
prev.onclick=()=>show(i-1); next.onclick=()=>show(i+1);
sel.onchange=e=>show(Number(e.target.value));
addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft'||e.key===' '||e.key==='PageDown')show(i+1);
  if(e.key==='ArrowRight'||e.key==='PageUp')show(i-1);
  if(e.key==='Home')show(0); if(e.key==='End')show(S.length-1);
});
const h=location.hash.slice(1);
const at=S.findIndex(s=>s.id===h);
show(at>=0?at:0);`;

function page(
  title: string, slides: string[], opts: Array<[number, string]>, home = true,
): string {
  return `<!doctype html>
<html lang="he" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;600;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap">
<style>${CSS}</style></head>
<body><div class="deck">
${slides.join('\n')}
<nav>
  ${home ? '<a class="back" href="./">\u2190 כל המצגות</a>' : ''}
  <button id="prev">הקודם</button>
  <span class="rail"><i id="rail"></i></span>
  <select id="jump" aria-label="מעבר לשקופית">${
    opts.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')
  }</select>
  <button id="next" class="go">הבא</button>
</nav>
<p class="hint">מקשי החיצים או רווח מדפדפים · Ctrl+P להדפסה או שמירה כ-PDF</p>
</div><script>${JS}</script></body></html>`;
}

// ── הכתיבה ───────────────────────────────────────────────────────────────────
mkdirSync('decks', { recursive: true });
let n = 0;
const index: string[] = [];

for (const d of DECKS) {
  const slides = [cover(d), ...d.slides.map((s, i) => slide(s, d, i, d.slides.length))];
  const opts: Array<[number, string]> = [[0, `${d.he} — פתיחה`],
    ...d.slides.map((s, i) => [i + 1, `${i + 1}. ${s.title}`] as [number, string])];
  writeFileSync(`decks/${d.id}.html`, page(`MGS · ${d.he}`, slides, opts), 'utf8');
  index.push(`<a class="card" href="${d.id}.html"><span class="tag">${esc(d.tag)}</span>` +
    `<b>${esc(d.he)}</b><small>${esc(d.sub)}</small>` +
    `<em>${d.slides.length} שקופיות ←</em></a>`);
  n += d.slides.length + 1;
}

// כל המצגות בקובץ אחד, לרצף הרצאה מלא
const all: string[] = [];
const allOpts: Array<[number, string]> = [];
let k = 0;
for (const d of DECKS) {
  all.push(cover(d)); allOpts.push([k++, `── ${d.he}`]);
  d.slides.forEach((s, i) => { all.push(slide(s, d, i, d.slides.length)); allOpts.push([k++, `    ${s.title}`]); });
}
writeFileSync('decks/all.html', page('MGS · הקורס המלא', all, allOpts), 'utf8');

writeFileSync('decks/index.html', `<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MGS · המצגות</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;600;700;800&display=swap">
<style>${CSS}
.grid{display:grid;gap:11px;grid-template-columns:repeat(auto-fill,minmax(min(270px,100%),1fr));margin-top:16px}
.card{display:grid;gap:6px;background:var(--surface);border:1px solid var(--rule);
 border-radius:9px;padding:15px 16px;text-decoration:none;color:var(--ink)}
.card:hover{border-color:color-mix(in srgb,#E3BE45 50%,var(--rule))}
.tag{font-size:9.5px;font-weight:700;letter-spacing:1.6px;color:var(--gold)}
.card b{font-size:16px}.card small{font-size:12px;color:var(--muted);line-height:1.55}
.card em{font-style:normal;font-size:11px;color:var(--mid)}
.hero{background:var(--surface);border:1px solid var(--rule);border-radius:12px;padding:26px 28px;display:grid;gap:11px}
</style></head><body><div class="deck">
<div class="hero">
  <span class="eyebrow">MGS · Money Growth System</span>
  <h1>המצגות</h1>
  <p class="lede">${DECKS.length} מצגות, ${n} שקופיות. נפתחות בכל דפדפן, עובדות במובייל, ו-Ctrl+P שומר כ-PDF.</p>
  <p><a class="card" href="all.html" style="display:inline-grid"><span class="tag">הכל ברצף</span><b>הקורס המלא</b><small>כל המצגות בקובץ אחד, להרצאה רצופה</small></a></p>
</div>
<div class="grid">${index.join('')}</div>
<p class="note" style="margin-top:14px"><b>אין באמור ייעוץ השקעות, ייעוץ פנסיוני, שיווק השקעות או ייעוץ מס.</b> כל מצגת נפתחת בשקופית דיסקליימר מלאה. תשואות עבר אינן מנבאות תשואות עתיד.</p>
</div></body></html>`, 'utf8');

console.log(`נכתבו ${DECKS.length} מצגות + all.html + index.html → decks/`);
console.log(`סך הכל ${n} שקופיות (כולל שקופית דיסקליימר לכל מצגת)`);
