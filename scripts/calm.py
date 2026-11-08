"""**עוצרים כל עוד הנפילה מאיצה, וחוזרים כשהיא נרגעת.**

**הכלל כפי שנוסח:**

  · חודש שבו רכיב ירד **10% ומעלה** → ההפקדה אליו **נעצרת**.
  · היא **נשארת עצורה** כל עוד הנפילה החודשית הבאה היא **לפחות
    חצי מהקודמת** — כלומר הירידה עדיין בעיצומה.
  · **ברגע שהנפילה החודשית נרגעת** — קטנה מחצי מהקודמת, או
    שהחודש חיובי — **ההפקדות חוזרות**, בגודל שנקבע לפי
    **הנפילה המצטברת מהשיא**.

  הדוגמה שניתנה: ‏‎−10%, ואז עוד ‎−10% (אין הפקדות), ואז ‎−5% —
  זה חצי מהקודם, ולכן חוזרים להפקיד **25% מההפקדה החודשית**,
  שזה העומק המצטבר.

**ומה שמבדיל את זה מכל מה שנבדק קודם:** התנאי אינו על **העומק**
אלא על **הקצב**. כל הגרסאות הקודמות שאלו ״כמה ירדנו״; זו שואלת
״האם הירידה עדיין מאיצה״. וזה הגיוני — מה שמסוכן בנפילה אינו
העומק אלא שהיא עוד לא נגמרה.

**הכסף העצור זורם לשאר** לפי אותו כלל, כמו בגרסאות הקודמות.

הרצה:  python3 scripts/calm.py
"""
import io, json, re, subprocess

APP = 'https://wealth-simulator-p5m7ahdgx-amits-projects-ccb60ec7.vercel.app'
PX = {'SPXS': 'SPY', 'CSPX': 'SPY', 'MXWO': 'URTH', 'IWDA': 'URTH',
      'VWRA': 'VT', 'XLKS': 'XLK', 'WTEC': 'IXN', 'SMH': 'SMH'}
UP_CAP, DEPOSIT = 10.0, 1000.0
TRIG, CALM = 0.10, 0.5      # טריגר, ו״נרגעת״ = פחות מחצי מהקודמת


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
    if s >= 100: return {k: dep * ask[k] / s for k in ks}
    al = {k: dep * ask[k] / 100 for k in ks}
    al[min(ks, key=lambda k: rise[k])] += dep * (100 - s) / 100
    return al


def run(ks, S, ts, on):
    u = {k: 0.0 for k in ks}; cost = {k: 0.0 for k in ks}
    peak = {k: 0.0 for k in ks}; prev = {k: None for k in ks}
    dorm = {k: False for k in ks}; last = {k: 0.0 for k in ks}
    vals, pk, dd, held_m = [], 0.0, 0.0, 0

    for t in ts:
        px = {k: S[k][t] for k in ks}
        for k in ks:
            if px[k] > peak[k]: peak[k] = px[k]; dorm[k] = False
        rise = {k: (px[k] / peak[k] - 1) * 100 for k in ks}
        mret = {k: (px[k] / prev[k] - 1) if prev[k] else 0.0 for k in ks}
        for k in ks: prev[k] = px[k]

        al = split(ks, rise, DEPOSIT)

        if on:
            held = 0.0
            for k in ks:
                f = -mret[k]                       # גודל הנפילה החודשית
                if not dorm[k]:
                    if f >= TRIG:
                        dorm[k] = True; last[k] = f
                        held += al[k]; al[k] = 0.0; held_m += 1
                else:
                    if f >= last[k] * CALM:
                        # עדיין מאיצה — נשארים עצורים
                        last[k] = max(f, 0.0)
                        held += al[k]; al[k] = 0.0; held_m += 1
                    else:
                        # **נרגעה** — חוזרים, בגודל העומק המצטבר
                        dorm[k] = False
                        want = DEPOSIT * max(0.0, -rise[k] / 100)
                        if want < al[k]:
                            held += al[k] - want; al[k] = want
            if held > 0:
                calm = [k for k in ks if not dorm[k]]
                tgt = calm or ks
                w = split(tgt, rise, held)
                for k, v in w.items(): al[k] += v

        tot = sum(al.values())
        if tot > 0:
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
    return (vals[-1], (1 + (lo + hi) / 2) ** 12 - 1, dd,
            sum(px[k] * u[k] for k in ks) / sum(cost.values()), held_m / (n * len(ks)))


def main():
    S = series(sorted(set(PX.values())))
    for lbl, need in (('כולל 2008', ['SPY', 'XLK', 'SMH', 'IXN']),
                      ('כל הרכיבים', sorted(set(PX.values())))):
        ts = sorted(set.intersection(*[set(S[k]) for k in need]))
        print(f"\n  ══ {lbl} · {ts[0]} → {ts[-1]} ({(len(ts)-1)/12:.1f} שנים) ══\n")
        print(f"  {'הסל':<26}{'רגיל':>8}{'כלל הרגיעה':>11}{'Δ':>8}"
              f"{'נפילה':>9}{'→':>9}{'Δ':>8}{'מעל עלות':>11}{'→':>8}{'% עצור':>8}")
        for tr, ks in baskets():
            if not set(ks) <= set(need): continue
            a = run(ks, S, ts, False); b = run(ks, S, ts, True)
            print(f"  {'·'.join(ks):<26}{a[1]*100:>7.1f}%{b[1]*100:>10.1f}%{(b[1]-a[1])*100:>+7.2f}"
                  f"{a[2]*100:>8.1f}%{b[2]*100:>8.1f}%{(b[2]-a[2])*100:>+7.2f}"
                  f"{a[3]:>10.2f}×{b[3]:>7.2f}×{b[4]*100:>7.0f}%")


if __name__ == '__main__':
    main()
