/** MGS · מה כל קרן באמת מחזיקה.
 *
 *  **כל שורה כאן מגיעה מהמנפיק עצמו** — מדף המוצר, מקובץ הנתונים
 *  שלו, או מהדוח הכספי המבוקר של הקרן. **אף מספר לא נלקח מאתר
 *  השוואה ואף אחד לא נכתב מהזיכרון.**
 *
 *  **והממצא החשוב ביותר נמצא בשתי הקרנות הסינתטיות.** ה-factsheet
 *  שלהן מציג ״Top exposures״ שהוא **משקלי המדד** ולא האחזקות
 *  שהקרן קנתה בכסף. ההוכחה: המספרים ב-SPXS **זהים כמעט לחלוטין**
 *  ל-VUAA הפיזית באותו תאריך. הסל האמיתי נשלף מהדוח הכספי.
 */

export interface Hold { co: string; w: number }

export interface FundHoldings {
  /** נכון לתאריך */
  asOf: string;
  /** כמה ניירות בקרן */
  n?: number;
  /** עשרת הגדולות */
  top: Hold[];
  /** סך העשירייה — אם המנפיק מפרסם אותו, מסומן כך */
  sum?: number;
  sumByIssuer?: boolean;
  /** הערה ייחודית לקרן */
  note?: string;
}

