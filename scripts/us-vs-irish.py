"""**לכל ETF אמריקאי — יש לו מקבילה אירית, ומה הפער בפועל.**

זו השאלה היחידה שנשארה פתוחה אחרי `us-trim.py`. שם נמדד שהמנגנון
הטוב ביותר עם רכיב אמריקאי מפסיד **12,018$** לקרן אירית טהורה, ושנקודת
האיזון היא **0.69% לשנה** — כלומר ה-ETF האמריקאי חייב להכות את המקבילה
האירית בשיעור הזה, כל שנה, רק כדי להגיע לתיקו.

**ולכן ההכרעה לכל טיקר היא בשתי שאלות:**

  1. יש מקבילה אירית? → אם כן, היא מנצחת כמעט תמיד.
  2. אם אין — האם הפער המדוד בתשואה **גדול מ-0.69% לשנה**?

**הנתונים נמשכים ולא מונחים.** ‏`/api/series` מחזיר סגירות חודשיות
**מתואמות דיבידנד** — וזה חשוב, כי הקרנות האיריות צוברות ולכן רק
תשואה כוללת משתווה אליהן.

**ואזהרה אחת שחייבת להיאמר על כל מספר שיוצא מכאן:** השוואה בין שתי
קרנות על **חלון זמן שונה** היא חסרת ערך. הסקריפט חותך את שתיהן
לחלון החופף בלבד, ואומר מהו.

הרצה:
    python3 scripts/us-vs-irish.py VOO QQQ VTI
"""
import json, subprocess, sys, re, io, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
APP = 'https://wealth-simulator-p5m7ahdgx-amits-projects-ccb60ec7.vercel.app'   # הדיפלוי הפרוס האחרון

BREAK_EVEN = 0.0069      # מ-us-trim.py


def catalogue():
    """הקרנות האיריות שבקטלוג, והקו האמריקאי שכל אחת עוקבת אחריו."""
    s = io.open(os.path.join(ROOT, 'src/constants/irish.ts'), encoding='utf-8').read()
    i = s.index('export const IRISH'); j = s.index('\n];', i) + 3
    out = []
    for p in re.split(r"\n  \{ k: '", s[i:j])[1:]:
        p = "{ k: '" + p
        g = lambda f, d='0': (lambda m: m.group(1) if m else d)(re.search(rf"\b{f}: '?([-\w.]+)'?", p))
        out.append(dict(k=g('k'), he=re.search(r"he: '([^']+)'", p).group(1),
                        us=g('us', ''), ter=float(g('ter')), tier=g('tier', '?'),
                        cagr=float(g('cagr')), vol=float(g('vol')), dd=float(g('dd'))))
    return out


def series(syms, years=10):
    """סגירות חודשיות מתואמות דיבידנד, דרך הנתיב הפרוס."""
    url = f'{APP}/api/series?symbols={",".join(syms)}&years={years}'
    raw = subprocess.run(['curl', '-s', '-m', '60', url],
                         capture_output=True, text=True).stdout
    try:
        return json.loads(raw).get('series', {})
    except Exception:
        return {}


def cagr_on(pts, months):
    """תשואה שנתית על `months` הנקודות האחרונות, מתואמת דיבידנד."""
    if not pts or len(pts) < months + 1:
        return None
    w = pts[-(months + 1):]
    a, b = w[0]['a'], w[-1]['a']
    if not (a > 0 and b > 0):
        return None
    return (b / a) ** (12 / months) - 1


def overlap(p1, p2):
    """**החלון המשותף בלבד.** בלי זה משווים תקופות שונות, וזה חסר ערך."""
    if not p1 or not p2:
        return None, None, None
    d1 = {x['t']: x['a'] for x in p1}
    d2 = {x['t']: x['a'] for x in p2}
    ts = sorted(set(d1) & set(d2))
    if len(ts) < 13:
        return None, None, None
    n = len(ts) - 1
    c1 = (d1[ts[-1]] / d1[ts[0]]) ** (12 / n) - 1
    c2 = (d2[ts[-1]] / d2[ts[0]]) ** (12 / n) - 1
    return c1, c2, (ts[0], ts[-1], n)


def main():
    tickers = [t.strip().upper() for t in sys.argv[1:] if t.strip()]
    if not tickers:
        print(__doc__); return

    cat = catalogue()
    by_us = {}
    for f in cat:
        by_us.setdefault(f['us'], []).append(f)

    # מושכים את הקו האמריקאי של כל טיקר שנשאל, ואת הקווים של הקטלוג
    want = sorted(set(tickers) | {f['us'] for f in cat if f['us']})
    data = series(want)

    print(f"\n  נקודת האיזון מ-us-trim.py: **{BREAK_EVEN*100:.2f}% לשנה**")
    print(f"  מתחת לזה — הקרן האירית מנצחת, גם עם המנגנון הטוב ביותר.\n")

    for tk in tickers:
        hit = by_us.get(tk, [])
        print(f"  ── {tk} " + "─" * (62 - len(tk)))
        if hit:
            names = ' · '.join(f"{f['k']} ({f['he']})" for f in hit)
            print(f"     **יש מקבילה אירית בקטלוג:** {names}")
            print(f"     אותו מדד בדיוק. → **קחו את האירית.** אין מה לשקול.")
        else:
            print(f"     **אין מקבילה בקטלוג** לקו הזה.")
            p = (data.get(tk) or {}).get('series')
            if not p:
                print(f"     ולא הצלחנו למשוך נתונים עבורו — "
                      f"{(data.get(tk) or {}).get('error', 'אין תשובה')}")
            else:
                for m, lbl in ((12, 'שנה'), (36, '3 שנים'), (60, '5 שנים')):
                    c = cagr_on(p, m)
                    if c is not None:
                        print(f"     {lbl:<9}{c*100:>7.1f}%")
                # ומול הליבה הרחבה שבקטלוג, על החלון החופף
                for core in ('VT', 'URTH', 'SPY'):
                    cp = (data.get(core) or {}).get('series')
                    a, b, win = overlap(p, cp)
                    if a is None:
                        continue
                    gap = a - b
                    verdict = ('שווה לשקול' if gap > BREAK_EVEN else
                               'לא מצדיק — מתחת לנקודת האיזון')
                    ieq = ' · '.join(f['k'] for f in by_us.get(core, [])) or core
                    print(f"     מול {core} ({ieq}): {a*100:+.1f}% מול {b*100:+.1f}% "
                          f"= **{gap*100:+.2f} נק׳** → {verdict}")
                    print(f"       (חלון חופף {win[0]} עד {win[1]}, {win[2]} חודשים)")
        print()


if __name__ == '__main__':
    main()
