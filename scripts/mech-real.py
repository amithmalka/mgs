"""**הכלל של אמית — כפי שהוא, ועל אופקים קצרים וארוכים.**

**ושתי תיקונים למדידה הקודמת, שניהם מהותיים.**

**1 · הכלל היה שגוי.** ‏`mech-candidates.py` הריץ את `buySplit.ts` —
פער-ליעד כפול הטיה. **זה לא הכלל.** הכלל הוא:

    רכיב **בשיא** → 10% מההפקדה, **בלי קשר לכמה עלה**
    רכיב **מתחת לשיא** → אחוז הנפילה שלו
    **היתרה** → למי שהעלייה שלו הנמוכה ביותר

**וההבדל אינו טכני.** בפער-ליעד, רכיב שרץ נעשה overweight ומפסיק
לקבל כסף — ולכן SMH עם יעד 20% קלטה 9% בלבד. **בכלל הזה אין
משקלי יעד בכלל.** ההקצאה נקבעת **רק** לפי המרחק של כל רכיב
מהשיא שלו עצמו.

**ומכאן נובע דבר שצריך להיאמר במפורש:** בכלל הזה, **להוסיף נכס
לסל זה לתת לו תביעה שווה לכל השאר.** ״משקל 10%״ אינו קיים — נכס
שנמצא בסל מקבל 10% כשהוא בשיא, בדיוק כמו כל אחד אחר.

**2 · האופק.** ההמלצה ״לגזום רק משנה 25״ חסרת ערך למי שהתחיל
בגיל 50. ולכן כל מדידה כאן רצה גם על **10 ו-15 שנה** — ושם
התמונה שונה, כי לצבירה אין זמן להגיע לסף מס העיזבון.

הרצה:  python3 scripts/mech-real.py
"""
import json, os, subprocess

APP = 'https://wealth-simulator-p5m7ahdgx-amits-projects-ccb60ec7.vercel.app'
UP_CAP  = 10.0       # מה שרכיב בשיא מבקש, באחוזים
DEPOSIT = 1000.0
BASE  = ['SPY', 'XLK', 'SMH']
CANDS = ['SPMO', 'SOXX', 'XLV', 'XLE', 'DIA', 'BLOK', 'IBIT']


def series(syms, years=12):
    url = f'{APP}/api/series?symbols={",".join(syms)}&years={years}'
    raw = subprocess.run(['curl', '-s', '-m', '90', url], capture_output=True, text=True).stdout
    d = json.loads(raw).get('series', {})
    return {k: {x['t']: x['a'] for x in (v.get('series') or [])} for k, v in d.items()}


def split(ks, px, peak, dep):
    """**הכלל, כפי שנאמר.**

    בשיא — UP_CAP קבוע. מתחת לשיא — עומק הנפילה. והיתרה למי
    שהעלייה שלו הנמוכה ביותר, שהוא הנופל העמוק כשמישהו נפל ומי
    שעלה הכי פחות כשכולם בשיא. **שורה אחת מכסה את שני המקרים.**
    """
    rise = {k: (px[k] / peak[k] - 1) * 100 if peak[k] > 0 else 0.0 for k in ks}
    ask  = {k: (UP_CAP if rise[k] >= 0 else -rise[k]) for k in ks}
    s = sum(ask.values())
    target = min(ks, key=lambda k: rise[k])
    if s >= 100:
        return {k: dep * ask[k] / s for k in ks}
    al = {k: dep * ask[k] / 100 for k in ks}
    al[target] += dep * (100 - s) / 100
    return al


def run(ks, S, ts):
    held = {k: 0.0 for k in ks}; peak = {k: 0.0 for k in ks}
    got  = {k: 0.0 for k in ks}
    vals, pk, dd, paid = [], 0.0, 0.0, 0.0
    for t in ts:
        px = {k: S[k][t] for k in ks}
        for k in ks:
            peak[k] = max(peak[k], px[k])
        al = split(ks, px, peak, DEPOSIT)
        for k in ks:
            held[k] += al[k] / px[k]; got[k] += al[k]
        paid += DEPOSIT
        v = sum(px[k] * held[k] for k in ks)
        vals.append(v); pk = max(pk, v)
        dd = min(dd, v / pk - 1)
    n = len(ts)
    lo, hi = -0.9, 1.0
    for _ in range(80):
        mid = (lo + hi) / 2
        fv = sum(DEPOSIT * (1 + mid) ** (n - i) for i in range(n))
        if fv < vals[-1]: lo = mid
        else: hi = mid
    return vals[-1], paid, (1 + (lo + hi) / 2) ** 12 - 1, dd, {k: got[k] / paid for k in ks}


def main():
    S = series(sorted(set(BASE) | set(CANDS)))

    def win(ks, months=None):
        t = None
        for k in ks:
            s = set(S[k]); t = s if t is None else t & s
        t = sorted(t)
        return t[-months:] if months and len(t) > months else t

    for months, title in ((None, 'כל החלון שיש'), (180, '15 שנה'), (120, '10 שנה')):
        print(f"\n  ── {title} " + "─" * 58)
        print(f"  {'מוסיפים':<10}{'IRR בסיס':>10}{'IRR אחרי':>10}{'Δ':>8}"
              f"{'נפ׳ בסיס':>10}{'נפ׳ אחרי':>10}{'Δ':>8}{'חוד׳':>6}{'קלט':>7}")
        for c in CANDS:
            if not S.get(c): continue
            ts = win(BASE + [c], months)
            if len(ts) < 25:
                print(f"  {c:<10}— רק {len(ts)} חודשים"); continue
            b = run(BASE, S, ts)
            a = run(BASE + [c], S, ts)
            print(f"  {c:<10}{b[2]*100:>9.1f}%{a[2]*100:>9.1f}%{(a[2]-b[2])*100:>+7.2f}"
                  f"{b[3]*100:>9.1f}%{a[3]*100:>9.1f}%{(a[3]-b[3])*100:>+7.2f}"
                  f"{len(ts):>6}{a[4][c]*100:>6.0f}%")

    ts = win(BASE)
    r = run(BASE, S, ts)
    print(f"\n  הבסיס לבדו על {len(ts)} חודשים: IRR {r[2]*100:.1f}% · נפילה {r[3]*100:.1f}%")
    print(f"  ומה כל רכיב קלט: " + ' · '.join(f"{k} {r[4][k]*100:.0f}%" for k in BASE))


if __name__ == '__main__':
    main()
