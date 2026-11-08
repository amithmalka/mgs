"""**כמה זמן לוקח לעבור ממדרגת נפילה אחת לבאה אחריה.**

זה ה-`T` של מנגנון ההקפאה: הרכיב חוצה ‎−15% מהשיא, ההפקדות נעצרות,
**וכמה מחכים?** התשובה היא כמה זמן לקח לו **בעבר** להגיע מ-‎−15%
ל-‎−30%. אם הזמן הזה עבר והוא לא הגיע — הירידה כנראה נגמרה,
וההפקדות חוזרות.

**מה שנמדד:** כל אפיזודה שבה הרכיב חצה ‎−15% מהשיא שלו, וממנה —
כמה חודשים עד ‎−30%, עד ‎−45%, עד ‎−60%. **ואפיזודה שלא הגיעה
למדרגה הבאה נספרת בנפרד**, כי היא המקרה שבו ההמתנה פוקעת וחוזרים
להפקיד — והיא בדיוק מה שקובע אם ההמתנה שווה את עצמה.

⚠️ **הנתונים חודשיים.** הטריגר שתיארת הוא **יומי** (‎−15% ביום),
ואי אפשר למדוד אותו כאן — `/api/prices` מוגבל ל-120 נרות. מה
שנמדד הוא חציית ‎−15% **מהשיא**, ברזולוציה חודשית. זה קירוב
לעיתוי, לא לטריגר עצמו.

⚠️ **והחלון מתחיל 12.2006** — שני הספקים חסומים ב-240 נקודות.
**הדוט-קום אינו כאן.** מה שיש: 2008, 2020, 2022, 2025.

הרצה:  python3 scripts/levels.py
"""
import json, subprocess
from statistics import median

APP = 'https://wealth-simulator-p5m7ahdgx-amits-projects-ccb60ec7.vercel.app'
SYMS = ['SPY', 'QQQ', 'XLK', 'SMH', 'SOXX', 'URTH']
LEVELS = [0.15, 0.30, 0.45, 0.60]


def series(syms, years=25):
    url = f'{APP}/api/series?symbols={",".join(syms)}&years={years}'
    raw = subprocess.run(['curl', '-s', '-m', '90', url], capture_output=True, text=True).stdout
    d = json.loads(raw).get('series', {})
    return {k: [(x['t'], x['a']) for x in (v.get('series') or [])] for k, v in d.items()}


def episodes(pts):
    """כל אפיזודה מרגע חציית 15%: מתי נחצתה כל מדרגה, ומה העומק המרבי.

    **אפיזודה נסגרת רק כשהמחיר חוזר לשיא** — לא כשהוא מתאושש חלקית.
    אחרת ירידה אחת ארוכה הייתה נספרת כחמש.
    """
    out = []
    peak = pts[0][1]; cur = None
    for t, a in pts:
        if a >= peak:
            if cur: out.append(cur); cur = None
            peak = a
            continue
        dd = 1 - a / peak
        if cur is None:
            if dd >= LEVELS[0]:
                cur = dict(t0=t, i=0, hit={LEVELS[0]: 0}, n=0, deep=dd)
        else:
            cur['n'] += 1
            cur['deep'] = max(cur['deep'], dd)
            for L in LEVELS[1:]:
                if dd >= L and L not in cur['hit']:
                    cur['hit'][L] = cur['n']
    if cur: out.append(cur)
    return out


def main():
    S = series(SYMS)
    print(f"\n  מעבר בין מדרגות נפילה · חודשים · מהרגע שנחצה ‎−15% מהשיא\n")
    print(f"  {'נכס':<7}{'אפיזודות':>10}{'→30%':>22}{'→45%':>18}{'→60%':>16}")
    allgaps = []
    for k in SYMS:
        pts = S.get(k) or []
        if len(pts) < 24:
            print(f"  {k:<7}— אין נתונים"); continue
        eps = episodes(pts)
        if not eps:
            print(f"  {k:<7}{0:>10}   לא חצה 15% מעולם"); continue
        cols = []
        for L in LEVELS[1:]:
            hits = [e['hit'][L] for e in eps if L in e['hit']]
            if hits:
                allgaps.extend(hits) if L == 0.30 else None
                cols.append(f"{median(hits):.0f}ח״ ({len(hits)}/{len(eps)})"
                            + (f" מקס {max(hits)}" if L == 0.30 else ""))
            else:
                cols.append(f"— (0/{len(eps)})")
        print(f"  {k:<7}{len(eps):>10}{cols[0]:>22}{cols[1]:>18}{cols[2]:>16}")

    print(f"\n  ── כל אפיזודה בנפרד ──")
    for k in SYMS:
        pts = S.get(k) or []
        eps = episodes(pts) if len(pts) > 24 else []
        if not eps: continue
        det = []
        for e in eps:
            steps = ' → '.join(f"{int(L*100)}%@{e['hit'][L]}ח״" for L in LEVELS if L in e['hit'])
            det.append(f"{e['t0'][:7]}: {steps} (עומק {e['deep']*100:.0f}%)")
        print(f"  {k:<7}" + ('\n' + ' ' * 9).join(det))

    if allgaps:
        print(f"\n  **ה-T שמתבקש מהנתונים:** חציון {median(allgaps):.0f} חודשים "
              f"מ-15% ל-30% · טווח {min(allgaps)}–{max(allgaps)}")
        print(f"  ומתוך כלל האפיזודות שחצו 15% — זה קרה רק בחלק מהן.")


if __name__ == '__main__':
    main()
