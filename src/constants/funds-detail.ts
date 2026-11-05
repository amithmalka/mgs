/** MGS · פרטי הקרנות — הקמה, נכסים ומה הן עוקבות.
 *
 *  **מאומת מול פקטשיט של המנפיק.** קרן שאין לה שורה כאן פשוט לא
 *  אותרה — ולא ממציאים לה תאריך.
 *
 *  **ומה שנמחק מכאן במכוון:** ניסיתי למדוד מה כל קרן עשתה בכל
 *  אפיזודת שוק מהסדרות החודשיות שבידי. **שלוש ריצות נתנו שלוש
 *  תשובות שונות**, והבדיקה גילתה למה: בסדרות של CSPX ו-SMH **חסר
 *  חודש אוקטובר בכל שנה**. נתון שנגזר מהן אינו אמין, ולכן אינו כאן.
 *  הנפילות שכן מוצגות הן **ברמת המדד**, ממקורות שאומתו בנפרד.
 */

export interface FundDetail {
  /** תאריך השקת הקרן האירית */
  born: string;
  /** נכסים מנוהלים, לפי הפקטשיט */
  aum: string;
  /** המנפיק */
  by: string;
  /** המדד שאחריו היא עוקבת, בשמו המלא */
  index: string;
}

export const DETAIL: Record<string, FundDetail> = {
  CSPX: { born: '19.5.2010',  aum: '$157.6 מיליארד', by: 'BlackRock · iShares', index: 'S&P 500' },
  VUAA: { born: '14.5.2019',  aum: '$36.3 מיליארד',  by: 'Vanguard',           index: 'S&P 500' },
  SPXS: { born: '20.5.2010',  aum: '$59.0 מיליארד',  by: 'Invesco',            index: 'S&P 500 · חוזה חילופין' },
  CNDX: { born: '26.1.2010',  aum: '$31.3 מיליארד',  by: 'BlackRock · iShares', index: 'NASDAQ-100' },
  EQQS: { born: '22.3.2021',  aum: '$3.2 מיליארד',   by: 'Invesco',            index: 'NASDAQ-100 · חוזה חילופין' },
  SMH:  { born: '1.12.2020',  aum: '$8.3 מיליארד',   by: 'VanEck',             index: 'MarketVector US Listed Semiconductor 10% Capped' },
  SEMI: { born: '3.8.2021',   aum: '$6.6 מיליארד',   by: 'BlackRock · iShares', index: 'MSCI ACWI IMI Semiconductors & Semiconductor Equipment ESG Screened Capped' },
  IUIT: { born: '20.11.2015', aum: '$20.6 מיליארד',  by: 'BlackRock · iShares', index: 'S&P 500 Capped 35/20 Information Technology' },
  XLKS: { born: '16.12.2009', aum: '$2.7 מיליארד',   by: 'Invesco',            index: 'S&P Select Sector Capped 20% Technology · חוזה חילופין' },
  IWDA: { born: '25.9.2009',  aum: '$150.1 מיליארד', by: 'BlackRock · iShares', index: 'MSCI World' },
  SSAC: { born: '21.10.2011', aum: '$36.2 מיליארד',  by: 'BlackRock · iShares', index: 'MSCI ACWI — כל העולם, כולל מתעוררים' },
  VWRA: { born: '23.7.2019',  aum: '$62.2 מיליארד',  by: 'Vanguard',           index: 'FTSE All-World' },
  GDX:  { born: '25.3.2015',  aum: '$3.9 מיליארד',   by: 'VanEck',             index: 'MarketVector Global Gold Miners — **הוחלף ב-19.9.2025**' },
  SPGP: { born: '16.9.2011',  aum: '$3.9 מיליארד',   by: 'BlackRock · iShares', index: 'S&P Commodity Producers Gold' },
  KWEB: { born: '21.11.2018', aum: '$666 מיליון',    by: 'KraneShares',        index: 'CSI Overseas China Internet' },
  RBOT: { born: '8.9.2016',   aum: '$5.5 מיליארד',   by: 'BlackRock · iShares', index: 'STOXX Global Automation & Robotics' },
  BCHN: { born: '8.3.2019',   aum: '$1.11 מיליארד',  by: 'Invesco · CoinShares', index: 'CoinShares Blockchain Global Equity' },
  IWMO: { born: '3.10.2014',  aum: '$5.9 מיליארד',   by: 'BlackRock · iShares', index: 'MSCI World Momentum' },
  NDIA: { born: '24.5.2018',  aum: '$5.0 מיליארד',   by: 'BlackRock · iShares', index: 'MSCI India' },
};

