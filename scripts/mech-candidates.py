"""**מה כל מועמד עושה לתיק — כשמריצים עליו את מנגנון הקנייה האמיתי.**

**ולמה זה שונה ממדידת משקלות קבועים.** משקל קבוע קונה את אותו חלק
כל חודש. **המנגנון מטה לנופלים** — ולכן נכס תנודתי סופג **הרבה יותר
כסף מהמשקל שנקבע לו**, דווקא כשהוא נמוך. זה יכול להפוך נכס שנראה
גרוע בממוצע לתורם, או נכס שנראה טוב למסוכן.

**הכלל כאן הוא העתק מדויק של `utils/buySplit.ts`:**

    פער = max(0, משקל_יעד − משקל_בפועל) × (1 + נפילה_מהשיא × הטיה)
    חלק = פער / סך הפערים
    תקרה: אף רכיב לא מעל פי DIP_CAP ממשקל היעד, והעודף למי שיש לו מקום

**ומה שנמדד — לא רק התוצאה.** גם **כמה מההפקדות כל רכיב באמת קלט**,
כי זה הדבר שהפתיע במדידות קודמות: בלי תקרה, רכיב שירד 10% קלט 80%
מכל הפקדה. הטור הזה הוא מה שמגלה אם המשקל שנקבע הוא גם המשקל שקרה.

הרצה:  python3 scripts/mech-candidates.py
"""
import json, math, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
APP = 'https://wealth-simulator-p5m7ahdgx-amits-projects-ccb60ec7.vercel.app'

DIP_CAP = 3.0        # כמו בקוד
TILT    = 1.0        # 'both' — האמצעי משלושת המסלולים
DEPOSIT = 1000.0

# הליבה: שלושתם קיימים בקטלוג בגרסה אירית
BASE = {'SPY': .60, 'XLK': .20, 'SMH': .20}
CANDS = ['SPMO', 'SOXX', 'XLV', 'XLE', 'DIA', 'BLOK', 'IBIT']
ADD = .10


def series(syms, years=12):
    url = f'{APP}/api/series?symbols={",".join(syms)}&years={years}'
    raw = subprocess.run(['curl', '-s', '-m', '90', url], capture_output=True, text=True).stdout
    d = json.loads(raw).get('series', {})
    return {k: {x['t']: x['a'] for x in (v.get('series') or [])} for k, v in d.items()}


def split(target, px, peak, held, dep):
    """**הכלל, שורה בשורה כמו ב-buySplit.ts.**"""
    ks = list(target)
    pf = sum(px[k] * held[k] for k in ks) + dep
    gaps = []
    for k in ks:
        drop = max(0.0, 1 - px[k] / peak[k]) if peak[k] > 0 else 0.0
        cur = (px[k] * held[k] / pf) if pf > 0 else 0.0
        gaps.append(max(0.0, target[k] - cur) * (1 + drop * TILT))
    if sum(gaps) <= 0:
        gaps = [target[k] for k in ks]
    s = sum(gaps)
    share = [g / s for g in gaps]
    # התקרה, והעודף למי שיש לו מקום תחתיה
    over = 0.0
    for i, k in enumerate(ks):
        cap = target[k] * DIP_CAP
        if share[i] > cap:
            over += share[i] - cap; share[i] = cap
    if over > 1e-9:
        room = [max(0.0, target[k] * DIP_CAP - share[i]) for i, k in enumerate(ks)]
        rs = sum(room)
        if rs > 0:
            share = [share[i] + over * room[i] / rs for i in range(len(ks))]
    return {k: dep * share[i] for i, k in enumerate(ks)}


def run(target, S, ts):
    """מפקידים כל חודש לפי הכלל, ומודדים את התיק כולו."""
    ks = list(target)
    held = {k: 0.0 for k in ks}
    peak = {k: 0.0 for k in ks}
    got = {k: 0.0 for k in ks}
    paid = 0.0
    vals, pk, dd = [], 0.0, 0.0
    for t in ts:
        px = {k: S[k][t] for k in ks}
        for k in ks:
            peak[k] = max(peak[k], px[k])
        al = split(target, px, peak, held, DEPOSIT)
        for k in ks:
            held[k] += al[k] / px[k]; got[k] += al[k]
        paid += DEPOSIT
        v = sum(px[k] * held[k] for k in ks)
        vals.append(v)
        pk = max(pk, v)
        # הנפילה נמדדת מול השיא **בניכוי ההפקדות שנכנסו מאז** — אחרת
        # תיק שצובר לעולם לא "נופל", וזה היה מסתיר את הסיכון
        if pk > 0:
            dd = min(dd, v / pk - 1)
    n = len(ts)
    # IRR חודשי על זרם ההפקדות
    lo, hi = -0.9, 1.0
    for _ in range(80):
        mid = (lo + hi) / 2
        fv = sum(DEPOSIT * (1 + mid) ** (n - i) for i in range(n))
        # fv עולה עם הריבית: אם הוא קטן מהתוצאה בפועל — הריבית נמוכה מדי
        if fv < vals[-1]: lo = mid
        else: hi = mid
    irr = (1 + (lo + hi) / 2) ** 12 - 1
    return vals[-1], paid, irr, dd, {k: got[k] / paid for k in ks}


def main():
    syms = sorted(set(BASE) | set(CANDS))
    S = series(syms)
    missing = [k for k in syms if not S.get(k)]
    if missing:
        print(f'  אין נתונים ל: {missing}')

    def win(ks):
        t = None
        for k in ks:
            s = set(S[k]); t = s if t is None else t & s
        return sorted(t)

    print(f"\n  מנגנון הקנייה האמיתי · הטיה {TILT} · תקרה פי {DIP_CAP:.0f} · "
          f"{DEPOSIT:,.0f}$ לחודש\n")
    print(f"  {'תיק':<26}{'הופקד':>11}{'שווי סופי':>13}{'IRR':>8}{'נפילה':>9}{'חוד׳':>6}   מה כל רכיב קלט")
    for c in [None] + CANDS:
        ks = list(BASE) + ([c] if c else [])
        if c and not S.get(c):
            continue
        ts = win(ks)
        if len(ts) < 25:
            print(f"  {'+ ' + c:<26}— רק {len(ts)} חודשים משותפים")
            continue
        tgt = ({k: v * (1 - ADD) for k, v in BASE.items()} | {c: ADD}) if c else dict(BASE)
        val, paid, irr, dd, got = run(tgt, S, ts)
        lbl = 'בסיס בלבד' if not c else f'+ {c} ({ADD:.0%})'
        mix = ' · '.join(f"{k} {got[k]*100:.0f}%" for k in tgt)
        print(f"  {lbl:<26}{paid:>10,.0f}${val:>12,.0f}${irr*100:>7.1f}%{dd*100:>8.1f}%{len(ts):>6}   {mix}")

    print(f"\n  ״מה כל רכיב קלט״ = אחוז מסך ההפקדות שהמנגנון שלח אליו בפועל —")
    print(f"  ולא משקל היעד. הפער ביניהם הוא מה שהמנגנון עושה.")


if __name__ == '__main__':
    main()
