"""**האם שווה להחזיק ETF אמריקאי ולגזום אותו בכל שיא — במקום קרן אירית.**

השאלה שנבדקת: לערבב תעודות סל אמריקאיות ואיריות, וכש**התעודה
האמריקאית שוברת שיא כל הזמנים** למכור ממנה עד שנשארים ~45 אלף דולר,
כדי שהחשיפה למס עיזבון תישאר מתחת לפטור של 60 אלף.

**שלוש עובדות שקובעות את החשבון, ושתיים מהן מפתיעות.**

1. **סעיף 88 חל גם על ETF אמריקאי.** הסעיף נקבע לפי **המטבע שבו
   הנייר נקוב** ולא לפי מקום ההתאגדות — ‏`withdrawTax.ts` מחשב לפי
   `currency`. ‏ETF אמריקאי נקוב בדולר, ולכן הרווח שלו **ריאלי**
   ועליית הדולר אינה ממוסה. **זה מוזיל את המנגנון משמעותית** לעומת
   ההנחה שהרווח נומינלי.

2. **‏ETF אמריקאי אינו יכול לצבור דיבידנד.** החוק האמריקאי מחייב
   אותו **לחלק**. כלומר כל שנה מתקבל דיבידנד, נגבה ממנו ניכוי
   במקור, ומשולם עליו מס בישראל — **אירוע מס שנתי שאי אפשר לדחות.**
   קרן אירית צוברת דוחה את הכל עד המכירה. **זה הפער האמיתי, והוא
   עובד כל שנה ולא רק בגזימה.**

3. **והגזימה חותכת דווקא את מה שעובד.** שיאי כל הזמנים **מתקבצים**:
   מדד במגמת עלייה שובר שיא שוב ושוב. כלומר הגזימה מופעלת בדיוק
   בתקופות שבהן התיק מצמיח הכי מהר, **והיא מקפיאה את הרכיב
   האמריקאי על ~45 אלף לנצח.** מי שמפקיד 30 שנה לא ייהנה מהצמיחה
   של הרכיב הזה כמעט בכלל — רק מ-45 אלף דולר ממנו.

**מה שנמדד כאן** הוא שלוש חלופות על אותה תשואה גולמית בדיוק, כך
שההפרש הוא **רק המבנה** ולא מזל:

  A · הכל בקרן אירית צוברת
  B · מעורב, עם גזימה בכל שיא (ההצעה)
  C · מעורב, בלי גזימה — ומשלמים מס עיזבון בסוף

הרצה:  python3 scripts/us-trim.py
"""
import random

# ─────────────────────────── הנחות, כולן פרמטרים ───────────────────────────
YEARS       = 30
DEPOSIT_USD = 1000        # הפקדה חודשית בדולר
US_SHARE    = 0.50        # כמה מההפקדה מופנה לרכיב האמריקאי בתרחישים B/C

GROSS       = 0.08        # תשואה כוללת שנתית (מחיר + דיבידנד)
DIV_YIELD   = 0.015       # מזה דיבידנד — ולכן תשואת המחיר היא GROSS-DIV_YIELD
VOL         = 0.16        # תנודתיות שנתית

TER_IE      = 0.0007      # דמי ניהול קרן אירית
TER_US      = 0.0003      # ‏ETF אמריקאי — בדרך כלל זול יותר, וזה היתרון שלו

CGT         = 0.25        # מס רווח הון בישראל
US_WHT      = 0.25        # ניכוי במקור אמריקאי על דיבידנד למשקיע ישראלי.
                          # **פרמטר, לא עובדה מאומתת** — נבדק גם ב-0.15.

TRIM_HIGH   = 50_000      # מעל זה — גוזמים
TRIM_LOW    = 45_000      # ואל זה חוזרים
ESTATE_FREE = 60_000      # הפטור ממס עיזבון
ESTATE_RATE = 0.30        # שיעור אפקטיבי על העיזבון מעל הפטור (עד 40% שולי)

PATHS       = 4000
SEED        = 11


