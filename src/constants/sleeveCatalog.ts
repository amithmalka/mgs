/** MGS · קטלוג הרכיבים.
 *
 *  כל מספר כאן מאומת, ולכל שדה מצוין מאיפה הוא בא:
 *
 *  vol / cagr / dd  — נמדדו מתשואות חודשיות אמיתיות כולל דיבידנדים, על
 *                     הנייר האמריקאי שעוקב אותו מדד (ספק הנתונים אינו
 *                     מכסה את לונדון). cagr הוא **היסטוריה, לא תחזית**.
 *  tase             — מספר הנייר בבורסה בתל אביב, אם הקרן רשומה שם.
 *                     אומת בפיד הניירות של הבורסה עצמה, אוקטובר 2026.
 *                     null = נדרש ברוקר עם גישה לבורסות אירופה.
 *  assume           — הנחת תשואה **מפורסמת**. קיימת רק לרכיבים שיש להם
 *                     מקור. null = אין מקור, ולכן הרכיב פועל רק על בסיס
 *                     ההיסטוריה המדודה, והדף אומר זאת.
 */

/* נמדד מתשואות חודשיות אמיתיות כולל דיבידנדים. cagr הוא היסטוריה, לא תחזית. */
export const MEASURED = {
  SP5:   { he: 'S&P 500',                     proxy: 'SPY',    vol: 0.1433, cagr: 0.1402, dd: -0.239, months: 158, since: '2013-09' },
  NDX:   { he: 'נאסד״ק 100',                  proxy: 'QQQ',    vol: 0.1782, cagr: 0.1904, dd: -0.326, months: 158, since: '2013-09' },
  TEC:   { he: 'טכנולוגיה אמריקאית',          proxy: 'XLK',    vol: 0.1922, cagr: 0.2178, dd: -0.312, months: 158, since: '2013-09' },
  SEM:   { he: 'שבבים · MVIS 25',             proxy: 'SMH',    vol: 0.2646, cagr: 0.2962, dd: -0.401, months: 158, since: '2013-09' },
  SOX:   { he: 'שבבים · PHLX',                proxy: 'SOXX',   vol: 0.2804, cagr: 0.2757, dd: -0.407, months: 158, since: '2013-09' },
  QNT:   { he: 'מחשוב קוונטי',                proxy: 'QTUM',   vol: 0.2579, cagr: 0.2434, dd: -0.344, months:  98, since: '2018-09' },
  ROB:   { he: 'רובוטיקה ובינה מלאכותית',     proxy: 'BOTZ',   vol: 0.2453, cagr: 0.0829, dd: -0.519, months: 122, since: '2016-09' },
  CYB:   { he: 'סייבר',                       proxy: 'CIBR',   vol: 0.2095, cagr: 0.1651, dd: -0.283, months: 136, since: '2015-07' },
  BIO:   { he: 'ביוטק',                       proxy: 'XBI',    vol: 0.2915, cagr: 0.1021, dd: -0.567, months: 158, since: '2013-09' },
  URA:   { he: 'אורניום וגרעין',              proxy: 'URA',    vol: 0.3460, cagr: 0.0395, dd: -0.713, months: 158, since: '2013-09' },
  CLN:   { he: 'אנרגיה נקייה',                proxy: 'ICLN',   vol: 0.2614, cagr: 0.0538, dd: -0.607, months: 158, since: '2013-09' },
  MOM:   { he: 'מומנטום',                     proxy: 'MTUM',   vol: 0.1682, cagr: 0.1492, dd: -0.301, months: 158, since: '2013-09' },
  WLD:   { he: 'מדד עולמי',                   proxy: 'ACWI',   vol: 0.1386, cagr: 0.1055, dd: -0.257, months: 158, since: '2013-09' },
  SML:   { he: 'מניות קטנות',                 proxy: 'IWM',    vol: 0.1960, cagr: 0.0886, dd: -0.323, months: 158, since: '2013-09' },
  IND:   { he: 'הודו',                        proxy: 'INDA',   vol: 0.1788, cagr: 0.0684, dd: -0.340, months: 158, since: '2013-09' },
  CHN:   { he: 'טכנולוגיה סינית',             proxy: 'KWEB',   vol: 0.3275, cagr: -0.0020, dd: -0.771, months: 158, since: '2013-09' },
  GLD:   { he: 'כורות זהב',                   proxy: 'GDX',    vol: 0.3670, cagr: 0.1024, dd: -0.482, months: 158, since: '2013-09' },
  DEF:   { he: 'ביטחון ותעופה',               proxy: 'ITA',    vol: 0.2014, cagr: 0.1304, dd: -0.371, months: 158, since: '2013-09' },
} as const;

