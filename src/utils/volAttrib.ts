/** פירוק התנודתיות של תיק מורכב — מה מעלה, מה מוריד, ועל איזה חלון נמדד.
 *
 *  השיטה: תנודתיות התיק היא שורש של wᵀΣw. התרומה השולית של רכיב i היא
 *  wᵢ·(Σw)ᵢ/σ_p, והסכום שלהן שווה בדיוק ל-σ_p — ולכן אפשר להציג אותן
 *  כאחוזים מהתנודתיות. נוסף על כך מחושב ״מה קורה אם מסירים״, כי זו
 *  השאלה שבאמת מעניינת: רכיב תנודתי עם מתאם נמוך עשוי *להוריד* את
 *  תנודתיות התיק גם אם התרומה השולית שלו חיובית.
 *
 *  חלון המדידה: כל רכיב נמדד על מספר חודשים שונה, וחלון המתאמים הוא
 *  החיתוך בין שני הרכיבים. **הרכיב עם ההיסטוריה הקצרה ביותר הוא זה
 *  שקובע את מידת הביטחון בכל המטריצה**, ולכן הוא מסומן במפורש.
 */
import { MEASURED, corr, type SleeveKey } from '../constants/sleeveCatalog';

export interface VolRow {
  k: SleeveKey; he: string; w: number;
  vol: number;          // התנודתיות של הרכיב עצמו
  share: number;        // חלקו בתנודתיות התיק, שבריר
  without: number;      // תנודתיות התיק בלעדיו
  /** without − σp.  **שלילי = הרכיב מרים** את תנודתיות התיק (בלעדיו היא
   *  נמוכה יותר).  **חיובי = הרכיב מוריד** אותה (בלעדיו היא גבוהה יותר). */
  delta: number;
  avgCorr: number;      // מתאם משוקלל לשאר התיק
  months: number; since: string;
}
export interface VolReport {
  sigma: number;            // תנודתיות התיק
  weighted: number;         // ממוצע משוקלל של התנודתיות הבודדות
  saved: number;            // weighted − sigma = מה שהפיזור חסך
  rows: VolRow[];
  shortest: VolRow | null;  // הרכיב שקובע את חלון הביטחון
  months: number;           // החלון הקצר ביותר
  since: string;
}

const sigmaOf = (ks: SleeveKey[], w: number[]) => {
  let v = 0;
  for (let i = 0; i < ks.length; i++)
    for (let j = 0; j < ks.length; j++)
      v += w[i] * w[j] * MEASURED[ks[i]].vol * MEASURED[ks[j]].vol * corr(ks[i], ks[j]);
  return Math.sqrt(Math.max(0, v));
};

export function attributeVol(weights: Record<string, number>): VolReport | null {
  const ks = (Object.keys(weights) as SleeveKey[]).filter(k => MEASURED[k] && weights[k] > 0);
  if (ks.length < 2) return null;
  const tot = ks.reduce((a, k) => a + weights[k], 0);
  if (tot <= 0) return null;
  const w = ks.map(k => weights[k] / tot);
  const sigma = sigmaOf(ks, w);
  if (!(sigma > 0)) return null;

  const rows: VolRow[] = ks.map((k, i) => {
    // (Σw)ᵢ — השורה ה-i של מטריצת הקווריאנס כפול הווקטור
    let sw = 0;
    for (let j = 0; j < ks.length; j++)
      sw += w[j] * MEASURED[k].vol * MEASURED[ks[j]].vol * corr(k, ks[j]);
    // התיק בלעדיו, מנורמל מחדש
    const rest = ks.filter((_, j) => j !== i);
    const rw = w.filter((_, j) => j !== i);
    const rs = rw.reduce((a, b) => a + b, 0);
    const without = rest.length >= 1 && rs > 0
      ? sigmaOf(rest, rw.map(x => x / rs)) : 0;
    // מתאם משוקלל לשאר התיק
    let c = 0;
    for (let j = 0; j < ks.length; j++) if (j !== i) c += (w[j] / rs) * corr(k, ks[j]);
    return {
      k, he: MEASURED[k].he, w: w[i], vol: MEASURED[k].vol,
      share: (w[i] * sw) / (sigma * sigma),
      without, delta: without - sigma, avgCorr: c,
      months: MEASURED[k].months, since: MEASURED[k].since,
    };
  }).sort((a, b) => b.share - a.share);

  const weighted = ks.reduce((a, k, i) => a + w[i] * MEASURED[k].vol, 0);
  const shortest = rows.reduce<VolRow | null>(
    (m, r) => (!m || r.months < m.months ? r : m), null);
  return {
    sigma, weighted, saved: weighted - sigma, rows, shortest,
    months: shortest?.months ?? 0, since: shortest?.since ?? '',
  };
}
