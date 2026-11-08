"""**ניתוב בזמן קריסה — הכלל נשאר, רק היעד משתנה.**

**הכלל כפי שנוסח, ובדיוק:**

  · **מנגנון הקנייה נשאר כמו שהוא.** בעליות — עד 10% מההפקדה
    לרכיב. בירידות — לפי אחוז הנפילה.
  · **נפילה חודשית של מעל 10% ברכיב מסמנת קריסה.** מאותו רגע
    הרכיב **אינו מקבל כלום** —
  · **אלא אם הנפילה המצטברת שלו הגיעה למדרגה הבאה** (‎−20%,
    ואז ‎−30%, וכן הלאה). בחודש שבו נשברת מדרגה — הוא מקבל את
    חלקו לפי האחוזים, כרגיל.
  · **ובינתיים הכסף שלו מנותב לרכיב שנפל הכי פחות** — מבין אלה
    שאינם עצמם בקריסה.
  · הרכיב יוצא מקריסה כששובר שיא חדש.

**וזה ההפך מהכלל הרגיל, וזו כל הנקודה.** הכלל הרגיל שולח את
היתרה **לחלש ביותר**. כאן, כשרכיב קורס, הכסף הולך דווקא
**לחזק ביותר** — עד שהקריסה מאשרת את עצמה.

**מה שנמדד:** האם זה מטיב עם התשואה, ומה זה עושה לנפילה — על כל
אחת מהקומבינציות בקטלוג, ועל כל רכיב בנפרד.

⚠️ החלון 12.2006–11.2026 (240 נקודות, מגבלת הספק). **הדוט-קום
אינו כאן** — הוא נמדד בנפרד ב-`fred-crisis.py` על הנאסד״ק.

הרצה:  python3 scripts/crash-route.py
"""
import io, json, re, subprocess

APP = 'https://wealth-simulator-p5m7ahdgx-amits-projects-ccb60ec7.vercel.app'
PX = {'SPXS': 'SPY', 'CSPX': 'SPY', 'MXWO': 'URTH', 'IWDA': 'URTH',
      'VWRA': 'VT', 'XLKS': 'XLK', 'WTEC': 'IXN', 'SMH': 'SMH'}
UP_CAP, DEPOSIT = 10.0, 1000.0
CRASH_M = 0.10      # נפילה חודשית שמסמנת קריסה
STEP = 0.10         # כל כמה אחוזי עומק נפתחת מדרגה


def series(syms, years=25):
    url = f'{APP}/api/series?symbols={",".join(syms)}&years={years}'
    raw = subprocess.run(['curl', '-s', '-m', '90', url], capture_output=True, text=True).stdout
    d = json.loads(raw).get('series', {})
    return {k: {x['t']: x['a'] for x in (v.get('series') or [])} for k, v in d.items()}


def combos():
    s = io.open('src/constants/combos.ts', encoding='utf-8').read()
    b = s[s.index('const ALL_COMBOS'):s.index('export const COMBOS')]
    return [(m.group(1), sorted({PX[k] for k, _ in re.findall(r"k: '(\w+)', w: (\d+)", m.group(2))}))
            for m in re.finditer(r"track: '(\w+)'.*?parts: \[(.*?)\]", b, re.S)]


def base_split(ks, rise, dep):
    """הכלל הרגיל: 10 קבוע בשיא, עומק הנפילה מתחת, היתרה לחלש."""
    ask = {k: (UP_CAP if rise[k] >= 0 else -rise[k]) for k in ks}
    s = sum(ask.values())
    if s >= 100:
        return {k: dep * ask[k] / s for k in ks}
    al = {k: dep * ask[k] / 100 for k in ks}
    al[min(ks, key=lambda k: rise[k])] += dep * (100 - s) / 100
    return al


