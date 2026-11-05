/** MGS · מבנה המצגות.
 *
 *  **למה נתונים ולא HTML.** שקופית שמכילה מספר מודפס קופאת ברגע
 *  שהמנוע משתנה. כאן כל שקופית היא **מבנה**, והמספרים נמשכים
 *  מהקטלוג ומהמנוע בזמן ההצגה — כך שמצגת לא יכולה לסתור את
 *  המערכת שהיא מלמדת.
 */

/** גוש בשקופית */
export type Block =
  | { t: 'lede'; text: string }
  | { t: 'p'; text: string }
  | { t: 'bullets'; items: string[] }
  | { t: 'stats'; items: Array<{ k: string; v: string; s?: string; tone?: 'gold' | 'up' | 'warn' }> }
  | { t: 'table'; head: string[]; rows: string[][]; note?: string }
  | { t: 'quote'; text: string; by?: string }
  | { t: 'warn'; text: string }
  | { t: 'good'; text: string }
  /** שתי עמודות להשוואה */
  | { t: 'vs'; a: { h: string; items: string[] }; b: { h: string; items: string[] } }
  /** ציר זמן */
  | { t: 'timeline'; items: Array<{ when: string; what: string }> }
  /** רכיב חי מהמערכת — נמשך בזמן ההצגה */
  | { t: 'live'; id: LiveId };

/** רכיבים חיים שאפשר להטמיע בשקופית */
export type LiveId =
  | 'catalog'        // טבלת הקרנות מהקטלוג
  | 'depositCurve'   // עקומת ההפקדה
  | 'tracks'         // שלושת המסלולים
  | 'combos'         // הקומבינציות
  | 'ceilings';      // תקרות קרן ההשתלמות

export interface Slide {
  id: string;
  /** כותרת עליונה קטנה */
  eyebrow?: string;
  title: string;
  blocks: Block[];
  /** הערת מקור בתחתית */
  src?: string;
}

export interface Deck {
  id: string;
  he: string;
  /** משפט אחד: על מה המצגת */
  sub: string;
  /** אייקון טקסטואלי קצר לכרטיס */
  tag: string;
  slides: Slide[];
}
