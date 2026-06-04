export type Lang = 'he' | 'en';

export const translations = {
  // App
  appName: { en: 'WealthSim', he: 'וולט׳סים' },
  disclaimer: { en: 'This is an educational tool. Not financial advice.', he: 'זהו כלי חינוכי בלבד. אין זו המלצת השקעה.' },

  // Tabs
  tabDashboard: { en: 'Dashboard', he: 'לוח בקרה' },
  tabPortfolio: { en: 'Portfolio', he: 'תיק השקעות' },
  tabTransactions: { en: 'Transactions', he: 'פעולות' },
  tabSimulation: { en: 'Simulation', he: 'סימולציה' },
  tabDividends: { en: 'Dividends', he: 'דיבידנדים' },
  tabGoals: { en: 'Goals', he: 'יעדים' },
  tabActivity: { en: 'Activity', he: 'פעילות' },

  // Dashboard
  portfolioValue: { en: 'Portfolio Value', he: 'שווי תיק' },
  totalDeposits: { en: 'Total Deposits', he: 'סה״כ הפקדות' },
  totalProfit: { en: 'Total Profit', he: 'סה״כ רווח' },
  monthlyDeposit: { en: 'Monthly Deposit', he: 'הפקדה חודשית' },
  progressToTarget: { en: 'Progress to Target', he: 'התקדמות ליעד' },
  target: { en: 'Target', he: 'יעד' },
  targetAllocation: { en: 'Target Allocation', he: 'הקצאה מטרה' },
  currentAllocation: { en: 'Current Allocation', he: 'הקצאה נוכחית' },
  allocationBreakdown: { en: 'Allocation Breakdown', he: 'פירוט הקצאה' },
  asset: { en: 'Asset', he: 'נכס' },
  current: { en: 'Current', he: 'נוכחי' },
  value: { en: 'Value', he: 'שווי' },
  drift: { en: 'Drift', he: 'סטייה' },
  alerts: { en: 'alerts', he: 'התראות' },

  // Phases
  growthPhase: { en: 'Growth Phase', he: 'שלב צמיחה' },
  transitionPhase: { en: 'Transition Phase', he: 'שלב מעבר' },
  incomePhase: { en: 'Income Phase', he: 'שלב הכנסה' },

  // Portfolio
  updateHoldings: { en: 'Update Current Holdings', he: 'עדכון אחזקות נוכחיות' },
  enterCurrentValue: { en: 'Enter the current value of each asset class', he: 'הזן את השווי הנוכחי של כל סוג נכס' },
  total: { en: 'Total', he: 'סה״כ' },
  editTargets: { en: 'Edit Targets', he: 'עריכת יעדים' },
  cancel: { en: 'Cancel', he: 'ביטול' },
  save: { en: 'Save', he: 'שמור' },
  rebalanceSuggestions: { en: 'Rebalance Suggestions', he: 'הצעות לאיזון מחדש' },
  howToDistribute: { en: 'How to distribute your next deposit', he: 'כיצד לחלק את ההפקדה הבאה' },
  depositAmount: { en: 'Deposit amount', he: 'סכום הפקדה' },
  etfRecommendations: { en: 'ETF Recommendations', he: 'המלצות ETF' },
  etfSubtitle: { en: 'Suggested ETFs for each asset class (not financial advice)', he: 'תעודות סל מומלצות לכל סוג נכס (לא המלצת השקעה)' },
  etfDisclaimer: { en: 'These are educational suggestions only. This is not financial advice.', he: 'אלו הצעות חינוכיות בלבד. אין זו המלצת השקעה.' },

  // Transactions
  addTransaction: { en: 'Add Transaction', he: 'הוספת פעולה' },
  deposit: { en: 'Deposit', he: 'הפקדה' },
  withdrawal: { en: 'Withdrawal', he: 'משיכה' },
  updateValue: { en: 'Update Value', he: 'עדכון שווי' },
  newPortfolioValue: { en: 'New Portfolio Value', he: 'שווי תיק חדש' },
  amount: { en: 'Amount', he: 'סכום' },
  date: { en: 'Date', he: 'תאריך' },
  notes: { en: 'Notes', he: 'הערות' },
  optionalNotes: { en: 'Optional notes...', he: 'הערות (אופציונלי)...' },
  autoDistribute: { en: 'Auto-distribute according to rebalance suggestions', he: 'חלוקה אוטומטית לפי הצעות איזון' },
  addDeposit: { en: 'Add Deposit', he: 'הוסף הפקדה' },
  recordWithdrawal: { en: 'Record Withdrawal', he: 'רשום משיכה' },
  transactionHistory: { en: 'Transaction History', he: 'היסטוריית פעולות' },
  noTransactions: { en: 'No transactions yet', he: 'אין פעולות עדיין' },
  transactions: { en: 'transactions', he: 'פעולות' },
  valueUpdate: { en: 'Value Update', he: 'עדכון שווי' },

  // Simulation
  simulationParams: { en: 'Simulation Parameters', he: 'פרמטרים לסימולציה' },
  initialDeposit: { en: 'Initial Deposit', he: 'הפקדה ראשונית' },
  years: { en: 'Years', he: 'שנים' },
  yearlyIncrease: { en: 'Yearly Deposit Increase', he: 'העלאה שנתית בהפקדה' },
  targetAmount: { en: 'Target Amount', he: 'סכום יעד' },
  expectedInflation: { en: 'Expected Inflation', he: 'אינפלציה צפויה' },
  conservative: { en: 'Conservative', he: 'שמרני' },
  moderate: { en: 'Moderate', he: 'מתון' },
  aggressive: { en: 'Aggressive', he: 'אגרסיבי' },
  growth: { en: 'Growth', he: 'רווח' },
  portfolioGrowth: { en: 'Portfolio Growth Over Time', he: 'צמיחת התיק לאורך זמן' },
  yearByYear: { en: 'Year-by-Year Breakdown', he: 'פירוט שנתי' },
  moderateScenario: { en: 'Moderate Scenario', he: 'תרחיש מתון' },
  year: { en: 'Year', he: 'שנה' },
  weightedReturn: { en: 'Weighted Return', he: 'תשואה משוקללת' },
  perAssetBreakdown: { en: 'Per-Asset Breakdown', he: 'פירוט לפי נכס' },
  assetReturns: { en: 'Expected Returns by Asset', he: 'תשואות צפויות לפי נכס' },
  returnRate: { en: 'Return', he: 'תשואה' },
  allocation: { en: 'Allocation', he: 'הקצאה' },
  finalValue: { en: 'Final Value', he: 'שווי סופי' },
  deposited: { en: 'Deposited', he: 'הופקד' },

  // Dividends
  fourPercentRule: { en: '4% Rule Calculator', he: 'מחשבון כלל ה-4%' },
  fourPercentSubtitle: { en: 'How much can you safely withdraw per year?', he: 'כמה ניתן למשוך בבטחה בכל שנה?' },
  safe: { en: 'Safe', he: 'בטוח' },
  standard: { en: 'Standard', he: 'סטנדרטי' },
  dividendProjection: { en: 'Dividend Income Projection', he: 'תחזית הכנסה מדיבידנדים' },
  dividendYield: { en: 'Dividend Yield', he: 'תשואת דיבידנד' },
  inYears: { en: 'In {n} years', he: 'בעוד {n} שנים' },
  transitionTitle: { en: 'Growth → Dividend Transition', he: 'מעבר צמיחה → דיבידנד' },
  transitionSubtitle: { en: 'Gradual transition plan when portfolio reaches target', he: 'תוכנית מעבר הדרגתית כשהתיק מגיע ליעד' },
  transitionAt: { en: 'Transition at', he: 'מעבר בסכום' },
  transitionNote: { en: 'When your portfolio reaches {amount}, begin gradually moving growth assets into dividend-producing ETFs (SCHD, VYM, DGRO, HDV).', he: 'כשהתיק שלך יגיע ל-{amount}, התחל להעביר בהדרגה נכסי צמיחה לתעודות סל מניבות דיבידנד (SCHD, VYM, DGRO, HDV).' },
  phase: { en: 'Phase', he: 'שלב' },
  currentGrowth: { en: 'Current (Growth)', he: 'נוכחי (צמיחה)' },
  yearlyIncome: { en: 'Yearly Income', he: 'הכנסה שנתית' },

  // Goals
  yourGoal: { en: 'Your Goal', he: 'היעד שלך' },
  setTarget: { en: 'Set your financial target', he: 'הגדר את היעד הפיננסי שלך' },
  goalName: { en: 'Goal Name', he: 'שם היעד' },
  targetMonthlyIncome: { en: 'Target Monthly Income', he: 'הכנסה חודשית יעד' },
  yearsToInvest: { en: 'Years to Invest', he: 'שנות השקעה' },
  progress: { en: 'Progress', he: 'התקדמות' },
  yearsNeeded: { en: 'Years Needed', he: 'שנים נדרשות' },
  atCurrentDeposits: { en: 'at current deposits', he: 'בקצב הפקדות נוכחי' },
  requiredMonthly: { en: 'Required Monthly', he: 'הפקדה חודשית נדרשת' },
  toReachIn: { en: 'to reach in {n} years', he: 'להגיע בעוד {n} שנים' },
  monthlyIncomeAtTarget: { en: 'Monthly Income at Target', he: 'הכנסה חודשית ביעד' },
  usingFourPercent: { en: 'using 4% rule', he: 'לפי כלל 4%' },
  currentVsRequired: { en: 'Current vs Required', he: 'נוכחי מול נדרש' },
  onTrack: { en: 'On Track', he: 'במסלול' },
  behind: { en: 'Behind', he: 'בפיגור' },
  keepItUp: { en: 'Keep it up!', he: 'המשך כך!' },
  needMore: { en: 'Need {amount} more/mo', he: 'צריך עוד {amount} לחודש' },
  milestones: { en: 'Milestones', he: 'אבני דרך' },
  reached: { en: 'Reached!', he: 'הושג!' },
  pending: { en: 'Pending', he: 'ממתין' },

  // Activity
  disciplineScore: { en: 'Investor Discipline Score', he: 'ציון משמעת משקיע' },
  depositConsistency: { en: 'Deposit Consistency', he: 'עקביות הפקדות' },
  noEarlyWithdrawals: { en: 'No Early Withdrawals', he: 'ללא משיכות מוקדמות' },
  allocationAdherence: { en: 'Allocation Adherence', he: 'הקפדה על הקצאה' },
  notifications: { en: 'Notifications', he: 'התראות' },
  unread: { en: 'unread', he: 'לא נקראו' },
  markAllRead: { en: 'Mark all as read', he: 'סמן הכל כנקרא' },
  noNotifications: { en: 'No notifications', he: 'אין התראות' },
  activityLog: { en: 'Activity Log', he: 'יומן פעילות' },
  recentActions: { en: 'Recent actions', he: 'פעולות אחרונות' },
  noActivity: { en: 'No activity yet', he: 'אין פעילות עדיין' },

  // Common
  noDataYet: { en: 'No data yet', he: 'אין נתונים עדיין' },
  yr: { en: '/yr', he: '/שנה' },
  mo: { en: '/mo', he: '/חודש' },

  // Asset names
  sp500: { en: 'S&P 500', he: 'S&P 500' },
  nasdaq: { en: 'Nasdaq', he: 'נאסד״ק' },
  bitcoin: { en: 'Bitcoin', he: 'ביטקוין' },
  dividendEtf: { en: 'Dividend ETF', he: 'תעודת דיבידנד' },
  msci: { en: 'MSCI World', he: 'MSCI עולמי' },
  bonds: { en: 'Medium-Term Bonds (IEF)', he: 'אג״ח טווח בינוני (IEF)' },

  // Tracks tab + page
  tabTracks: { en: 'Tracks', he: 'מסלולים' },
  tracksTitle: { en: 'Your Investment Track', he: 'מסלול ההשקעה שלך' },
  tracksSubtitle: { en: 'A long-term plan tailored to your age — replacing a property purchase with investments that build strong growth and high passive income within 20 years.', he: 'תוכנית ארוכת-טווח המותאמת לגיל שלך — מחליפה את קניית הדירה בהשקעות שבונות צמיחה חזקה והכנסה פאסיבית גבוהה תוך 20 שנה.' },
  yourAge: { en: 'Your Age', he: 'הגיל שלך' },
  recommendedForYou: { en: 'Recommended for you', he: 'מומלץ עבורך' },
  recommendedTrack: { en: 'Recommended track', he: 'מסלול מומלץ' },
  selectTrack: { en: 'Select this track', he: 'בחר מסלול זה' },
  selected: { en: 'Selected', he: 'נבחר' },
  ages: { en: 'Ages', he: 'גילאים' },
  chooseTrack: { en: 'Choose a Track', he: 'בחירת מסלול' },
  chooseTrackSub: { en: 'All tracks share the same traffic-light process — only the asset split differs by age.', he: 'כל המסלולים חולקים את אותו תהליך רמזור — רק חלוקת הנכסים משתנה לפי גיל.' },

  // Traffic light (רמזור)
  trafficLightTitle: { en: 'The Traffic Light Method', he: 'שיטת הרמזור' },
  trafficLightSub: { en: 'Three stages over the years — the discipline that builds the wealth.', he: 'שלושה שלבים לאורך השנים — המשמעת שבונה את ההון.' },
  redPhase: { en: 'Red', he: 'אדום' },
  yellowPhase: { en: 'Yellow', he: 'צהוב' },
  greenPhase2: { en: 'Green', he: 'ירוק' },
  redTitle: { en: 'Years 0–15 · Build', he: 'שנים 0–15 · בנייה' },
  yellowTitle: { en: 'Years 15–20 · Consolidate', he: 'שנים 15–20 · גיבוש' },
  greenTitle: { en: 'Year 20+ · Harvest', he: 'שנה 20+ · קציר' },
  redDesc: { en: 'Invest every month per your ability (₪4,000–5,000) across the full track allocation. You barely feel it moving — that is normal.', he: 'משקיעים כל חודש לפי היכולת (4,000–5,000 ₪) על פני כל הקצאת המסלול. כמעט לא מרגישים שזה זז — וזה בדיוק כמו שצריך.' },
  yellowDesc: { en: 'All new monthly deposits now flow into SCHD only. Dividends are reinvested — the income engine is being built.', he: 'כל ההפקדות החודשיות החדשות הולכות ל-SCHD בלבד. הדיבידנדים מושקעים מחדש — מנוע ההכנסה נבנה.' },
  greenDesc: { en: 'Stop depositing. SCHD dividends keep reinvesting for continued growth, and you withdraw income each year using the 4% rule.', he: 'מפסיקים להפקיד. דיבידנדי ה-SCHD ממשיכים להיות מושקעים מחדש לצמיחה, ומושכים הכנסה כל שנה לפי כלל ה-4%.' },
  trackEarlyHarvest: { en: 'This track may begin 4% withdrawals already after 15 years.', he: 'מסלול זה יכול להתחיל משיכות 4% כבר אחרי 15 שנה.' },

  // Track projection
  trackProjection: { en: 'Track Projection (Moderate Scenario)', he: 'תחזית המסלול (תרחיש מתון)' },
  atYear: { en: 'At year {n}', he: 'בשנה {n}' },
  annualIncome: { en: 'Annual income (4%)', he: 'הכנסה שנתית (4%)' },
  monthlyIncome: { en: 'Monthly income', he: 'הכנסה חודשית' },
  portfolioAtYear: { en: 'Portfolio value', he: 'שווי תיק' },

  // Apartment vs investment
  apartmentTitle: { en: 'Apartment vs. Investment', he: 'דירה מול השקעות' },
  apartmentSub: { en: 'What if you invested the down payment and monthly mortgage instead of buying a property?', he: 'מה היה קורה אם היית משקיע את ההון העצמי והמשכנתא החודשית במקום לקנות דירה?' },
  apartmentPrice: { en: 'Apartment Price', he: 'מחיר דירה' },
  downPayment: { en: 'Initial Equity (down payment)', he: 'הון עצמי התחלתי' },
  apartmentAppreciation: { en: 'Annual Appreciation', he: 'עליית ערך שנתית' },
  rentYield: { en: 'Net Rental Yield', he: 'תשואת שכירות נטו' },
  horizonYears: { en: 'Horizon', he: 'אופק' },
  buyApartment: { en: 'Buy an Apartment', he: 'קניית דירה' },
  investInstead: { en: 'Invest Instead (MGS)', he: 'להשקיע במקום (MGS)' },
  afterYears: { en: 'After {n} years', he: 'אחרי {n} שנים' },
  passiveIncome: { en: 'Passive income', he: 'הכנסה פאסיבית' },
  apartmentNote: { en: 'Educational comparison only. Assumes the same equity + monthly amount, no leverage risk modelled. Not financial advice.', he: 'השוואה חינוכית בלבד. בהנחת אותו הון עצמי + סכום חודשי, ללא מידול סיכוני מינוף. אין זו המלצת השקעה.' },
  difference: { en: 'Difference', he: 'הפרש' },

  // Track banner (shown across the system)
  currentTrack: { en: 'Your Track', he: 'המסלול שלך' },
  changeTrackHint: { en: 'Change in the Tracks tab', he: 'שינוי בטאב מסלולים' },
  trafficPlan: { en: 'Traffic-light plan', he: 'תוכנית הרמזור' },
  phaseDepositSplit: { en: 'Split deposits', he: 'הפקדה מפוצלת' },
  phaseSchdOnly: { en: 'SCHD only', he: 'SCHD בלבד' },
  phaseHarvest: { en: '4% income', he: 'הכנסה 4%' },
  simUsesTrack: { en: 'Projection follows your track’s traffic-light plan (red → yellow → green).', he: 'התחזית עוקבת אחר תוכנית הרמזור של המסלול שלך (אדום → צהוב → ירוק).' },
  incomeCol: { en: 'Income (4%)', he: 'הכנסה (4%)' },

  // Dividends — track income plan
  incomePlanTitle: { en: 'Your Track’s Income Plan', he: 'תוכנית ההכנסה של המסלול שלך' },
  incomePlanSub: { en: 'How the traffic light turns your savings into income — for the selected track.', he: 'איך הרמזור הופך את החיסכון להכנסה — עבור המסלול הנבחר.' },
  schdValue: { en: 'SCHD value', he: 'שווי SCHD' },
  dividendFromSchd: { en: 'SCHD dividend', he: 'דיבידנד SCHD' },
  totalIncome: { en: 'Total income/yr', he: 'הכנסה כוללת/שנה' },
  phaseLabel: { en: 'Phase', he: 'שלב' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Lang, params?: Record<string, string | number>): string {
  let text: string = translations[key]?.[lang] ?? translations[key]?.en ?? key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
}
