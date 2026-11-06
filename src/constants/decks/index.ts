/** MGS · כל המצגות.
 *
 *  **המצגות חיות בתוך המערכת ולא כקבצים.** הסיבה אינה נוחות: שקופית
 *  שמדפיסה מספר קופאת ברגע שהמנוע מתעדכן, ושם מתחיל חומר הדרכה
 *  שסותר את הכלי שהוא מלמד. כאן השקופיות **שואלות את אותו קטלוג
 *  ואת אותו מנוע**, ולכן זה לא יכול לקרות.
 */
import type { Deck } from '../../types/deck';
import { TRACKS_DECK } from './tracks';
import { DEPOSITS_DECK } from './deposits';
import { ESTATE_DECK } from './estate';
import { SYSTEM_DECK } from './system';
import { SWAP_DECK } from './swap';
import { FOURPCT_DECK } from './fourpct';
import { CHILE_DECK } from './chile';
import { CYCLE_DECK } from './cycle';
import { FUNDS_DECK } from './funds';
import { STUDY_DECK } from './study';
import { COMBOS_DECK } from './combos';
import { FLOW_COMBOS_DECK, BOTH_COMBOS_DECK, GROWTH_COMBOS_DECK} from './generated';
import { EACH_FUND_DECK } from './generated-funds';

import { BUY_DECK } from './buy';
import { MECHVS_DECK } from './mechvs';
import { MECHMIX_DECK } from './mechmix';
export const DECKS: Deck[] = [
  BUY_DECK,
  MECHMIX_DECK,
  MECHVS_DECK,
  SYSTEM_DECK,
  FUNDS_DECK,
  EACH_FUND_DECK,
  STUDY_DECK,
  TRACKS_DECK,
  COMBOS_DECK,
  FLOW_COMBOS_DECK,
  BOTH_COMBOS_DECK,
  GROWTH_COMBOS_DECK,
  DEPOSITS_DECK,
  ESTATE_DECK,
  SWAP_DECK,
  FOURPCT_DECK,
  CHILE_DECK,
  CYCLE_DECK,
];