/** **הנפילות ההיסטוריות — ברמת המדד, לא ברמת הקרן.**
 *
 *  הקרנות צעירות; המדדים שהן עוקבות אחריהם ותיקים. אלה הנפילות
 *  שהמדד באמת ספג, מסגירה לסגירה, עם זמן ההתאוששות המלא. */
export interface IndexCrash { what: string; fell: string; when: string; back: string }

export const CRASH: Record<string, IndexCrash[]> = {
  sp500: [
    { what: 'השפל הגדול',   fell: '−86%', when: '1929→1932',        back: '25.0 שנים' },
    { what: 'זעזוע הנפט',   fell: '−48%', when: '1973→1974',        back: '7.5 שנים' },
    { what: 'בועת הדוט-קום', fell: '−49%', when: '3.2000→10.2002',  back: '7.2 שנים' },
    { what: 'המשבר הפיננסי', fell: '−57%', when: '10.2007→3.2009',  back: '5.5 שנים' },
    { what: 'קורונה',       fell: '−34%', when: '19.2→23.3.2020',   back: '6 חודשים' },
    { what: 'שנת 2022',     fell: '−25%', when: '1.2022→10.2022',   back: '2.0 שנים' },
  ],
  nasdaq: [
    { what: 'בועת הדוט-קום', fell: '−83%', when: '3.2000→10.2002',  back: '15.6 שנים' },
    { what: 'המשבר הפיננסי', fell: '−54%', when: '10.2007→11.2008', back: '3.2 שנים' },
    { what: 'קורונה',       fell: '−28%', when: '2.2020→3.2020',    back: '3.5 חודשים' },
    { what: 'שנת 2022',     fell: '−36%', when: '11.2021→12.2022',  back: '2.1 שנים' },
  ],
  semis: [
    { what: 'דוט-קום',      fell: '−84%', when: '3.2000→10.2002',   back: '—' },
    { what: 'השיא לשפל',    fell: '−87%', when: '3.2000→11.2008',   back: '17.7 שנים' },
    { what: 'המשבר הפיננסי', fell: '−69%', when: '7.2007→11.2008',  back: '6.5 שנים' },
    { what: 'שנת 2022',     fell: '−46%', when: '12.2021→10.2022',  back: '2.0 שנים' },
    { what: '2024–25',      fell: '−40%', when: '7.2024→4.2025',    back: '1.2 שנים' },
  ],
  gold: [
    { what: 'המשבר הפיננסי', fell: '−71%', when: '3.2008→10.2008',  back: '2.5 שנים' },
    { what: 'העשור האבוד',  fell: '−81%', when: '9.2011→1.2016',    back: '**14.0 שנים**' },
    { what: 'קורונה',       fell: '−39%', when: 'מרץ 2020',         back: '5 חודשים' },
  ],
  world: [
    { what: 'דוט-קום',      fell: '−51%', when: '3.2000→10.2002',   back: '6.7 שנים' },
    { what: 'המשבר הפיננסי', fell: '−59%', when: '10.2007→3.2009',  back: '6.4 שנים' },
    { what: 'קורונה',       fell: '−34%', when: '2.2020→3.2020',    back: '6.5 חודשים' },
    { what: 'שנת 2022',     fell: '−27%', when: '1.2022→10.2022',   back: '2.1 שנים' },
  ],
};

/** איזו קבוצת נפילות רלוונטית לכל קרן */
export const CRASH_OF: Record<string, keyof typeof CRASH> = {
  CSPX: 'sp500', VUAA: 'sp500', SPXS: 'sp500',
  CNDX: 'nasdaq', EQQS: 'nasdaq',
  SMH: 'semis', SEMI: 'semis', IUIT: 'nasdaq', XLKS: 'nasdaq',
  IWDA: 'world', SSAC: 'world', VWRA: 'world', IWMO: 'world',
  GDX: 'gold', SPGP: 'gold',
};