/* מתאם — כל זוג על החלון המשותף הארוך שלו, מכווץ ב-2% כדי להיות פריק */
export const KEYS = ["SP5","NDX","TEC","SEM","SOX","QNT","ROB","CYB","BIO","URA","CLN","MOM","WLD","SML","IND","CHN","GLD","DEF"] as const;
export const CORR = [[1,0.892388,0.860342,0.751562,0.729708,0.794878,0.819966,0.699818,0.523124,0.476574,0.577906,0.8183,0.95207,0.839664,0.535374,0.280084,0.218638,0.706972],[0.892388,1,0.947464,0.838292,0.81732,0.859264,0.841134,0.743526,0.54145,0.430416,0.578592,0.826826,0.858186,0.709422,0.446488,0.28812,0.157976,0.530278],[0.860342,0.947464,1,0.857206,0.838782,0.85652,0.798406,0.741468,0.44492,0.402682,0.544096,0.80654,0.821044,0.658658,0.410032,0.221382,0.124362,0.522732],[0.751562,0.838292,0.857206,1,0.96677,0.903952,0.802914,0.588392,0.461972,0.400232,0.556248,0.719712,0.75019,0.6566,0.370636,0.288414,0.147882,0.469714],[0.729708,0.81732,0.838782,0.96677,1,0.898072,0.783902,0.577514,0.463246,0.391706,0.562814,0.716086,0.728728,0.660324,0.35035,0.259798,0.131026,0.471282],[0.794878,0.859264,0.85652,0.903952,0.898072,1,0.830746,0.66836,0.562618,0.489314,0.613872,0.763616,0.806736,0.751758,0.413462,0.268422,0.207466,0.558208],[0.819966,0.841134,0.798406,0.802914,0.783902,0.830746,1,0.620536,0.599074,0.470204,0.607208,0.734608,0.845152,0.746858,0.447076,0.327516,0.265384,0.58163],[0.699818,0.743526,0.741468,0.588392,0.577514,0.66836,0.620536,1,0.569674,0.31654,0.488922,0.660324,0.66542,0.628964,0.35672,0.154252,0.091924,0.494998],[0.523124,0.54145,0.44492,0.461972,0.463246,0.562618,0.599074,0.569674,1,0.238532,0.457366,0.537824,0.52283,0.671888,0.30233,0.33173,0.101332,0.439236],[0.476574,0.430416,0.402682,0.400232,0.391706,0.489314,0.470204,0.31654,0.238532,1,0.44639,0.387492,0.508032,0.453348,0.28812,0.205114,0.360346,0.388668],[0.577906,0.578592,0.544096,0.556248,0.562814,0.613872,0.607208,0.488922,0.457366,0.44639,1,0.548016,0.642978,0.596036,0.457366,0.398272,0.31997,0.475202],[0.8183,0.826826,0.80654,0.719712,0.716086,0.763616,0.734608,0.660324,0.537824,0.387492,0.548016,1,0.795074,0.704522,0.443548,0.205408,0.154546,0.60858],[0.95207,0.858186,0.821044,0.75019,0.728728,0.806736,0.845152,0.66542,0.52283,0.508032,0.642978,0.795074,1,0.834274,0.587902,0.379064,0.299488,0.717066],[0.839664,0.709422,0.658658,0.6566,0.660324,0.751758,0.746858,0.628964,0.671888,0.453348,0.596036,0.704522,0.834274,1,0.47922,0.296646,0.149744,0.744408],[0.535374,0.446488,0.410032,0.370636,0.35035,0.413462,0.447076,0.35672,0.30233,0.28812,0.457366,0.443548,0.587902,0.47922,1,0.185514,0.175224,0.430808],[0.280084,0.28812,0.221382,0.288414,0.259798,0.268422,0.327516,0.154252,0.33173,0.205114,0.398272,0.205408,0.379064,0.296646,0.185514,1,0.184142,0.222166],[0.218638,0.157976,0.124362,0.147882,0.131026,0.207466,0.265384,0.091924,0.101332,0.360346,0.31997,0.154546,0.299488,0.149744,0.175224,0.184142,1,0.19159],[0.706972,0.530278,0.522732,0.469714,0.471282,0.558208,0.58163,0.494998,0.439236,0.388668,0.475202,0.60858,0.717066,0.744408,0.430808,0.222166,0.19159,1]];