export const HOLD: Record<string, FundHoldings> = {
  CSPX: { asOf: '2.11.2026', n: 503, sum: 0.3706, top: [
    { co: 'Apple', w: 7.59 }, { co: 'NVIDIA', w: 7.52 }, { co: 'Microsoft', w: 5.79 },
    { co: 'Amazon', w: 3.71 }, { co: 'Alphabet A', w: 2.52 }, { co: 'Broadcom', w: 2.36 },
    { co: 'Meta', w: 2.06 }, { co: 'Alphabet C', w: 2.03 }, { co: 'Tesla', w: 1.75 },
    { co: 'Eli Lilly', w: 1.74 }] },

  CNDX: { asOf: '2.11.2026', n: 101, sum: 0.4650, top: [
    { co: 'Apple', w: 8.14 }, { co: 'NVIDIA', w: 8.03 }, { co: 'Microsoft', w: 6.21 },
    { co: 'Amazon', w: 4.37 }, { co: 'Micron', w: 4.29 }, { co: 'Tesla', w: 3.50 },
    { co: 'AMD', w: 3.47 }, { co: 'Meta', w: 2.98 }, { co: 'Walmart', w: 2.83 },
    { co: 'Alphabet A', w: 2.70 }] },

  SEMI: { asOf: '2.11.2026', n: 258, sum: 0.5970, top: [
    { co: 'AMD', w: 8.32 }, { co: 'TSMC', w: 8.08 }, { co: 'NVIDIA', w: 7.72 },
    { co: 'Micron', w: 7.39 }, { co: 'Broadcom', w: 7.38 }, { co: 'SK Hynix', w: 5.09 },
    { co: 'ASML', w: 4.48 }, { co: 'Texas Instruments', w: 3.79 },
    { co: 'Applied Materials', w: 3.77 }, { co: 'Lam Research', w: 3.69 }] },

  IUIT: { asOf: '2.11.2026', n: 75, sum: 0.7636, top: [
    { co: 'NVIDIA', w: 20.51 }, { co: 'Apple', w: 20.41 }, { co: 'Microsoft', w: 15.88 },
    { co: 'Broadcom', w: 6.46 }, { co: 'Micron', w: 3.97 }, { co: 'AMD', w: 3.21 },
    { co: 'Palantir', w: 1.73 }, { co: 'Cisco', w: 1.69 }, { co: 'Intel', w: 1.26 },
    { co: 'Applied Materials', w: 1.25 }],
    note: '**ריכוזיות קיצונית: שלוש חברות הן 56.8% מהקרן.** מי שקונה אותה קונה בעיקר NVIDIA, Apple ומיקרוסופט — ורק אחר כך ״סקטור הטכנולוגיה״.' },

  IWDA: { asOf: '2.11.2026', n: 1250, sum: 0.2630, top: [
    { co: 'Apple', w: 5.54 }, { co: 'NVIDIA', w: 5.18 }, { co: 'Microsoft', w: 3.99 },
    { co: 'Amazon', w: 2.65 }, { co: 'Alphabet A', w: 1.83 }, { co: 'Broadcom', w: 1.62 },
    { co: 'Meta', w: 1.49 }, { co: 'Alphabet C', w: 1.45 }, { co: 'Tesla', w: 1.29 },
    { co: 'Eli Lilly', w: 1.26 }] },

  SSAC: { asOf: '2.11.2026', n: 1663, sum: 0.2411, top: [
    { co: 'Apple', w: 4.91 }, { co: 'NVIDIA', w: 4.60 }, { co: 'Microsoft', w: 3.53 },
    { co: 'Amazon', w: 2.34 }, { co: 'TSMC', w: 1.74 }, { co: 'Alphabet A', w: 1.61 },
    { co: 'Broadcom', w: 1.44 }, { co: 'קרן iShares MSCI India (NDIA)', w: 1.34 },
    { co: 'Meta', w: 1.32 }, { co: 'Alphabet C', w: 1.28 }],
    note: '**שימו לב לאחזקה השמינית — היא קרן אחרת מהקטלוג הזה.** מי שמחזיק גם SSAC וגם NDIA מחזיק את הודו פעמיים.' },

  VUAA: { asOf: '30.9.2026', n: 504, sum: 0.406, sumByIssuer: true, top: [
    { co: 'NVIDIA', w: 8.4 }, { co: 'Apple', w: 7.4 }, { co: 'Microsoft', w: 5.8 },
    { co: 'Alphabet', w: 5.5 }, { co: 'Amazon', w: 3.7 }, { co: 'Broadcom', w: 2.5 },
    { co: 'Meta', w: 2.4 }, { co: 'Micron', w: 1.8 }, { co: 'Tesla', w: 1.5 },
    { co: 'AMD', w: 1.5 }] },

  VWRA: { asOf: '30.9.2026', n: 3821, sum: 0.258, sumByIssuer: true, top: [
    { co: 'NVIDIA', w: 5.0 }, { co: 'Apple', w: 4.5 }, { co: 'Microsoft', w: 3.6 },
    { co: 'Alphabet', w: 3.4 }, { co: 'Amazon', w: 2.3 }, { co: 'TSMC', w: 1.8 },
    { co: 'Broadcom', w: 1.5 }, { co: 'Meta', w: 1.5 }, { co: 'Micron', w: 1.1 },
    { co: 'Tesla', w: 1.0 }] },

  SMH: { asOf: '30.9.2026', n: 25, sum: 0.8257, sumByIssuer: true, top: [
    { co: 'AMD', w: 10.99 }, { co: 'TSMC', w: 9.98 }, { co: 'Micron', w: 9.88 },
    { co: 'NVIDIA', w: 9.73 }, { co: 'Broadcom', w: 9.18 }, { co: 'SK Hynix', w: 8.83 },
    { co: 'ASML', w: 8.41 }, { co: 'Intel', w: 6.74 }, { co: 'Lam Research', w: 4.41 },
    { co: 'Applied Materials', w: 4.41 }],
    note: '**25 ניירות בלבד, והעשירייה היא 82.6% מהקרן.** זו לא ״חשיפה לסקטור״ — זו החזקה מרוכזת בעשר חברות.' },

  GDX: { asOf: '30.9.2026', n: 59, sum: 0.5858, sumByIssuer: true, top: [
    { co: 'Newmont', w: 11.04 }, { co: 'Agnico Eagle', w: 10.96 }, { co: 'Barrick', w: 7.90 },
    { co: 'Wheaton Precious Metals', w: 5.52 }, { co: 'Franco-Nevada', w: 5.07 },
    { co: 'AngloGold Ashanti', w: 4.89 }, { co: 'Kinross Gold', w: 3.83 },
    { co: 'Gold Fields', w: 3.78 }, { co: 'Northern Star', w: 2.91 },
    { co: 'Pan American Silver', w: 2.69 }] },

  SPGP: { asOf: '2.11.2026', n: 84, sum: 0.6107, top: [
    { co: 'Newmont', w: 10.64 }, { co: 'Agnico Eagle', w: 10.55 }, { co: 'Barrick', w: 8.41 },
    { co: 'Wheaton Precious Metals', w: 7.29 }, { co: 'Franco-Nevada', w: 5.95 },
    { co: 'AngloGold Ashanti', w: 4.75 }, { co: 'Gold Fields', w: 4.18 },
    { co: 'Kinross Gold', w: 3.28 }, { co: 'Northern Star', w: 3.23 },
    { co: 'Zijin Mining', w: 2.79 }],
    note: '**ל-SPGP ול-GDX יש תשעה שמות זהים מתוך עשרה.** ההבדל היחיד: כאן Zijin, שם Pan American Silver. **מי שמחזיק בשתיהן מחזיק קרן אחת פעמיים.**' },

  KWEB: { asOf: '2.11.2026', n: 45, sum: 0.6142, top: [
    { co: 'Tencent', w: 9.95 }, { co: 'PDD Holdings', w: 8.82 }, { co: 'Alibaba', w: 8.52 },
    { co: 'Meituan', w: 7.59 }, { co: 'NetEase', w: 6.47 }, { co: 'KE Holdings', w: 4.94 },
    { co: 'JD.com', w: 4.18 }, { co: 'Lenovo', w: 3.91 }, { co: 'Trip.com', w: 3.73 },
    { co: 'Full Truck Alliance', w: 3.31 }] },

  RBOT: { asOf: '2.11.2026', n: 159, sum: 0.3231, top: [
    { co: 'Advantest', w: 4.00 }, { co: 'SAP', w: 3.82 }, { co: 'Snowflake', w: 3.52 },
    { co: 'Emerson Electric', w: 3.38 }, { co: 'Autodesk', w: 3.03 },
    { co: 'Intuitive Surgical', w: 2.97 }, { co: 'Keyence', w: 2.95 },
    { co: 'Constellation Software', w: 2.91 }, { co: 'ServiceNow', w: 2.87 },
    { co: 'Siemens', w: 2.86 }],
    note: '**רוב העשירייה היא תוכנה ומוליכים למחצה, לא יצרני רובוטים.** מי שמצפה למפעלי רובוטיקה מקבל בעיקר חברות תוכנה.' },

  IWMO: { asOf: '2.11.2026', n: 349, sum: 0.2658, top: [
    { co: 'Micron', w: 4.84 }, { co: 'AMD', w: 3.93 }, { co: 'ExxonMobil', w: 2.79 },
    { co: 'Johnson & Johnson', w: 2.74 }, { co: 'ASML', w: 2.62 },
    { co: 'Alphabet A', w: 2.43 }, { co: 'Alphabet C', w: 1.94 }, { co: 'Cisco', w: 1.94 },
    { co: 'Intel', w: 1.72 }, { co: 'Applied Materials', w: 1.63 }] },

  NDIA: { asOf: '2.11.2026', n: 165, sum: 0.3501, top: [
    { co: 'HDFC Bank', w: 6.24 }, { co: 'Reliance Industries', w: 5.84 },
    { co: 'ICICI Bank', w: 5.76 }, { co: 'Bharti Airtel', w: 4.37 },
    { co: 'Infosys', w: 2.76 }, { co: 'Axis Bank', w: 2.18 },
    { co: 'Larsen & Toubro', w: 2.08 }, { co: 'Kotak Mahindra Bank', w: 1.96 },
    { co: 'Mahindra & Mahindra', w: 1.95 }, { co: 'Bajaj Finance', w: 1.87 }],
    note: '**חמש מתוך עשר הן בנקים ופיננסים.** ״הודו״ כאן היא בעיקר המערכת הבנקאית שלה.' },
};

