"""**כמה עמוק כל נכס נפל, וכמה זמן לקח לו לחזור.**

**זה המספר שמכריע אם סולם נפילות עובד עליו.** נכס שנפל 60% וחזר
בשנה — כל מדרגה בסולם הייתה הזדמנות. נכס שנפל 60% ולוקח לו עשור —
**הכסף שנכנס במדרגה מת שם**, והסולם רק הגדיל את ההפסד.

וזה גם **הקריטריון שהקטלוג האירי נבנה עליו**: אף תמהיל בקטלוג לא
לקח יותר מ-23 חודשים לחזור לשיא. אותה אמת מידה, על המועמדים.

**מה שנמדד:** כל אפיזודת נפילה של 20% ומעלה — **עומק, כמה זמן ירד,
וכמה זמן לקח לחזור לשיא הקודם.** ואפיזודה שעדיין לא חזרה מסומנת
במפורש, כי **ממוצע שמתעלם ממנה משקר.**

⚠️ הנתונים חודשיים, ולכן הנפילה שנמדדת היא **מסגירה לסגירה** —
נפילה תוך־חודשית שלא נסגרה בה אינה נספרת. כלומר המספרים כאן
**שמרניים: הנפילה האמיתית עמוקה יותר.**

הרצה:  python3 scripts/recovery.py
"""
import json, subprocess

APP = 'https://wealth-simulator-p5m7ahdgx-amits-projects-ccb60ec7.vercel.app'
MIN_DD = 0.20
SYMS = ['SPY', 'XLK', 'SMH', 'SOXX', 'XLV', 'XLE', 'DIA', 'SPMO', 'BLOK', 'IBIT', 'QQQ']


def series(syms, years=25):
    url = f'{APP}/api/series?symbols={",".join(syms)}&years={years}'
    raw = subprocess.run(['curl', '-s', '-m', '90', url], capture_output=True, text=True).stdout
    return json.loads(raw).get('series', {})


def episodes(pts):
    """כל נפילה של MIN_DD ומעלה: (עומק, חודשים לתחתית, חודשים לחזרה)."""
    out = []
    peak = pts[0]['a']; pi = 0
    trough = peak; ti = 0
    inep = False
    for i, p in enumerate(pts):
        a = p['a']
        if a >= peak:
            if inep:
                out.append(dict(depth=1 - trough / peak, down=ti - pi,
                                back=i - ti, total=i - pi,
                                t0=pts[pi]['t'], tb=pts[ti]['t'], t1=p['t'],
                                done=True))
                inep = False
            peak = a; pi = i; trough = a; ti = i
            continue
        if a < trough:
            trough = a; ti = i
        if not inep and 1 - trough / peak >= MIN_DD:
            inep = True
    if inep:   # עדיין לא חזר
        out.append(dict(depth=1 - trough / peak, down=ti - pi,
                        back=len(pts) - 1 - ti, total=len(pts) - 1 - pi,
                        t0=pts[pi]['t'], tb=pts[ti]['t'], t1=pts[-1]['t'],
                        done=False))
    return out


def main():
    raw = series(SYMS)
    print(f"\n  נפילות של {MIN_DD:.0%} ומעלה · סגירות חודשיות · "
          f"⚠ = עדיין לא חזר לשיא\n")
    print(f"  {'נכס':<7}{'שנים':>6}{'נפילות':>8}{'הכי עמוק':>10}"
          f"{'חזרה הכי ארוכה':>16}{'חזרה חציונית':>14}   הפירוט")
    for s in SYMS:
        v = raw.get(s) or {}
        pts = v.get('series')
        if not pts or len(pts) < 24:
            print(f"  {s:<7}— {v.get('error','אין נתונים')}")
            continue
        eps = episodes(pts)
        yrs = (len(pts) - 1) / 12
        if not eps:
            print(f"  {s:<7}{yrs:>6.1f}{0:>8}{'—':>10}{'—':>16}{'—':>14}   לא ירד 20% מעולם")
            continue
        deep = max(e['depth'] for e in eps)
        done = [e['back'] for e in eps if e['done']]
        longest = max((e['back'] for e in eps), default=0)
        openq = any(not e['done'] for e in eps)
        med = sorted(done)[len(done) // 2] if done else None
        det = ' · '.join(
            f"−{e['depth']*100:.0f}%→{e['back']}ח״" + ('' if e['done'] else '⚠')
            for e in eps)
        print(f"  {s:<7}{yrs:>6.1f}{len(eps):>8}{deep*100:>9.0f}%"
              f"{str(longest)+'ח״'+('⚠' if openq else ''):>16}"
              f"{(str(med)+'ח״') if med is not None else '—':>14}   {det}")

    print(f"\n  ״−40%→18ח״״ = נפל 40% מהשיא, ולקח לו 18 חודשים מהתחתית בחזרה לשיא.")
    print(f"  לשם השוואה: **אף תמהיל בקטלוג האירי לא לקח יותר מ-23 חודשים.**")


if __name__ == '__main__':
    main()