export type SleeveKey = typeof KEYS[number];

/** הקרן האירית הצוברת שבה הרכיב נקנה בפועל.
 *  ter/acc אומתו ב-KID או בדף המוצר של המנפיק, אוקטובר 2026.
 *  tase — מספר הנייר, אומת בפיד הניירות של הבורסה בתל אביב.
 *  px   — איכות הפרוקסי שעליו נמדדו התנודתיות והמתאם:
 *         'same'  = הנייר האמריקאי עוקב **בדיוק אותו מדד**.
 *         'near'  = מדד דומה אך **לא זהה** — התנודתיות מהימנה, התשואה פחות.
 */
export interface Fund {
  tick: string; name: string; isin: string; ter: number | null;
  tase: string | null; px: 'same' | 'near'; aum?: string; note?: string;
  /** תמורה יומית בת״א בשקלים, 30.10.2026 — אומת בדף המסחר של הבורסה.
   *  0 = לא נסחרה באותו יום כלל. חסר = טרם החלה להיסחר. */
  turn?: number;
}

export const FUND: Partial<Record<SleeveKey, Fund>> = {
  SP5: { tick: 'CSPX', name: 'iShares Core S&P 500', isin: 'IE00B5BMR087',
         ter: 0.0007, tase: '1159250', px: 'same', aum: '154.5B',
         turn: 5344727 },
  NDX: { tick: 'CNDX', name: 'iShares Nasdaq 100', isin: 'IE00B53SZB19',
         ter: 0.0030, tase: '1159243', px: 'same', aum: '30.6B',
         turn: 1877032 },
  TEC: { tick: 'IUIT', name: 'iShares S&P 500 Information Technology',
         isin: 'IE00B3WJKG14', ter: 0.0015, tase: '1159193', px: 'near', aum: '19.5B',
         note: 'האירית עוקבת S&P 500 Capped 35/20 Information Technology; הנייר '
             + 'שעליו נמדד (XLK) עוקב Technology Select Sector. דומה, לא זהה.',
         turn: 46144 },
  WLD: { tick: 'SSAC', name: 'iShares MSCI All Country World', isin: 'IE00B6R52259',
         ter: 0.0020, tase: '1159235', px: 'same',
         turn: 4418821 },
  SEM: { tick: 'SMH', name: 'VanEck Semiconductor UCITS', isin: 'IE00BMC38736',
         ter: 0.0035, tase: null, px: 'near', aum: '8.3B',
         note: 'ל-VanEck אין רישום בבורסה בתל אביב כלל, ולכן נדרש ברוקר אירופי. '
             + 'האלטרנטיבה שכן תהיה בת״א מ-5.11.2026 היא iShares 1248376. '
             + 'והמדד: האירית על MarketVector US Listed Semiconductor 10% Capped '
             + 'Screened, האמריקאית שעליה נמדד על גרסת ה-25 בלי תקרה וסינון.' },
  // נרשמה למסחר בתל אביב ב-14.10.2026, נייר 1248376, מתחילה להיסחר 5.11.2026.
  // זו הקרן האירית הצוברת **הראשונה על שבבים** שתהיה נגישה בשקלים בת״א.
  SOX: { tick: 'SEMI', name: 'iShares MSCI Global Semiconductors', isin: 'IE000I8KRLL9',
         ter: 0.0035, tase: '1248376', px: 'near', aum: '5.6B',
         note: 'נרשמה לת״א ומתחילה להיסחר 5.11.2026 — הקרן האירית הצוברת '
             + 'הראשונה על שבבים שנגישה בשקלים. המדד גלובלי (ACWI IMI, כולל '
             + 'קטנות ומתעוררות) עם סינון ESG ותקרה — שונה מ-PHLX שעליו נמדד.' },
  QNT: { tick: 'QNTM', name: 'VanEck Quantum Computing UCITS', isin: 'IE0007Y8Y157',
         ter: 0.0055, tase: null, px: 'near', aum: '782M',
         note: 'הגדולה והוותיקה מבין שלוש קרנות הקוונטים האיריות — הושקה '
             + '21.5.2025, שכפול מלא ובלי השאלת ניירות. אין אף קרן קוונטים '
             + 'בבורסה בתל אביב, ולכן נדרש ברוקר אירופי. והמדד: '
             + 'MarketVector Global Quantum Leaders, שונה מזה שעליו נמדד.' },  ROB: { tick: 'RBOT', name: 'iShares Automation & Robotics', isin: 'IE00BYZK4552',
         ter: 0.0040, tase: '1159144', px: 'near',
         turn: 32259 },
  MOM: { tick: 'IWMO', name: 'iShares Edge MSCI World Momentum Factor',
         isin: 'IE00BP3QZ825', ter: 0.0025, tase: null, px: 'near', aum: '6.4B',
         note: 'המדד עולמי; הנייר שעליו נמדד אמריקאי בלבד. דומה, לא זהה.' },
  // נרשמה לת״א ב-14.10.2026, נייר 1248384, מתחילה להיסחר 5.11.2026
  IND: { tick: 'NDIA', name: 'iShares MSCI India', isin: 'IE00BZCQB185',
         ter: 0.0065, tase: '1248384', px: 'same', aum: '4.8B',
         note: 'מתחילה להיסחר בת״א 5.11.2026. מדד זהה לנייר שעליו נמדד.' },
  CHN: { tick: 'KWEB', name: 'KraneShares CSI China Internet', isin: 'IE00BFXR7892',
         ter: 0.0075, tase: null, px: 'same', aum: '750M',
         note: 'מדד זהה לנייר שעליו נמדד. ברוקר אירופי — אינה בת״א.' },
  GLD: { tick: 'GDX', name: 'VanEck Gold Miners UCITS', isin: 'IE00BQQP9F84',
         ter: 0.0053, tase: null, px: 'same', aum: '4.0B',
         note: 'ב-19.9.2025 **הוחלף המדד** מ-NYSE Arca Gold Miners ל-'
             + 'MarketVector Global Gold Miners (MVGDXTR) — שינוי מתודולוגי '
             + 'מהותי. מחזיקה 59 מניות, קנדה 47.8% וארה״ב 21.8%. '
             + 'ל-VanEck אין רישום בת״א כלל.' },
  SML: { tick: 'ZPRR', name: 'SPDR Russell 2000 US Small Cap', isin: 'IE00BJ38QD84',
         ter: 0.0030, tase: null, px: 'same', aum: '4.8B',
         note: 'מדד זהה. ברוקר אירופי — אינה בת״א.' },
};