/** **הסל האמיתי של הקרנות הסינתטיות — מהדוח הכספי, לא מה-factsheet.** */
export interface SwapBasket {
  asOf: string;
  /** מה ה-factsheet מציג, ומה באמת יש */
  claim: Array<{ what: string; sheet: string; real: string }>;
  /** האחזקות הפיזיות הגדולות בפועל */
  real: Hold[];
  /** הצדדים הנגדיים לחוזה */
  banks: string[];
  note: string;
}

export const SWAP: Record<string, SwapBasket> = {
  SPXS: { asOf: '31.5.2026',
    claim: [
      { what: 'חשיפה לארה״ב', sheet: '99.8%', real: '**69.6%**' },
      { what: 'NVIDIA', sheet: '8.40%', real: '**1.77%**' },
      { what: 'Apple', sheet: '7.40%', real: '**2.29%**' },
      { what: 'Microsoft', sheet: '5.80%', real: '**2.12%**' },
    ],
    real: [
      { co: 'Amazon', w: 6.18 }, { co: 'Meta', w: 5.20 }, { co: 'Broadcom', w: 5.13 },
      { co: 'Micron', w: 4.19 }, { co: 'AMD', w: 4.13 }, { co: 'ASML — הולנד', w: 3.73 },
      { co: 'Alphabet C', w: 2.78 }, { co: 'Alphabet A', w: 2.34 }, { co: 'Apple', w: 2.29 },
      { co: 'Intel', w: 2.15 }, { co: 'Microsoft', w: 2.12 }, { co: 'NVIDIA', w: 1.77 },
      { co: 'Roche — שווייץ', w: 1.63 }, { co: 'Tesla', w: 1.52 },
    ],
    banks: ['Barclays', 'Citigroup', 'Goldman Sachs', 'J.P. Morgan', 'Morgan Stanley', 'Société Générale'],
    note: 'והסל מחזיק גם דברים שאינם ב-S&P 500 בכלל: **Rheinmetall** הגרמנית, **Novo Nordisk**, **BMW**, **KBC**, **Vale** ו-**NetEase**.' },

  XLKS: { asOf: '31.5.2026',
    claim: [
      { what: 'חשיפה לארה״ב', sheet: '99.5%', real: '**83.1%**' },
      { what: 'Apple', sheet: '19.10%', real: '**אינה באחזקות הגדולות**' },
      { what: 'NVIDIA', sheet: '18.70%', real: '**אינה באחזקות הגדולות**' },
      { what: 'Microsoft', sheet: '15.00%', real: '**אינה באחזקות הגדולות**' },
    ],
    real: [
      { co: 'Micron', w: 8.35 }, { co: 'Amazon', w: 6.05 }, { co: 'Broadcom', w: 5.37 },
      { co: 'AMD', w: 4.32 }, { co: 'Vertiv', w: 3.78 }, { co: 'Oracle', w: 3.63 },
      { co: 'Mastercard', w: 3.54 }, { co: 'AstraZeneca — תרופות', w: 3.08 },
      { co: 'Modine Manufacturing', w: 3.04 }, { co: 'Meta', w: 2.75 },
      { co: 'Antero Resources — גז טבעי', w: 2.34 }, { co: 'Nestlé — מזון', w: 2.20 },
      { co: 'Cleveland-Cliffs — פלדה', w: 1.20 }, { co: 'Teva', w: 1.07 },
      { co: 'ConocoPhillips — נפט', w: 1.04 }, { co: 'Mondelez — מזון', w: 1.03 },
    ],
    banks: ['Goldman Sachs', 'Morgan Stanley'],
    note: '**קרן שנקראת ״טכנולוגיה״ מחזיקה בפועל מזון, נפט, פלדה ותרופות.** Apple, Microsoft ו-NVIDIA כלל אינן בין האחזקות הגדולות שלה.' },
};

/** בכמה קרנות בקטלוג מופיעה כל חברה, וטווח המשקל */
export const OVERLAP: Array<{ co: string; n: number; from: number; to: number }> = [
  { co: 'NVIDIA', n: 9, from: 4.60, to: 20.51 },
  { co: 'Broadcom', n: 8, from: 1.44, to: 9.18 },
  { co: 'Apple', n: 7, from: 4.50, to: 20.41 },
  { co: 'Microsoft', n: 7, from: 3.53, to: 15.88 },
  { co: 'AMD', n: 7, from: 1.50, to: 10.99 },
  { co: 'Micron', n: 7, from: 1.10, to: 9.88 },
  { co: 'Alphabet', n: 7, from: 2.70, to: 5.50 },
  { co: 'Amazon', n: 6, from: 2.30, to: 4.37 },
  { co: 'Meta', n: 6, from: 1.32, to: 2.98 },
  { co: 'Tesla', n: 5, from: 1.00, to: 3.50 },
];
