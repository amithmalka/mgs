"""**מנגנון ההקפאה — על כל עשר הקומבינציות.**

**הכלל, כפי שנוסח:**

  · רכיב שחוצה **‎−15% מהשיא** שלו — **קופא.** לא מקבל הפקדות.
    הכסף שלו זורם לשאר, לפי אותו כלל — כלומר **לרכיבים שירדו
    הכי הרבה מבין אלה שלא קפאו.**
  · **הוא חוזר באחד משלושה:**
      1. חצה **‎−30%** — זה משבר אמיתי, חוזרים להפקיד לפי האחוזים
      2. עברו **T חודשים** בלי שהגיע ל-‎−30% — הירידה נגמרה, חוזר
      3. התאושש מעל ‎−15% — חוזר

**ו-T נמדד ולא הונח.** ‏`levels.py` מדד את כל המעברים מ-‎−15%
ל-‎−30% בנתונים: **חציון 5 חודשים, טווח 2–9.** לכן `T=5`.

**ומה שהמדידה הזאת באמת בודקת** היא הימור אחד: ש**עצירת הקנייה
בתחילת נפילה שווה יותר מהקנייה שהיא מוותרת עליה.** זה מנוגד ללב
המנגנון — שקונה **יותר** כשנופל — ולכן זו בדיוק השאלה.

⚠️ הטריגר המקורי היה **יומי** (‎−15% ביום). אין נתונים יומיים,
ולכן כאן הוא חציית ‎−15% **מהשיא**, חודשית.

הרצה:  python3 scripts/freeze.py
"""
import io, json, re, subprocess

APP = 'https://wealth-simulator-p5m7ahdgx-amits-projects-ccb60ec7.vercel.app'
PX = {'SPXS': 'SPY', 'CSPX': 'SPY', 'MXWO': 'URTH', 'IWDA': 'URTH',
      'VWRA': 'VT', 'XLKS': 'XLK', 'WTEC': 'IXN', 'SMH': 'SMH'}
UP_CAP, DEPOSIT = 10.0, 1000.0
TRIG, DEEP, T = 0.15, 0.30, 5


def series(syms, years=25):
    url = f'{APP}/api/series?symbols={",".join(syms)}&years={years}'
    raw = subprocess.run(['curl', '-s', '-m', '90', url], capture_output=True, text=True).stdout
    d = json.loads(raw).get('series', {})
    return {k: {x['t']: x['a'] for x in (v.get('series') or [])} for k, v in d.items()}


def combos():
    s = io.open('src/constants/combos.ts', encoding='utf-8').read()
    b = s[s.index('const ALL_COMBOS'):s.index('export const COMBOS')]
    return [(m.group(1), [(k, int(w)) for k, w in re.findall(r"k: '(\w+)', w: (\d+)", m.group(2))])
            for m in re.finditer(r"track: '(\w+)'.*?parts: \[(.*?)\]", b, re.S)]


def split(ks, px, peak, dep):
    """הכלל: 10 קבוע בשיא, עומק הנפילה מתחת, היתרה לחלש ביותר."""
    if not ks:
        return {}
    rise = {k: (px[k] / peak[k] - 1) * 100 if peak[k] > 0 else 0.0 for k in ks}
    ask = {k: (UP_CAP if rise[k] >= 0 else -rise[k]) for k in ks}
    s = sum(ask.values())
    if s >= 100:
        return {k: dep * ask[k] / s for k in ks}
    al = {k: dep * ask[k] / 100 for k in ks}
    al[min(ks, key=lambda k: rise[k])] += dep * (100 - s) / 100
    return al


def run(parts, S, ts, freeze):
    syms = sorted({PX[k] for k, _ in parts})
    u = {k: 0.0 for k in syms}; peak = {k: 0.0 for k in syms}
    frozen = {k: None for k in syms}      # כמה חודשים הוא כבר קפוא
    hit30 = {k: False for k in syms}
    vals, pk, dd, froz_m = [], 0.0, 0.0, 0

    for t in ts:
        px = {k: S[k][t] for k in syms}
        for k in syms:
            peak[k] = max(peak[k], px[k])
        live = list(syms)
        if freeze:
            for k in syms:
                drop = 1 - px[k] / peak[k] if peak[k] else 0.0
                if frozen[k] is None:
                    if drop >= TRIG:
                        frozen[k] = 0; hit30[k] = False
                else:
                    frozen[k] += 1
                    if drop >= DEEP: hit30[k] = True
                    # חוזר: משבר אמיתי · פקיעת ההמתנה · או התאוששות
                    if hit30[k] or frozen[k] >= T or drop < TRIG:
                        frozen[k] = None
            live = [k for k in syms if frozen[k] is None]
            froz_m += len(syms) - len(live)

        al = split(live or syms, px, peak, DEPOSIT)
        for k, v in al.items():
            u[k] += v / px[k]
        val = sum(px[k] * u[k] for k in syms)
        vals.append(val); pk = max(pk, val); dd = min(dd, val / pk - 1)

    n = len(ts)
    lo, hi = -0.9, 1.0
    for _ in range(80):
        m = (lo + hi) / 2
        fv = sum(DEPOSIT * (1 + m) ** (n - i) for i in range(n))
        if fv < vals[-1]: lo = m
        else: hi = m
    return vals[-1], (1 + (lo + hi) / 2) ** 12 - 1, dd, froz_m / (n * len(syms))


def main():
    S = series(sorted(set(PX.values())))
    cs = combos()
    ts = sorted(set.intersection(*[set(S[k]) for k in set(PX.values())]))
    print(f"\n  חלון {ts[0]} → {ts[-1]} ({(len(ts)-1)/12:.1f} שנים) · "
          f"טריגר ‎−{TRIG:.0%} · מדרגה ‎−{DEEP:.0%} · T={T} חודשים\n")
    print(f"  {'#':<3}{'מסלול':<8}{'IRR רגיל':>10}{'IRR הקפאה':>11}{'Δ':>8}"
          f"{'נפילה':>9}{'→':>9}{'Δ':>8}{'% מוקפא':>10}")
    for i, (tr, parts) in enumerate(cs, 1):
        a = run(parts, S, ts, False)
        b = run(parts, S, ts, True)
        print(f"  {i:<3}{tr:<8}{a[1]*100:>9.1f}%{b[1]*100:>10.1f}%{(b[1]-a[1])*100:>+7.2f}"
              f"{a[2]*100:>8.1f}%{b[2]*100:>8.1f}%{(b[2]-a[2])*100:>+7.2f}{b[3]*100:>9.0f}%")


if __name__ == '__main__':
    main()