def run(mode, r):
    """mode: 'IE' הכל אירי · 'TRIM' מעורב עם גזימה · 'HOLD' מעורב בלי.

    מחזיר (שווי נטו אחרי מס בסוף, מס שנצבר בדרך, חשיפת עיזבון בסוף).
    כל הסכומים בדולר — שער החליפין יוצא מהחשבון, כי סעיף 88 מחשב
    את הרווח **במטבע הנייר** ולכן הוא אינו משפיע על המס.
    """
    mu_price = GROSS - DIV_YIELD
    ie_units, ie_cost = 0.0, 0.0      # קרן אירית: צוברת, מס רק במכירה
    us_units, us_cost = 0.0, 0.0
    ie_px = us_px = 100.0
    us_ath = 0.0
    tax_paid = 0.0

    m_ie = (1 + mu_price + DIV_YIELD - TER_IE) ** (1/12)   # צוברת — הדיבידנד נשאר בפנים
    m_us = (1 + mu_price - TER_US) ** (1/12)               # מחלקת — רק תשואת המחיר במחיר
    sd = VOL / (12 ** 0.5)

    for m in range(YEARS * 12):
        # שוק — אותה הגרלה לשני הרכיבים, כדי שההפרש יהיה המבנה בלבד
        z = r.gauss(0, 1)
        shock = pow(2.718281828459045, sd * z - sd * sd / 2)
        ie_px *= m_ie * shock
        us_px *= m_us * shock

        # הפקדה
        if mode == 'IE':
            ie_units += DEPOSIT_USD / ie_px; ie_cost += DEPOSIT_USD
        else:
            us_amt = DEPOSIT_USD * US_SHARE
            us_units += us_amt / us_px; us_cost += us_amt
            ie_units += (DEPOSIT_USD - us_amt) / ie_px; ie_cost += DEPOSIT_USD - us_amt

        # דיבידנד שנתי מהרכיב האמריקאי — **אירוע מס שאי אפשר לדחות**
        if mode != 'IE' and m % 12 == 11 and us_units > 0:
            gross_div = us_units * us_px * DIV_YIELD
            # ניכוי במקור אמריקאי, ואז השלמה ל-CGT הישראלי אם הוא גבוה יותר
            net_div = gross_div * (1 - max(US_WHT, CGT))
            tax_paid += gross_div - net_div
            us_units += net_div / us_px; us_cost += net_div

        # ── הגזימה: רק בשיא כל הזמנים, ורק אם מעל הסף ──
        if mode == 'TRIM':
            if us_px > us_ath:
                us_ath = us_px
                val = us_units * us_px
                if val > TRIM_HIGH:
                    sell = val - TRIM_LOW
                    share = sell / val
                    # **סעיף 88: הרווח במטבע הנייר.** העלות היא דולרית,
                    # ולכן עליית הדולר אינה נכנסת לחישוב בכלל.
                    gain = sell - us_cost * share
                    tax = max(0.0, gain) * CGT
                    tax_paid += tax
                    us_cost -= us_cost * share
                    us_units -= sell / us_px
                    # והתמורה נטו עוברת לקרן האירית
                    ie_units += (sell - tax) / ie_px; ie_cost += sell - tax
            else:
                us_ath = max(us_ath, us_px)

    ie_val, us_val = ie_units * ie_px, us_units * us_px
    # חיסול בסוף — מס על הרווח הריאלי במטבע הנייר
    final_tax = max(0.0, ie_val - ie_cost) * CGT + max(0.0, us_val - us_cost) * CGT
    estate = max(0.0, us_val - ESTATE_FREE)
    return ie_val + us_val - final_tax, tax_paid + final_tax, estate


def pct(a, q):
    s = sorted(a); i = int(q * (len(s) - 1)); return s[i]


def main():
    out = {}
    for mode in ('IE', 'TRIM', 'HOLD'):
        r = random.Random(SEED)          # אותה סדרת הגרלות לכל תרחיש
        rows = [run(mode, r) for _ in range(PATHS)]
        out[mode] = rows

    dep = DEPOSIT_USD * 12 * YEARS
    print(f"\n  {DEPOSIT_USD:,}$ לחודש × {YEARS} שנה = {dep:,}$ הופקדו · "
          f"{PATHS:,} מסלולים · תשואה {GROSS:.0%} · דיבידנד {DIV_YIELD:.1%}\n")
    print(f"  {'תרחיש':<34}{'חציון נטו':>14}{'עשירון תחתון':>15}{'מס ששולם':>13}{'חשיפת עיזבון':>15}")
    name = {
        'IE':   'A · הכל אירי צובר',
        'TRIM': 'B · מעורב + גזימה בכל שיא',
        'HOLD': 'C · מעורב, בלי גזימה',
    }
    med = {}
    for mode in ('IE', 'TRIM', 'HOLD'):
        v = [x[0] for x in out[mode]]
        t = [x[1] for x in out[mode]]
        e = [x[2] for x in out[mode]]
        med[mode] = pct(v, .5)
        print(f"  {name[mode]:<34}{pct(v,.5):>13,.0f}${pct(v,.1):>14,.0f}$"
              f"{pct(t,.5):>12,.0f}${pct(e,.5):>14,.0f}$")

    print()
    for mode in ('TRIM', 'HOLD'):
        d = med[mode] - med['IE']
        print(f"  {name[mode]} מול A: {d:+,.0f}$  ({d/med['IE']*100:+.1f}%)")

    # ומה מס העיזבון היה עולה בתרחיש C, אילו היה נפטר בסוף
    e = pct([x[2] for x in out['HOLD']], .5)
    print(f"\n  ובתרחיש C — מס עיזבון על החשיפה: {e*ESTATE_RATE:,.0f}$ "
          f"({ESTATE_RATE:.0%} על {e:,.0f}$ מעל הפטור)")
    print(f"  נטו אחרי מס עיזבון: {med['HOLD'] - e*ESTATE_RATE:,.0f}$ "
          f"({med['HOLD'] - e*ESTATE_RATE - med['IE']:+,.0f}$ מול A)\n")


if __name__ == '__main__':
    main()