/** חלופות על אותו מדד, אומתו ב-KIID או בדף מוצר, אוקטובר 2026.
 *  swap=true — הקרן אינה מחזיקה את המניות אלא חוזה חילופין, ולכן נושאת
 *  סיכון צד נגדי שלקרן פיזית אין. */
export const ALT: Partial<Record<SleeveKey, Array<{
  tick: string; name: string; isin: string; ter: number; aum: string; swap?: boolean;
  /** מספר נייר בת״א — אם קיים, נקנית בשקלים דרך ברוקר ישראלי */
  tase?: string;
  /** תמורה יומית בת״א בשקלים, 30.10.2026 — אומת בדף המסחר של הבורסה.
   *  0 = לא נסחרה באותו יום כלל. */
  turn?: number;
}>>> = {
  SP5: [
    { tick: 'SPYL', name: 'SPDR S&P 500', isin: 'IE000XZSV718', ter: 0.0003, aum: '19.2B' },
    { tick: 'VUAA', name: 'Vanguard S&P 500', isin: 'IE00BFMXXD54', ter: 0.0007, aum: '36.3B' },
    { tick: 'SPXS', name: 'Invesco S&P 500 Swap', isin: 'IE00B3YCGJ38', ter: 0.0005, aum: '59.0B',
      swap: true, tase: '1183441', turn: 5355148 },
  ],
  NDX: [
    { tick: 'XNAS', name: 'Xtrackers Nasdaq 100', isin: 'IE00BMFKG444', ter: 0.0020, aum: '2.8B' },
    { tick: 'EQAC', name: 'Invesco EQQQ Nasdaq-100 Acc', isin: 'IE00BFZXGZ54', ter: 0.0030, aum: '21.6B' },
    { tick: 'EQQS', name: 'Invesco Nasdaq-100 Swap', isin: 'IE00BNRQM384', ter: 0.0020, aum: '3.2B',
      swap: true, tase: '1186063', turn: 2920432 },
  ],
  WLD: [
    { tick: 'FWRA', name: 'Invesco FTSE All-World', isin: 'IE000716YHJ7', ter: 0.0015,
      aum: '4.3B', tase: '1209220', turn: 8187506 },
    { tick: 'MXWO', name: 'Invesco MSCI World', isin: 'IE00B60SX394',
      ter: 0.0005, aum: '10.3B', swap: true, tase: '1185164', turn: 2848487 },
    { tick: 'ACWD', name: 'SPDR MSCI ACWI', isin: 'IE00B44Z5B48', ter: 0.0012, aum: '19.9B' },
    { tick: 'VWRA', name: 'Vanguard FTSE All-World', isin: 'IE00BK5BQT80', ter: 0.0014, aum: '60.2B' },
    { tick: 'IWDA', name: 'iShares Core MSCI World', isin: 'IE00B4L5Y983', ter: 0.0020, aum: '147.2B' },
  ],
  SOX: [
    { tick: 'SEMI', name: 'iShares MSCI Global Semiconductors', isin: 'IE000I8KRLL9', ter: 0.0035,
      aum: '5.6B', tase: '1248376' },
  ],
  QNT: [
    { tick: 'WQTM', name: 'WisdomTree Quantum Computing', isin: 'IE000W8WMSL2', ter: 0.0050, aum: '371M' },
    { tick: 'QANT', name: 'iShares Quantum Computing', isin: 'IE000C6ITGC8', ter: 0.0050, aum: '69M' },
  ],
  GLD: [
    { tick: 'SPGP', name: 'iShares Gold Producers', isin: 'IE00B6R52036', ter: 0.0055, aum: '3.3B' },
  ],
  TEC: [
    { tick: 'XUTC', name: 'Xtrackers MSCI USA Info Tech 1C', isin: 'IE0000K7HU41', ter: 0.0012, aum: '1.8B' },
    { tick: 'WTEC', name: 'SPDR MSCI World Technology', isin: 'IE00BYTRRD19', ter: 0.0030, aum: '1.3B' },
    { tick: 'XLKS', name: 'Invesco Technology S&P US Select Swap', isin: 'IE00B3VSSL01', ter: 0.0014, aum: '2.7B', swap: true },
  ],
};

