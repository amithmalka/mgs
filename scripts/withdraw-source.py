"""**האם סולם הנפילות נותן מקור משיכה כשהליבה חסומה.**

**וזו המטרה הנכונה — שפספסתי קודם.** מדדתי תשואה ונפילה, ושאלתי
אם הסולם ״משתלם״. **אבל המטרה שלו אחרת לגמרי:** כלל המשיכה במערכת
מוכר **רק רכיב שמחירו מעל מחיר הקנייה הממוצע**, כדי שמשיכה לא תנעל
הפסד. ולכן בחודש שבו כל רכיבי הליבה מתחת לעלות שלהם — **אין מה
למשוך בכלל.**

**והסולם קונה רק ב-−20/−40/−60/−80 מהשיא.** כלומר העלות הממוצעת
שלו נמוכה באופן קיצוני, **והוא כמעט תמיד מעל העלות** — דווקא
כשהליבה מתחת לה.

**מה שנמדד כאן:**
  · כמה מחודשי המשיכה היו **חסומים לגמרי** בלי הסולם
  · בכמה מהם **הסולם היה זמין** והציל את החודש
  · וכמה כסף הוא היה יכול לספק

⚠️ הנתונים חודשיים, ולכן ״חסום״ נמדד בסגירת החודש. חסימה שנפתחה
ונסגרה בתוך החודש אינה נספרת.

הרצה:  python3 scripts/withdraw-source.py
"""
import json, subprocess

APP = 'https://wealth-simulator-p5m7ahdgx-amits-projects-ccb60ec7.vercel.app'
UP_CAP, DEPOSIT = 10.0, 1000.0
CORE = ['SPY', 'XLK', 'SMH']
LAD = ['XLE', 'XLV', 'DIA', 'SOXX', 'BLOK', 'IBIT', 'SPMO']
TIERS = [0.20, 0.40, 0.60, 0.80]
DRAW = 0.04          # שיעור המשיכה השנתי
ACC_SHARE = 0.5      # חצי מהחלון צבירה, חצי משיכה


def series(syms, years=25):
    url = f'{APP}/api/series?symbols={",".join(syms)}&years={years}'
    raw = subprocess.run(['curl', '-s', '-m', '90', url], capture_output=True, text=True).stdout
    d = json.loads(raw).get('series', {})
    return {k: {x['t']: x['a'] for x in (v.get('series') or [])} for k, v in d.items()}


def split(ks, px, peak, dep):
    rise = {k: (px[k] / peak[k] - 1) * 100 if peak[k] > 0 else 0.0 for k in ks}
    ask = {k: (UP_CAP if rise[k] >= 0 else -rise[k]) for k in ks}
    s = sum(ask.values())
    if s >= 100:
        return {k: dep * ask[k] / s for k in ks}
    al = {k: dep * ask[k] / 100 for k in ks}
    al[min(ks, key=lambda k: rise[k])] += dep * (100 - s) / 100
    return al


def run(S, ts, lads):
    """צבירה ואז משיכה. מחזיר ספירת חודשים חסומים עם הסולם ובלעדיו."""
    u = {k: 0.0 for k in CORE}; c = {k: 0.0 for k in CORE}
    peak = {k: 0.0 for k in CORE}
    lu = {k: 0.0 for k in lads}; lc = {k: 0.0 for k in lads}
    lp = {k: 0.0 for k in lads}; armed = {k: set() for k in lads}
    cut = int(len(ts) * ACC_SHARE)
    blocked_core = blocked_all = draws = 0
    rescued_by = {k: 0 for k in lads}
    lad_avail = 0.0

    for i, t in enumerate(ts):
        px = {k: S[k][t] for k in CORE}
        for k in CORE:
            peak[k] = max(peak[k], px[k])

        if i < cut:                       # ───── צבירה ─────
            dep = DEPOSIT
            for k in lads:
                q = S[k][t]
                if q > lp[k]:
                    lp[k] = q; armed[k].clear()
                drop = 1 - q / lp[k] if lp[k] > 0 else 0.0
                for d in TIERS:
                    if drop >= d and d not in armed[k]:
                        armed[k].add(d)
                        amt = min(DEPOSIT * d, dep)
                        if amt > 0:
                            lu[k] += amt / q; lc[k] += amt; dep -= amt
            al = split(CORE, px, peak, dep)
            for k in CORE:
                u[k] += al[k] / px[k]; c[k] += al[k]
            continue

        # ───── משיכה ─────
        draws += 1
        okc = [k for k in CORE if u[k] > 0 and px[k] > c[k] / u[k]]
        okl = [k for k in lads if lu[k] > 0 and S[k][t] > lc[k] / lu[k]]
        if not okc:
            blocked_core += 1
            if okl:
                for k in okl: rescued_by[k] += 1
                lad_avail += sum(lu[k] * S[k][t] for k in okl)
            else:
                blocked_all += 1
        # המשיכה עצמה — פרו־רטה מהזכאים, ליבה קודם
        port = sum(px[k] * u[k] for k in CORE) + sum(lu[k] * S[k][t] for k in lads)
        need = port * DRAW / 12
        src = okc or okl
        if src and need > 0:
            pool = sum((px[k] * u[k]) if k in CORE else (lu[k] * S[k][t]) for k in src)
            take = min(need, pool)
            for k in src:
                v = (px[k] * u[k]) if k in CORE else (lu[k] * S[k][t])
                sh = (v / pool) * take
                if k in CORE:
                    u[k] -= sh / px[k]; c[k] -= c[k] * (sh / v) if v else 0
                else:
                    lu[k] -= sh / S[k][t]; lc[k] -= lc[k] * (sh / v) if v else 0
    return draws, blocked_core, blocked_all, rescued_by, lad_avail


def main():
    S = series(sorted(set(CORE) | set(LAD)))
    ts = sorted(set.intersection(*[set(S[k]) for k in CORE + [l for l in LAD if S.get(l)]]))
    lads = [l for l in LAD if S.get(l)]
    print(f"\n  חלון {ts[0]} → {ts[-1]} · צבירה {int(len(ts)*ACC_SHARE)} חודשים, "
          f"אחר כך משיכה {DRAW:.0%} לשנה\n")

    d, bc, ba, _, _ = run(S, ts, [])
    print(f"  **בלי סולם:** {d} חודשי משיכה · **{bc} חסומים לגמרי** "
          f"({bc/d*100:.0f}%) — כל רכיבי הליבה מתחת לעלות")

    d, bc, ba, resc, avail = run(S, ts, lads)
    print(f"  **עם סולם:**  {d} חודשי משיכה · {bc} שבהם הליבה חסומה · "
          f"**{ba} נשארו בלי מקור** ({ba/d*100:.0f}%)")
    saved = bc - ba
    print(f"\n  ← הסולם הציל **{saved} מתוך {bc}** החודשים החסומים "
          f"({saved/bc*100:.0f}%)" if bc else "\n  ← הליבה לא נחסמה אף פעם")
    if saved:
        print(f"     וסיפק בממוצע {avail/max(1,saved):,.0f}$ זמינים בכל חודש כזה")
    print(f"\n  {'מי היה זמין':<10}{'חודשים':>9}")
    for k, n in sorted(resc.items(), key=lambda x: -x[1]):
        if n: print(f"  {k:<10}{n:>9}")


if __name__ == '__main__':
    main()
