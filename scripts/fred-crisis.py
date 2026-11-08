"""**מנגנון ההקפאה על נתונים אמיתיים מ-1971 — כולל הדוט-קום.**

**איך הגענו לנתונים.** שני ספקי המחירים של הפרויקט חסומים ב-240
נקודות חודשיות (החלון מתחיל 12.2006), ולכן אי אפשר היה למדוד את
2000–2002. ‏**FRED של הפד בסנט לואיס מפרסם CSV ציבורי בלי מפתח**:

    NASDAQ100  — יומי מ-02.01.1986
    NASDAQCOM  — יומי מ-05.02.1971

וזה מכסה את 1987, את הדוט-קום, את 2008, את 2020 ואת 2022.

⚠️ **ומה שחייב להיאמר על הנתונים האלה: אלה מדדי מחיר, לא תשואה
כוללת.** אין בהם דיבידנד. בנאסד״ק 100 התשואה הזאת נמוכה (סדר גודל
של 0.6–0.9% לשנה), ולכן **כל תשואה כאן נמוכה מהאמת בערך בשיעור
הזה** — אבל **ההשוואה בין ״עם הקפאה״ ל״בלי״ אינה מושפעת**, כי
שתיהן על אותה סדרה.

**מה נמדד:**
  1. **הטריגר היומי** — כמה פעמים באמת ירד 15% ביום מאז 1971
  2. **זמני המעבר** בין מדרגות נפילה, בכל אפיזודה
  3. **המנגנון** — הקפאה ב-‎−15%, חזרה ב-‎−30% או בהתאוששות

הרצה:  python3 scripts/fred-crisis.py
"""
import subprocess
from statistics import median

SERIES = {'NASDAQ100': 'נאסד״ק 100 · מ-1986', 'NASDAQCOM': 'נאסד״ק מורכב · מ-1971'}
TRIG, DEEP, DEPOSIT = 0.15, 0.30, 1000.0


def fred(sid):
    raw = subprocess.run(['curl', '-s', '-m', '40',
                          f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}'],
                         capture_output=True, text=True).stdout
    out = []
    for ln in raw.splitlines()[1:]:
        p = ln.split(',')
        if len(p) < 2 or p[1] in ('.', ''):
            continue
        try: out.append((p[0], float(p[1])))
        except ValueError: pass
    return out


def monthly(d):
    """סגירת החודש האחרונה — ההפקדות חודשיות."""
    out = {}
    for t, v in d: out[t[:7]] = (t, v)
    return [out[k] for k in sorted(out)]


def daily_shocks(d, th=0.15):
    """ימים שבהם המדד ירד יותר מ-`th` ביום אחד."""
    hits = []
    for i in range(1, len(d)):
        r = d[i][1] / d[i - 1][1] - 1
        if r <= -th: hits.append((d[i][0], r))
    return hits


def episodes(ms):
    """אפיזודות מחציית ‎−15%, עם זמן לכל מדרגה. נסגר רק בשיא חדש."""
    out = []; peak = ms[0][1]; cur = None
    for t, a in ms:
        if a >= peak:
            if cur: out.append(cur); cur = None
            peak = a; continue
        dd = 1 - a / peak
        if cur is None:
            if dd >= 0.15: cur = dict(t0=t, n=0, deep=dd, hit={})
        else:
            cur['n'] += 1; cur['deep'] = max(cur['deep'], dd)
            for L in (0.30, 0.45, 0.60, 0.75):
                if dd >= L and L not in cur['hit']: cur['hit'][L] = cur['n']
    if cur: out.append(cur)
    return out


def run(ms, freeze):
    u = cash = 0.0; peak = 0.0; froz = False; held = 0
    vals = []; pk = dd = 0.0
    for _, p in ms:
        peak = max(peak, p); drop = 1 - p / peak
        if freeze:
            if not froz and drop >= TRIG: froz = True
            elif froz and (drop >= DEEP or drop < TRIG):
                froz = False
                if cash: u += cash / p; cash = 0.0
        if froz: cash += DEPOSIT; held += 1
        else: u += DEPOSIT / p
        v = u * p + cash
        vals.append(v); pk = max(pk, v); dd = min(dd, v / pk - 1)
    if cash: u += cash / ms[-1][1]; cash = 0.0
    n = len(ms); lo, hi = -0.9, 1.0
    for _ in range(90):
        m = (lo + hi) / 2
        fv = sum(DEPOSIT * (1 + m) ** (n - i) for i in range(n))
        if fv < u * ms[-1][1]: lo = m
        else: hi = m
    return u * ms[-1][1], (1 + (lo + hi) / 2) ** 12 - 1, dd, held / n


def main():
    for sid, name in SERIES.items():
        d = fred(sid)
        if not d: print(f"  {name}: אין נתונים"); continue
        ms = monthly(d)
        print(f"\n  ══ {name} ══  {d[0][0]} → {d[-1][0]}  "
              f"({len(ms)} חודשים, {(len(ms)-1)/12:.1f} שנים)")

        for th in (0.10, 0.15, 0.20):
            h = daily_shocks(d, th)
            s = ' · '.join(f"{t} ({r*100:.0f}%)" for t, r in h[:6])
            print(f"     ירידה יומית ≥{th:.0%}: **{len(h)}** פעמים"
                  + (f"  {s}" if h else ''))

        eps = episodes(ms)
        g30 = [e['hit'][0.30] for e in eps if 0.30 in e['hit']]
        print(f"\n     {len(eps)} אפיזודות שחצו ‎−15%. "
              f"**{len(g30)} מהן המשיכו ל-‎−30%** "
              + (f"— חציון {median(g30):.0f} חודשים, טווח {min(g30)}–{max(g30)}" if g30 else ''))
        for e in sorted(eps, key=lambda x: -x['deep'])[:5]:
            st = ' → '.join(f"{int(L*100)}%@{e['hit'][L]}ח״" for L in (0.30, 0.45, 0.60, 0.75) if L in e['hit'])
            print(f"       {e['t0'][:7]}  עומק {e['deep']*100:>3.0f}%  {st or '(לא עבר 30%)'}")

        a = run(ms, False); b = run(ms, True)
        print(f"\n     {'':<10}{'IRR':>9}{'נפילה':>10}{'% מוקפא':>10}")
        print(f"     {'רגיל':<10}{a[1]*100:>8.1f}%{a[2]*100:>9.1f}%{'—':>10}")
        print(f"     {'הקפאה':<10}{b[1]*100:>8.1f}%{b[2]*100:>9.1f}%{b[3]*100:>9.0f}%")
        print(f"     {'Δ':<10}{(b[1]-a[1])*100:>+8.2f}{(b[2]-a[2])*100:>+9.2f}")


if __name__ == '__main__':
    main()
