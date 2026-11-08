"""**הנחתה במקום הקפאה — הכלל ממשיך, רק המשקל משתנה.**

**הכלל כפי שנוסח:**

  · הכל ממשיך כרגיל. **אין הקפאה ואין דילוג.**
  · חודש שבו רכיב ירד **מעל 10%** → ההפקדה אליו יורדת ל-**שליש**.
  · וככל שהוא ממשיך לרדת **בהכפלות** — ‎−20%, ‎−40%, ‎−80% —
    **מוסיפים עוד שליש בכל מדרגה:** ⅓ → ⅔ → 1 → 4/3.
  · **מפקידים ברצף, כל חודש.**
  · חזרה לשיא מאפסת את ההנחתה.

**ולמה זה שונה מכל מה שנמדד עד כה.** כל הגרסאות הקודמות **ויתרו
על קניות** — וזה בדיוק מה שהרס את הממוצע: ‏`step10.py` החמיר את
הממוצע של XLK ב-32%, כי ברוב המקרים ‎−10% לא המשיך והקנייה
שדילגנו עליה הייתה זולה. **כאן לא מוותרים על אף קנייה** — רק
דוחים משקל מהזעזוע הראשון אל העומק, שם הוא שווה יותר.

**והכסף שהונחת אינו נעלם** — הוא זורם לשאר הרכיבים לפי אותו כלל,
כלומר למי שנפל הכי הרבה מביניהם.

הרצה:  python3 scripts/taper.py
"""
import io, json, re, subprocess

APP = 'https://wealth-simulator-p5m7ahdgx-amits-projects-ccb60ec7.vercel.app'
PX = {'SPXS': 'SPY', 'CSPX': 'SPY', 'MXWO': 'URTH', 'IWDA': 'URTH',
      'VWRA': 'VT', 'XLKS': 'XLK', 'WTEC': 'IXN', 'SMH': 'SMH'}
UP_CAP, DEPOSIT = 10.0, 1000.0
TRIG = 0.10
DOUBLES = [0.10, 0.20, 0.40, 0.80]      # ההכפלות
THIRD = 1 / 3


def series(syms, years=25):
    url = f'{APP}/api/series?symbols={",".join(syms)}&years={years}'
    raw = subprocess.run(['curl', '-s', '-m', '90', url], capture_output=True, text=True).stdout
    d = json.loads(raw).get('series', {})
    return {k: {x['t']: x['a'] for x in (v.get('series') or [])} for k, v in d.items()}


def baskets():
    s = io.open('src/constants/combos.ts', encoding='utf-8').read()
    b = s[s.index('const ALL_COMBOS'):s.index('export const COMBOS')]
    out = []
    for m in re.finditer(r"track: '(\w+)'.*?parts: \[(.*?)\]", b, re.S):
        ks = sorted({PX[k] for k, _ in re.findall(r"k: '(\w+)', w: (\d+)", m.group(2))})
        if ks not in [o[1] for o in out]: out.append((m.group(1), ks))
    return out


def split(ks, rise, dep):
    ask = {k: (UP_CAP if rise[k] >= 0 else -rise[k]) for k in ks}
    s = sum(ask.values())
    if s >= 100:
        return {k: dep * ask[k] / s for k in ks}
    al = {k: dep * ask[k] / 100 for k in ks}
    al[min(ks, key=lambda k: rise[k])] += dep * (100 - s) / 100
    return al


def run(ks, S, ts, taper):
    u = {k: 0.0 for k in ks}; cost = {k: 0.0 for k in ks}
    peak = {k: 0.0 for k in ks}; prev = {k: None for k in ks}
    on = {k: False for k in ks}
    vals, pk, dd = [], 0.0, 0.0

    for t in ts:
        px = {k: S[k][t] for k in ks}
        for k in ks:
            if px[k] > peak[k]: peak[k] = px[k]; on[k] = False
        rise = {k: (px[k] / peak[k] - 1) * 100 for k in ks}
        drop = {k: max(0.0, -rise[k] / 100) for k in ks}
        mret = {k: (px[k] / prev[k] - 1) if prev[k] else 0.0 for k in ks}
        for k in ks: prev[k] = px[k]

        al = split(ks, rise, DEPOSIT)

        if taper:
            for k in ks:
                if mret[k] <= -TRIG: on[k] = True
            held = 0.0
            for k in ks:
                if not on[k]: continue
                # ⅓ בזעזוע הראשון, ועוד ⅓ בכל הכפלת עומק
                steps = sum(1 for L in DOUBLES if drop[k] >= L)
                f = min(1.0 + THIRD, THIRD * max(1, steps))
                cut = al[k] * (1 - f)
                if cut > 0: held += cut; al[k] -= cut
                elif cut < 0: al[k] -= cut   # f>1 — מקבל יותר, על חשבון השאר
            if held > 0:
                calm = [k for k in ks if not on[k]]
                if calm:
                    w = split(calm, rise, held)
                    for k, v in w.items(): al[k] += v
                else:
                    al[min(ks, key=lambda k: rise[k])] += held

        tot = sum(al.values())
        if tot > 0:                      # נרמול — ההפקדה החודשית קבועה
            al = {k: v * DEPOSIT / tot for k, v in al.items()}
        for k in ks:
            if al[k] > 0: u[k] += al[k] / px[k]; cost[k] += al[k]
        v = sum(px[k] * u[k] for k in ks)
        vals.append(v); pk = max(pk, v); dd = min(dd, v / pk - 1)

    n = len(ts); lo, hi = -0.9, 1.0
    for _ in range(90):
        m = (lo + hi) / 2
        fv = sum(DEPOSIT * (1 + m) ** (n - i) for i in range(n))
        if fv < vals[-1]: lo = m
        else: hi = m
    # יחס המחיר לעלות הממוצעת — הקובע מתי מותר למשוך
    ratio = sum(px[k] * u[k] for k in ks) / sum(cost.values())
    return vals[-1], (1 + (lo + hi) / 2) ** 12 - 1, dd, ratio


def main():
    S = series(sorted(set(PX.values())))
    ts = sorted(set.intersection(*[set(S[k]) for k in set(PX.values())]))
    print(f"\n  חלון {ts[0]} → {ts[-1]} ({(len(ts)-1)/12:.1f} שנים) · "
          f"טריגר ‎−{TRIG:.0%} חודשי · ⅓ ואז הכפלות\n")
    print(f"  {'הסל':<26}{'רגיל':>8}{'הנחתה':>9}{'Δ':>8}"
          f"{'נפילה':>9}{'→':>9}{'Δ':>8}{'מעל עלות':>11}{'→':>8}")
    for tr, ks in baskets():
        a = run(ks, S, ts, False); b = run(ks, S, ts, True)
        print(f"  {'·'.join(ks):<26}{a[1]*100:>7.1f}%{b[1]*100:>8.1f}%{(b[1]-a[1])*100:>+7.2f}"
              f"{a[2]*100:>8.1f}%{b[2]*100:>8.1f}%{(b[2]-a[2])*100:>+7.2f}"
              f"{a[3]:>10.2f}×{b[3]:>7.2f}×")


if __name__ == '__main__':
    main()
