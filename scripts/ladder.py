"""**סולם נפילות לנכס תנודתי — במקום לתת לו את מנגנון האחוזים.**

**הבעיה שזה בא לפתור.** נמדד ב-`mech-real.py` שהכלל החודשי — 10%
בשיא, אחוז הנפילה מתחת — **שולח 55–58% מכל ההפקדות** לנכס שנפל
עמוק ולא חזר. ‏BLOK העמיק את נפילת התיק כולו מ-23.7% ל-45.1%.
**הכלל מצוין לנכס שנופל וחוזר, והרסני לנכס שנופל ונשאר.**

**הפתרון שנבדק כאן:** להוציא את הנכס התנודתי ממנגנון האחוזים
לגמרי, ולתת לו **סולם סגור של ארבע קניות חד־פעמיות**:

    נפל 20% מהשיא  →  קנייה אחת של 20% מההפקדה החודשית
    נפל 40%        →  קנייה אחת של 40%
    נפל 60%        →  קנייה אחת של 60%
    נפל 80%        →  קנייה אחת של 80%

**כל מדרגה נורית פעם אחת בלבד בכל מחזור**, והסולם **נדרך מחדש רק
כשהנכס שובר שיא חדש**. ומה שהסולם קונה מתוקצב **מתוך ההפקדה
החודשית** — מה שנשאר ממנה הולך לליבה לפי הכלל הרגיל.

**וזה מה שחוסם את התקלה:** החשיפה המצטברת למדרגות היא לכל היותר
**1.8 הפקדות חודשיות למחזור** — ולא 58% מכל מה שהופקד אי פעם.

**ומה שנמדד:** לא רק התוצאה, אלא גם **כמה באמת הוצא על הסולם**
וכמה מדרגות נורו — כי סולם שלא נורה אינו אסטרטגיה, הוא כוונה.

הרצה:  python3 scripts/ladder.py
"""
import json, subprocess

APP = 'https://wealth-simulator-p5m7ahdgx-amits-projects-ccb60ec7.vercel.app'
UP_CAP, DEPOSIT = 10.0, 1000.0
CORE = ['SPY', 'XLK', 'SMH']              # ממשיכים עם הכלל החודשי
TIERS = [0.20, 0.40, 0.60, 0.80]          # עומק הנפילה שמפעיל מדרגה
# כמה לקנות בכל מדרגה, כשבריר מהפקדה חודשית אחת
SIZE = {0.20: 0.20, 0.40: 0.40, 0.60: 0.60, 0.80: 0.80}
LADDER = ['IBIT', 'BLOK', 'XLE', 'XLV', 'SPMO', 'DIA', 'SOXX']


def series(syms, years=12):
    url = f'{APP}/api/series?symbols={",".join(syms)}&years={years}'
    raw = subprocess.run(['curl', '-s', '-m', '90', url], capture_output=True, text=True).stdout
    d = json.loads(raw).get('series', {})
    return {k: {x['t']: x['a'] for x in (v.get('series') or [])} for k, v in d.items()}


def split(ks, px, peak, dep):
    """הכלל החודשי — 10 קבוע בשיא, עומק הנפילה מתחת, היתרה לחלש."""
    rise = {k: (px[k] / peak[k] - 1) * 100 if peak[k] > 0 else 0.0 for k in ks}
    ask = {k: (UP_CAP if rise[k] >= 0 else -rise[k]) for k in ks}
    s = sum(ask.values())
    if s >= 100:
        return {k: dep * ask[k] / s for k in ks}
    al = {k: dep * ask[k] / 100 for k in ks}
    al[min(ks, key=lambda k: rise[k])] += dep * (100 - s) / 100
    return al


