"""האייקונים של המערכת — נוצרים מקוד, ולא נשמרים כבינארי אטום.

**למה סקריפט ולא קובץ PNG שמישהו צייר.** אייקון שנשמר כבינארי אי
אפשר לתקן: מי שירצה לשנות גוון או ריווח יצטרך כלי חיצוני, והמקור
יישכח. כאן הצורה היא מספרים, והפלט נוצר מחדש בפקודה אחת.

**ולמה PIL ולא המרה מ-SVG.** על המכונה הזאת אין `rsvg-convert`,
`magick`, `inkscape` ולא `cairosvg` — נבדק. ול-`qlmanage` אין שליטה
על גודל מדויק. ‏PIL מצייר ישירות, בלי תלות חדשה.

**והצורה עצמה:** שלושה עמודים עולים, מהאקווה אל הפריוויקל של
הפלטה, על הרקע הכחול-שחור של דף הנחיתה. עמודים ולא גרף קווי, כי
ב-48 פיקסלים — הגודל שבו אייקון באמת נראה — קו דק נעלם.

הרצה:
    python3 scripts/make-icons.py
הפלט: ``public/icon-192.png``, ``icon-512.png``, ``icon-maskable-512.png``,
``apple-touch-icon.png``
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'public')

BG = (6, 8, 12)             # --bg  #06080C
AQUA = (94, 230, 208)       # --aqua #5EE6D0
PERI = (129, 147, 250)      # --peri #8193FA
RULE = (150, 180, 212)      # --line

S = 1024                    # מציירים גדול ומקטינים, כדי שהקצוות יהיו חלקים
SS = 4                      # על-דגימה


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw(size: int, pad: float, rounded: bool) -> Image.Image:
    """``pad`` הוא השוליים כשבריר מהצד — אזור בטוח לאייקון maskable,
    שאנדרואיד חותך ממנו עיגול."""
    n = size * SS
    im = Image.new('RGB', (n, n), BG)
    d = ImageDraw.Draw(im)

    inner = n * (1 - 2 * pad)
    x0 = n * pad

    # קו הבסיס — רמז לציר, לא גריד
    base_y = x0 + inner * 0.92
    d.rounded_rectangle(
        [x0 + inner * 0.08, base_y, x0 + inner * 0.92, base_y + n * 0.012],
        radius=n * 0.006, fill=lerp(BG, RULE, 0.30),
    )

    # שלושה עמודים עולים
    heights = (0.42, 0.64, 0.88)
    bw = inner * 0.17
    gap = (inner * 0.84 - 3 * bw) / 2
    for i, h in enumerate(heights):
        left = x0 + inner * 0.08 + i * (bw + gap)
        top = base_y - inner * h
        col = lerp(AQUA, PERI, i / (len(heights) - 1))
        d.rounded_rectangle(
            [left, top, left + bw, base_y],
            radius=bw * 0.28, fill=col,
        )

    im = im.resize((size, size), Image.LANCZOS)

    if rounded:
        # פינות מעוגלות לאייקון שמוצג כמו שהוא; iOS ממסך בעצמו,
        # אבל אנדרואיד ודפדפנים במחשב לא.
        mask = Image.new('L', (size * SS, size * SS), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, size * SS - 1, size * SS - 1],
            radius=size * SS * 0.22, fill=255,
        )
        mask = mask.resize((size, size), Image.LANCZOS)
        out = Image.new('RGB', (size, size), BG)
        out.paste(im, (0, 0), mask)
        # הרקע שמחוץ לפינות חייב להיות אטום, אחרת iOS משחיר אותו
        bgim = Image.new('RGB', (size, size), BG)
        bgim.paste(im, (0, 0), mask)
        return bgim
    return im


def main():
    os.makedirs(OUT, exist_ok=True)
    jobs = [
        ('icon-192.png', 192, 0.14, True),
        ('icon-512.png', 512, 0.14, True),
        # maskable: אנדרואיד חותך עיגול, ולכן השוליים גדולים ואין פינות
        ('icon-maskable-512.png', 512, 0.22, False),
        # iOS דורש PNG מרובע ואטום; הוא מעגל בעצמו
        ('apple-touch-icon.png', 180, 0.14, False),
    ]
    for name, size, pad, rounded in jobs:
        im = draw(size, pad, rounded)
        p = os.path.join(OUT, name)
        im.save(p, 'PNG', optimize=True)
        print(f'  {name:26} {size}×{size}  {os.path.getsize(p):>6} bytes')


if __name__ == '__main__':
    main()