/** הנחות תשואה מפורסמות — רק מה שיש לו מקור כתוב. */
export const ASSUME: Partial<Record<SleeveKey, { pess: number; real: number; src: string }>> = {
  // **ביטקוין הוסר מהקטלוג ב-4.11.2026, ואין לו שורה כאן.** הוא היה
  // רץ על תרחיש של ג׳יי-פי מורגן ולא על שורה במטריצת ההנחות שלה — מורגן
  // כותבת במפורש שמוקדם מדי לשלב אותו במטריצות. ממילא אין קרן אירית
  // צוברת על קריפטו: UCITS אוסרת.
  SEM: { pess: 0.1072, real: 0.1072,
         src: 'Damodaran NYU, ינואר 2026 · Semiconductor · 66 פירמות · בטא 1.52' },
  SOX: { pess: 0.1072, real: 0.1072,
         src: 'Damodaran NYU, ינואר 2026 · Semiconductor · 66 פירמות · בטא 1.52' },
  // התיקון: 9.64% הוא Software (System & Application) בלבד — לא ״תוכנה וחומרה״.
  // הרכיב עוקב S&P 500 Information Technology, שכמחציתו שבבים, ולכן בלנד אמיתי
  // היה יוצא גבוה יותר. 9.64% נשאר כאן בכוונה כהנחה **שמרנית**.
  TEC: { pess: 0.0964, real: 0.0964,
         src: 'Damodaran NYU, ינואר 2026 · Software (System & Application) · 309 פירמות · '
            + 'שמרני: המדד עצמו כמחציתו שבבים, ובלנד היה גבוה יותר' },
  BIO: { pess: 0.0901, real: 0.0901,
         src: 'Damodaran NYU, ינואר 2026 · Drugs (Biotechnology) · 496 פירמות · בטא 1.14' },
  CLN: { pess: 0.0777, real: 0.0777,
         src: 'Damodaran NYU, ינואר 2026 · Green & Renewable Energy · 15 פירמות · בטא 0.86' },
  DEF: { pess: 0.0817, real: 0.0817,
         src: 'Damodaran NYU, ינואר 2026 · Aerospace/Defense · 79 פירמות · בטא 0.95' },
  GLD: { pess: 0.0768, real: 0.0768,
         src: 'Damodaran NYU, ינואר 2026 · Precious Metals · 56 פירמות · בטא 0.84' },
};
/** דירוג הרכיבים לפי מה שנמדד, לתצוגה. */
export const BY_RETURN = [...KEYS].sort((a, b) => MEASURED[b].cagr - MEASURED[a].cagr);

/** המתאם בין שני רכיבים, מהמטריצה המדודה. */
export const corr = (a: SleeveKey, b: SleeveKey) =>
  CORR[KEYS.indexOf(a)][KEYS.indexOf(b)];