def run(S, ts, lad=None):
    """`lad` = הסימבול שמנוהל בסולם, או None לליבה בלבד."""
    ks = list(CORE)
    held = {k: 0.0 for k in ks}; peak = {k: 0.0 for k in ks}
    lu = lp = 0.0          # יחידות ושיא של נכס הסולם
    armed = set()          # מדרגות שכבר נורו במחזור הנוכחי
    spent = 0.0; fired = 0
    vals, pk, dd, paid = [], 0.0, 0.0, 0.0

    for t in ts:
        px = {k: S[k][t] for k in ks}
        for k in ks:
            peak[k] = max(peak[k], px[k])

        dep = DEPOSIT
        if lad:
            q = S[lad][t]
            if q > lp:
                lp = q
                armed.clear()          # **שיא חדש — הסולם נדרך מחדש**
            drop = 1 - q / lp if lp > 0 else 0.0
            for d in TIERS:
                if drop >= d and d not in armed:
                    armed.add(d)
                    amt = min(DEPOSIT * SIZE[d], dep)
                    if amt > 0:
                        lu += amt / q; spent += amt; dep -= amt; fired += 1

        al = split(ks, px, peak, dep)
        for k in ks:
            held[k] += al[k] / px[k]
        paid += DEPOSIT

        v = sum(px[k] * held[k] for k in ks) + (lu * S[lad][t] if lad else 0.0)
        vals.append(v); pk = max(pk, v); dd = min(dd, v / pk - 1)

    n = len(ts)
    lo, hi = -0.9, 1.0
    for _ in range(80):
        mid = (lo + hi) / 2
        fv = sum(DEPOSIT * (1 + mid) ** (n - i) for i in range(n))
        if fv < vals[-1]: lo = mid
        else: hi = mid
    irr = (1 + (lo + hi) / 2) ** 12 - 1
    lv = lu * S[lad][ts[-1]] if lad else 0.0
    return dict(val=vals[-1], irr=irr, dd=dd, spent=spent, fired=fired,
                lv=lv, paid=paid)


def main():
    S = series(sorted(set(CORE) | set(LADDER)))

    def win(ks):
        t = None
        for k in ks:
            s = set(S[k]); t = s if t is None else t & s
        return sorted(t)

    print(f"\n  סולם: " + ' · '.join(f"−{int(d*100)}% → {SIZE[d]:.0%} מהפקדה" for d in TIERS))
    print(f"  נדרך מחדש בכל שיא חדש. הליבה ({' · '.join(CORE)}) ממשיכה בכלל החודשי.\n")
    print(f"  {'נכס':<7}{'IRR בסיס':>10}{'IRR סולם':>10}{'Δ':>8}"
          f"{'נפ׳ בסיס':>10}{'נפ׳ סולם':>10}{'Δ':>8}{'הוצא':>10}{'שווי':>10}{'מדר׳':>6}{'חוד׳':>6}")
    for c in LADDER:
        if not S.get(c): continue
        ts = win(CORE + [c])
        if len(ts) < 25:
            print(f"  {c:<7}— רק {len(ts)} חודשים"); continue
        b = run(S, ts)
        a = run(S, ts, c)
        mult = a['lv'] / a['spent'] if a['spent'] > 0 else 0
        print(f"  {c:<7}{b['irr']*100:>9.1f}%{a['irr']*100:>9.1f}%{(a['irr']-b['irr'])*100:>+7.2f}"
              f"{b['dd']*100:>9.1f}%{a['dd']*100:>9.1f}%{(a['dd']-b['dd'])*100:>+7.2f}"
              f"{a['spent']:>9,.0f}${a['lv']:>9,.0f}${a['fired']:>6}{len(ts):>6}"
              + (f"   ×{mult:.1f}" if a['spent'] > 0 else "   לא נורה"))
    print(f"\n  ״הוצא״ = סך מה שהסולם קנה · ״שווי״ = כמה זה שווה בסוף · ×N = כמה הוכפל")
    print(f"  Δ נפילה חיובי = התיק נפל פחות. ההפקדה הכוללת זהה בשני התרחישים.")


if __name__ == '__main__':
    main()
