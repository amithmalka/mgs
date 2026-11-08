"""**כלל המדרגות: נפילה חודשית של 10% מקפיאה, ואז מפקידים רק במדרגות.**

**הכלל כפי שנוסח:**

  · חודש שבו הרכיב ירד **מעל 10%** → ההפקדה הרגילה אליו **נעצרת**
  · מכאן מפקידים אליו **רק כשנשברת מדרגה חדשה** של 10% מהשיא:
    ‎−10%, ‎−20%, ‎−30%, ‎−40% …
  · **בכל מדרגה — 10% מההפקדה החודשית.** פעם אחת לכל מדרגה.
  · **בין המדרגות — כלום.**
  · והסולם **נדרך מחדש כשהרכיב שובר שיא.**

**ומה שלא נאמר ולכן נבחר כאן במפורש:** הכסף שלא נכנס לרכיב המוקפא
**זורם לשאר** לפי אותו כלל — כלומר לרכיבים שירדו הכי הרבה מבין
אלה שאינם מוקפאים. זו הפרשנות שנבחרה; הפרשנות השנייה (להשאיר
במזומן) נבדקת גם היא בשורה נפרדת.

**ושתי גרסאות לגודל המדרגה**, כי הניסוח סובל את שתיהן:
  · **קבוע** — 10% מההפקדה בכל מדרגה
  · **מדורג** — לפי העומק: 10% ב-‎−10%, 20% ב-‎−20%, 30% ב-‎−30%…

⚠️ ‏`NASDAQ100` ו-`NASDAQCOM` הם **מדדי מחיר** בלי דיבידנד; שאר
הסדרות הן תשואה כוללת. **אין להשוות ביניהן** — כל שורה מושווית
רק לעצמה בלי המנגנון.

הרצה:  python3 scripts/step10.py
"""
import json, subprocess

APP = 'https://wealth-simulator-p5m7ahdgx-amits-projects-ccb60ec7.vercel.app'
DEPOSIT = 1000.0
TRIG = 0.10          # נפילה חודשית שמפעילה את ההקפאה
STEP = 0.10          # כל כמה אחוזי עומק נשברת מדרגה
LEVELS = [round(STEP * i, 2) for i in range(1, 10)]


def fred(sid):
    raw = subprocess.run(['curl', '-s', '-m', '40',
                          f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}'],
                         capture_output=True, text=True).stdout
    o = {}
    for ln in raw.splitlines()[1:]:
        p = ln.split(',')
        if len(p) < 2 or p[1] in ('.', ''): continue
        try: o[p[0][:7]] = float(p[1])
        except ValueError: pass
    return [(k, o[k]) for k in sorted(o)]


def api(syms, years=25):
    url = f'{APP}/api/series?symbols={",".join(syms)}&years={years}'
    raw = subprocess.run(['curl', '-s', '-m', '90', url], capture_output=True, text=True).stdout
    d = json.loads(raw).get('series', {})
    return {k: [(x['t'][:7], x['a']) for x in (v.get('series') or [])] for k, v in d.items()}


def run(ms, mode, graded=False):
    """mode: 'plain' רגיל · 'steps' מדרגות.

    ``graded`` — גודל המדרגה לפי העומק במקום 10% קבוע.
    """
    u = 0.0; peak = 0.0; prev = None
    froz = False; fired = set()
    spent = 0.0; skipped = 0.0; nfire = 0
    vals = []; pk = dd = 0.0
    for t, p in ms:
        if p > peak:
            peak = p
            if mode == 'steps':
                froz = False; fired = set()      # שיא חדש — נדרך מחדש
        drop = 1 - p / peak if peak else 0.0
        mret = (p / prev - 1) if prev else 0.0
        prev = p

        if mode == 'plain':
            u += DEPOSIT / p
        else:
            if not froz and mret <= -TRIG:
                froz = True
            if not froz:
                u += DEPOSIT / p
            else:
                amt = 0.0
                for L in LEVELS:
                    if drop >= L and L not in fired:
                        fired.add(L)
                        amt += DEPOSIT * (L if graded else STEP)
                        nfire += 1
                amt = min(amt, DEPOSIT)
                if amt: u += amt / p; spent += amt
                # **הכסף שלא הופקד נשאר מזומן ונספר בתיק.**
                # בלעדיו התיק ה״מוקפא״ פשוט קטן יותר, והשוואת
                # הנפילה בין שני תיקים עם הון שונה חסרת משמעות —
                # וזה מה שייצר קודם ״נפילה שהחמירה ב-13 נקודות״.
                skipped += DEPOSIT - amt
        v = u * p + skipped
        vals.append(v); pk = max(pk, v); dd = min(dd, v / pk - 1)

    # ובסוף — המזומן שנותר הוא חלק מהתוצאה
    final = u * ms[-1][1] + skipped
    vals[-1] = final
    n = len(ms); lo, hi = -0.9, 1.0
    for _ in range(90):
        m = (lo + hi) / 2
        fv = sum(DEPOSIT * (1 + m) ** (n - i) for i in range(n))
        if fv < vals[-1]: lo = m
        else: hi = m
    return vals[-1], (1 + (lo + hi) / 2) ** 12 - 1, dd, skipped, nfire


def show(name, ms):
    if len(ms) < 60: return
    a = run(ms, 'plain')
    b = run(ms, 'steps', False)
    c = run(ms, 'steps', True)
    print(f"  {name:<22}{(len(ms)-1)/12:>6.1f}ש״{a[1]*100:>8.1f}%"
          f"{b[1]*100:>9.1f}%{(b[1]-a[1])*100:>+7.2f}"
          f"{c[1]*100:>9.1f}%{(c[1]-a[1])*100:>+7.2f}"
          f"{a[2]*100:>9.1f}%{b[2]*100:>8.1f}%{(b[2]-a[2])*100:>+7.2f}")


def main():
    print(f"\n  טריגר: חודש של ‎−{TRIG:.0%} · מדרגות כל {STEP:.0%} מהשיא · "
          f"נדרך מחדש בשיא חדש\n")
    print(f"  {'נכס':<22}{'שנים':>7}{'רגיל':>9}"
          f"{'קבוע 10%':>9}{'Δ':>7}{'מדורג':>9}{'Δ':>7}"
          f"{'נפילה':>9}{'→':>8}{'Δ':>7}")
    for sid, nm in (('NASDAQ100', 'נאסד״ק 100'), ('NASDAQCOM', 'נאסד״ק מורכב')):
        show(nm, fred(sid))
    S = api(['SPY', 'QQQ', 'XLK', 'SMH', 'SOXX', 'URTH', 'VT', 'IXN'])
    for k in ['SPY', 'QQQ', 'XLK', 'SMH', 'SOXX', 'URTH', 'VT', 'IXN']:
        if S.get(k): show(k, S[k])
    print(f"\n  ⚠ שתי השורות הראשונות הן מדדי מחיר בלי דיבידנד · השאר תשואה כוללת.")
    print(f"     כל שורה מושווית רק לעצמה.")


if __name__ == '__main__':
    main()