def run(ks, S, ts, route):
    u = {k: 0.0 for k in ks}; peak = {k: 0.0 for k in ks}
    prev = {k: None for k in ks}
    crash = {k: False for k in ks}; opened = {k: set() for k in ks}
    vals, pk, dd = [], 0.0, 0.0
    routed = 0.0

    for t in ts:
        px = {k: S[k][t] for k in ks}
        for k in ks:
            if px[k] > peak[k]:
                peak[k] = px[k]; crash[k] = False; opened[k] = set()
        rise = {k: (px[k] / peak[k] - 1) * 100 for k in ks}
        drop = {k: max(0.0, -rise[k] / 100) for k in ks}
        mret = {k: (px[k] / prev[k] - 1) if prev[k] else 0.0 for k in ks}
        for k in ks: prev[k] = px[k]

        al = base_split(ks, rise, DEPOSIT)

        if route:
            for k in ks:
                if not crash[k] and mret[k] <= -CRASH_M:
                    crash[k] = True
                    # המדרגות שכבר נחצו בעת הכניסה אינן נפתחות שוב
                    opened[k] = {round(STEP * i, 2) for i in range(1, 10)
                                 if drop[k] >= STEP * i}
            # מי שבקריסה מקבל רק בחודש שבו נשברת מדרגה חדשה
            freed = 0.0
            for k in ks:
                if not crash[k]: continue
                hit = [round(STEP * i, 2) for i in range(1, 10)
                       if drop[k] >= STEP * i and round(STEP * i, 2) not in opened[k]]
                if hit:
                    for L in hit: opened[k].add(L)
                else:
                    freed += al[k]; al[k] = 0.0
            if freed > 0:
                # **לרכיב שנפל הכי פחות ואינו בעצמו בקריסה**
                ok = [k for k in ks if not crash[k]]
                tgt = max(ok, key=lambda k: rise[k]) if ok else max(ks, key=lambda k: rise[k])
                al[tgt] += freed; routed += freed

        for k in ks:
            if al[k] > 0: u[k] += al[k] / px[k]
        v = sum(px[k] * u[k] for k in ks)
        vals.append(v); pk = max(pk, v); dd = min(dd, v / pk - 1)

    n = len(ts); lo, hi = -0.9, 1.0
    for _ in range(90):
        m = (lo + hi) / 2
        fv = sum(DEPOSIT * (1 + m) ** (n - i) for i in range(n))
        if fv < vals[-1]: lo = m
        else: hi = m
    return vals[-1], (1 + (lo + hi) / 2) ** 12 - 1, dd, routed / (n * DEPOSIT)


def main():
    S = series(sorted(set(PX.values())))
    ts = sorted(set.intersection(*[set(S[k]) for k in set(PX.values())]))
    print(f"\n  חלון {ts[0]} → {ts[-1]} ({(len(ts)-1)/12:.1f} שנים) · "
          f"קריסה = חודש של ‎−{CRASH_M:.0%} · מדרגות כל {STEP:.0%}\n")
    print(f"  {'#':<4}{'מסלול':<8}{'הסל':<26}{'רגיל':>8}{'ניתוב':>9}{'Δ':>8}"
          f"{'נפילה':>9}{'→':>9}{'Δ':>8}{'% נותב':>9}")
    seen = {}
    for i, (tr, ks) in enumerate(combos(), 1):
        key = tuple(ks)
        if key not in seen:
            a = run(ks, S, ts, False); b = run(ks, S, ts, True)
            seen[key] = (a, b)
        a, b = seen[key]
        print(f"  {i:<4}{tr:<8}{'·'.join(ks):<26}{a[1]*100:>7.1f}%{b[1]*100:>8.1f}%"
              f"{(b[1]-a[1])*100:>+7.2f}{a[2]*100:>8.1f}%{b[2]*100:>8.1f}%"
              f"{(b[2]-a[2])*100:>+7.2f}{b[3]*100:>8.0f}%")


if __name__ == '__main__':
    main()
