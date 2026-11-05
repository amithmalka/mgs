/** MGS · ביטקוין — למה אין גרסה אירית, ומה כן קיים.
 *
 *  **אין בעולם קרן אירית על ביטקוין, וגם לא תהיה בקרוב.** רגולציית
 *  UCITS מגדירה רשימה סגורה של נכסים כשירים וקריפטו אינו בתוכה, וגם
 *  דרישת הפיזור שוללת מוצר על נכס בודד. הבנק המרכזי האירי כתב במפורש
 *  שהוא **״בלתי סביר ביותר״** שיאשר UCITS עם חשיפה לקריפטו, ישירה או
 *  עקיפה. לכן כל מה שמוצע כ״קרן ביטקוין אירופית״ הוא **ETP — נייר
 *  חוב**, ולא קרן.
 *
 *  **וזה משנה את ניתוח מס העיזבון:** קרן אירית נבחנת לפי §2104(a),
 *  שעוסק במניה שהנפיקה חברה. ETP נבחן לפי **§2104(c)**, שעוסק בחוב:
 *  החוב הוא נכס אמריקאי אם **החייב הוא אדם אמריקאי**. מנפיק שווייצרי
 *  או ג׳רזי אינו אדם אמריקאי, ולכן הנייר מחוץ לבסיס — אבל **בדרך
 *  אחרת לגמרי**, ועם **סיכון אשראי של המנפיק** שלקרן אין.
 *
 *  אין בזה המלצה ואין בזה ייעוץ מס.
 */
export interface BtcRoute {
  he: string; tick: string; isin: string; domicile: string;
  kind: 'UCITS אירית' | 'ETP · נייר חוב' | 'קרן סל ישראלית';
  ter: number | null; ex: string; cur: string;
  irish: boolean;
  note: string;
}

export const BTC_ROUTES: BtcRoute[] = [
  {
    he: 'CoinShares Bitcoin Mining UCITS ETF', tick: 'MINE',
    isin: 'IE0008EKJPN4', domicile: 'אירלנד', kind: 'UCITS אירית',
    ter: 0.0065, ex: 'Xetra · LSE · מילאנו', cur: 'USD', irish: true,
    note: 'הדבר היחיד בגרסה אירית שקשור לביטקוין — והוא **אינו מחזיק '
        + 'ביטקוין**. זו סל של חברות כרייה, שמושפעות ממחיר הביטקוין אך '
        + 'גם מעלות חשמל, מדילול הון ומסיכון עסקי. הושקה 21.7.2026, '
        + 'ולכן אין לה היסטוריה למדוד.',
  },
  {
    he: 'iShares Bitcoin ETP', tick: 'IB1T',
    isin: 'XS2940466316', domicile: 'שווייץ', kind: 'ETP · נייר חוב',
    ter: 0.0015, ex: 'Xetra', cur: 'USD', irish: false,
    note: 'הזול בשוק — 0.15% עד 31.12.2026 ואז **עולה ל-0.25%**. מנפיק '
        + 'iShares Digital Assets AG, משמורת Coinbase לוקסמבורג בקור. '
        + 'ISIN מתחיל XS, לא IE.',
  },
  {
    he: '21Shares Bitcoin Core ETP', tick: 'CBTC',
    isin: 'CH1199067674', domicile: 'שווייץ', kind: 'ETP · נייר חוב',
    ter: null, ex: 'SIX · Xetra', cur: 'USD', irish: false,
    note: 'זה הנייר שעלה בבדיקת מס העיזבון הקודמת. תשובה נקייה על '
        + 'סיטוס, אבל **נייר חוב בלי ערב**.',
  },
  {
    he: '21Shares Bitcoin ETP', tick: 'ABTC',
    isin: 'CH0454664001', domicile: 'שווייץ', kind: 'ETP · נייר חוב',
    ter: 0.0149, ex: 'Xetra · יורונקסט פריז', cur: 'EUR', irish: false,
    note: 'הוותיק, אבל **1.49% דמי ניהול** — פי עשרה מ-IB1T.',
  },
  {
    he: 'CoinShares Physical Bitcoin', tick: 'BITC',
    isin: 'GB00BLD4ZL17', domicile: 'ג׳רזי', kind: 'ETP · נייר חוב',
    ter: null, ex: 'Xetra · SIX', cur: 'USD', irish: false,
    note: 'מנפיק ג׳רזי. ISIN מתחיל GB.',
  },
  {
    he: 'WisdomTree Physical Bitcoin', tick: 'BTCW',
    isin: 'GB00BJYDH287', domicile: 'ג׳רזי', kind: 'ETP · נייר חוב',
    ter: 0.0015, ex: 'LSE · Xetra · SIX', cur: 'USD', irish: false,
    note: 'גם 0.15%, מנפיק ג׳רזי.',
  },
  {
    he: 'תכלית ביטקוין', tick: '1217835',
    isin: 'קרן ישראלית', domicile: 'ישראל', kind: 'קרן סל ישראלית',
    ter: null, ex: 'תל אביב', cur: 'ILS', irish: false,
    note: 'נקנית בשקלים בקלות, אבל **מחזיקה כ-95% קרנות סל אמריקאיות '
        + 'בפנים** — וההנמקה על מס העיזבון שלה פחות מתועדת מכולן.',
  },
];
