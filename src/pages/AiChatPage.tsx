import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { useLangStore } from '../store/langStore';


interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SYSTEM_PROMPT = `You are MGS AI — a knowledgeable, friendly investment education assistant built into the MGS wealth simulator platform.

Your role:
- Help users understand long-term investing concepts
- Explain ETFs, index funds, allocation strategies, rebalancing, the 4% rule, dividend investing
- Provide educational information about specific ETFs (VOO, QQQ, SCHD, VYM, VXUS, GLD, etc.)
- Help users think about their investment strategy
- Answer questions about portfolio allocation, risk management, compound growth

Important rules:
- You are NOT a financial advisor. Always remind users this is educational only.
- Never give specific buy/sell recommendations
- Focus on long-term passive investing education
- Be encouraging and supportive of disciplined investing
- Keep answers concise and beginner-friendly
- You can discuss ETF characteristics (expense ratios, holdings, historical performance patterns) as public educational info
- Support both Hebrew and English based on the user's language preference`;

export function AiChatPage() {
  const { lang } = useLangStore();
  const { currentPortfolioValue, allocations, monthlyDeposit, goal, getTotalDeposited, getProfit } = useStore();
  const isRtl = lang === 'he';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: lang === 'he'
        ? 'שלום! אני העוזר החכם של MGS. אני יכול לעזור לך להבין אסטרטגיות השקעה, תעודות סל, הקצאת תיק ועוד. מה תרצה לדעת?'
        : 'Hi! I\'m MGS\'s AI assistant. I can help you understand investment strategies, ETFs, portfolio allocation, and more. What would you like to know?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const portfolioContext = `
User's current portfolio context:
- Portfolio value: ₪${currentPortfolioValue.toLocaleString()}
- Total deposited: ₪${getTotalDeposited().toLocaleString()}
- Profit: ₪${getProfit().toLocaleString()}
- Monthly deposit: ₪${monthlyDeposit.toLocaleString()}
- Target: ₪${goal.targetAmount.toLocaleString()}
- Allocations: ${allocations.filter(a => a.targetPercent > 0).map(a => `${a.label}: ${a.targetPercent}% target, ₪${a.currentValue.toLocaleString()} current`).join('; ')}
- Language: ${lang === 'he' ? 'Hebrew' : 'English'}
`;

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT + '\n\n' + portfolioContext },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: input.trim() },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const aiContent = data.choices?.[0]?.message?.content || (lang === 'he' ? 'מצטער, לא הצלחתי לעבד את הבקשה.' : 'Sorry, I couldn\'t process that request.');

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date(),
      }]);
    } catch {
      // Fallback to local smart responses
      const aiResponse = generateLocalResponse(input.trim(), lang);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const [apiKey, setApiKey] = useState(localStorage.getItem('openai_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(!apiKey);

  function getApiKey() {
    return apiKey;
  }

  const saveKey = () => {
    localStorage.setItem('openai_key', apiKey);
    setShowKeyInput(false);
  };

  const suggestedQuestions = lang === 'he'
    ? ['מה ההבדל בין VOO ל-SPY?', 'איך עובד כלל ה-4%?', 'מתי כדאי לעשות איזון מחדש?', 'מה זה SCHD?', 'כמה כסף צריך כדי לפרוש?']
    : ['What\'s the difference between VOO and SPY?', 'How does the 4% rule work?', 'When should I rebalance?', 'What is SCHD?', 'How much do I need to retire?'];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* API Key setup */}
      {showKeyInput && (
        <div className="bg-surface-2 rounded-2xl border border-gold-border p-5 mb-4 animate-fade-in">
          <h3 className="text-sm font-semibold text-gold-light mb-2">
            {lang === 'he' ? 'הגדרת מפתח OpenAI' : 'Setup OpenAI API Key'}
          </h3>
          <p className="text-xs text-text-muted mb-3">
            {lang === 'he'
              ? 'הזן מפתח API של OpenAI כדי להפעיל את הצ׳אט. המפתח נשמר רק בדפדפן שלך.'
              : 'Enter your OpenAI API key to enable AI chat. The key is stored only in your browser.'}
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="flex-1"
            />
            <button onClick={saveKey} className="px-4 py-2 rounded-xl text-xs font-medium" style={{ background: 'linear-gradient(135deg, #B8941F, #D4AF37)', color: '#0D0D0D' }}>
              {lang === 'he' ? 'שמור' : 'Save'}
            </button>
          </div>
          <button onClick={() => setShowKeyInput(false)} className="text-[10px] text-text-dim mt-2 hover:text-text-muted">
            {lang === 'he' ? 'דלג (ישתמש בתשובות מקומיות)' : 'Skip (will use local responses)'}
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-gold-muted border border-gold-border text-text'
                : 'bg-surface-2 border border-[#222] text-text'
            }`}>
              {msg.role === 'assistant' && <span className="text-gold text-xs font-medium">✦ MGS AI</span>}
              <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-2 border border-[#222] rounded-2xl px-4 py-3">
              <span className="text-gold text-xs font-medium">✦ MGS AI</span>
              <div className="flex gap-1 mt-2">
                <span className="w-2 h-2 bg-gold/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gold/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gold/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => { setInput(q); }}
              className="px-3 py-1.5 rounded-xl text-[11px] bg-surface-3 border border-surface-4 text-text-muted hover:border-gold/30 hover:text-gold transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t border-[#222]">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder={lang === 'he' ? 'שאל שאלה על השקעות...' : 'Ask about investing...'}
          className="flex-1"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-30"
          style={{ background: 'linear-gradient(135deg, #B8941F, #D4AF37, #F5E6A3)', color: '#0D0D0D' }}
        >
          {lang === 'he' ? 'שלח' : 'Send'}
        </button>
        {apiKey && (
          <button onClick={() => setShowKeyInput(true)} className="px-2 py-2 text-text-dim hover:text-gold text-xs transition-colors" title="API Key">
            ⚙
          </button>
        )}
      </div>

      <p className="text-[9px] text-text-dim text-center mt-2">
        {lang === 'he' ? 'כלי חינוכי בלבד. אין זו המלצת השקעה.' : 'Educational tool only. Not financial advice.'}
      </p>
    </div>
  );
}

function generateLocalResponse(question: string, lang: string): string {
  const q = question.toLowerCase();
  const he = lang === 'he';

  if (q.includes('voo') || q.includes('spy') || q.includes('ivv') || q.includes('s&p')) {
    return he
      ? 'VOO, SPY ו-IVV הן שלוש תעודות סל עוקבות מדד S&P 500. ההבדלים העיקריים:\n\n• VOO (Vanguard) — דמי ניהול 0.03%, הכי זולה\n• SPY (SPDR) — דמי ניהול 0.09%, הכי ותיקה ונזילה\n• IVV (iShares) — דמי ניהול 0.03%, דומה ל-VOO\n\nלטווח ארוך, VOO או IVV עדיפות בגלל דמי הניהול הנמוכים. SPY מתאימה יותר לסוחרים פעילים בגלל הנזילות הגבוהה.\n\n⚠️ זהו מידע חינוכי בלבד.'
      : 'VOO, SPY, and IVV all track the S&P 500 index. Key differences:\n\n• VOO (Vanguard) — 0.03% expense ratio, cheapest\n• SPY (SPDR) — 0.09% expense ratio, most liquid & oldest\n• IVV (iShares) — 0.03% expense ratio, similar to VOO\n\nFor long-term holding, VOO or IVV are preferred due to lower fees. SPY is better for active traders due to higher liquidity.\n\n⚠️ Educational information only.';
  }

  if (q.includes('4%') || q.includes('four percent') || q.includes('כלל')) {
    return he
      ? 'כלל ה-4% הוא הנחיה לפרישה שפותחה ממחקר Trinity Study:\n\n• משוך 4% מהתיק בשנה הראשונה לפרישה\n• בכל שנה אחר כך, עדכן לפי אינפלציה\n• סטטיסטית, הכסף צריך להחזיק מעמד 30 שנה\n\nדוגמה: תיק של ₪2,000,000\n• 4% = ₪80,000 בשנה = ₪6,667 בחודש\n\nגרסה שמרנית: 3% (בטוחה יותר)\nגרסה אגרסיבית: 5% (סיכון גבוה יותר)\n\n⚠️ מידע חינוכי בלבד.'
      : 'The 4% Rule is a retirement guideline from the Trinity Study:\n\n• Withdraw 4% of your portfolio in the first year of retirement\n• Adjust for inflation each subsequent year\n• Statistically, your money should last 30 years\n\nExample: ₪2,000,000 portfolio\n• 4% = ₪80,000/year = ₪6,667/month\n\nConservative: 3% (safer)\nAggressive: 5% (higher risk)\n\n⚠️ Educational information only.';
  }

  if (q.includes('rebalance') || q.includes('איזון')) {
    return he
      ? 'איזון מחדש (Rebalancing) הוא תהליך של החזרת התיק להקצאת היעד:\n\n• כשנכס עולה מאוד, הוא הופך לחלק גדול מדי מהתיק\n• כשנכס יורד, הוא הופך לחלק קטן מדי\n\nמתי לאזן?\n• כל רבעון (כל 3 חודשים)\n• כשסטייה עולה על 5% מהיעד\n• עם כל הפקדה חדשה (הכי יעיל)\n\nהדרך הטובה ביותר: לכוון הפקדות חדשות לנכסים שמתחת ליעד. כך נמנעים ממכירה ומאירועי מס.\n\n⚠️ מידע חינוכי בלבד.'
      : 'Rebalancing means bringing your portfolio back to target allocation:\n\n• When an asset rises a lot, it becomes too large a portion\n• When an asset falls, it becomes too small\n\nWhen to rebalance?\n• Every quarter (3 months)\n• When drift exceeds 5% from target\n• With each new deposit (most efficient)\n\nBest approach: Direct new deposits to underweight assets. This avoids selling and tax events.\n\n⚠️ Educational information only.';
  }

  if (q.includes('schd') || q.includes('dividend') || q.includes('דיבידנד')) {
    return he
      ? 'SCHD (Schwab US Dividend Equity ETF) היא אחת מתעודות הסל הפופולריות ביותר לדיבידנדים:\n\n• דמי ניהול: 0.06%\n• תשואת דיבידנד: ~3.5%\n• מתמקדת בחברות אמריקאיות עם היסטוריה של דיבידנדים\n\nתעודות דיבידנד נוספות:\n• VYM — תשואה ~3%, רחבה יותר\n• DGRO — מתמקדת בצמיחת דיבידנד\n• HDV — תשואה גבוהה ~3.8%\n\nדיבידנדים מתאימים לשלב ההכנסה, לא לשלב הצמיחה.\n\n⚠️ מידע חינוכי בלבד.'
      : 'SCHD (Schwab US Dividend Equity ETF) is one of the most popular dividend ETFs:\n\n• Expense ratio: 0.06%\n• Dividend yield: ~3.5%\n• Focuses on US companies with strong dividend history\n\nOther dividend ETFs:\n• VYM — ~3% yield, broader\n• DGRO — focuses on dividend growth\n• HDV — higher yield ~3.8%\n\nDividend ETFs are best for the income phase, not the growth phase.\n\n⚠️ Educational information only.';
  }

  if (q.includes('retire') || q.includes('פרישה') || q.includes('כמה כסף')) {
    return he
      ? 'כמה כסף צריך כדי לפרוש? תלוי בהוצאות החודשיות שלך:\n\nנוסחה: הוצאה חודשית × 12 × 25 = סכום היעד\n(זה כלל ה-4% הפוך)\n\nדוגמאות:\n• ₪10,000/חודש → ₪3,000,000\n• ₪15,000/חודש → ₪4,500,000\n• ₪20,000/חודש → ₪6,000,000\n\nטיפים:\n• קח בחשבון אינפלציה\n• ביטוח בריאות הוא הוצאה משמעותית\n• התחל מוקדם = צריך פחות כל חודש\n\n⚠️ מידע חינוכי בלבד.'
      : 'How much do you need to retire? It depends on your monthly expenses:\n\nFormula: Monthly expense × 12 × 25 = Target amount\n(This is the 4% rule in reverse)\n\nExamples:\n• ₪10,000/month → ₪3,000,000\n• ₪15,000/month → ₪4,500,000\n• ₪20,000/month → ₪6,000,000\n\nTips:\n• Account for inflation\n• Health insurance is a significant expense\n• Starting early = need less per month\n\n⚠️ Educational information only.';
  }

  if (q.includes('bitcoin') || q.includes('btc') || q.includes('ביטקוין') || q.includes('crypto') || q.includes('קריפטו')) {
    return he
      ? 'ביטקוין כחלק מתיק השקעות לטווח ארוך:\n\n• ביטקוין תנודתי מאוד — עליות וירידות של 50%+ אפשריות\n• ההקצאה המומלצת: 5-15% מהתיק (לא יותר)\n• תעודות סל לביטקוין: IBIT (BlackRock), FBTC (Fidelity)\n• דמי ניהול: ~0.25%\n\nיתרונות: גיוון, פוטנציאל צמיחה גבוה\nחסרונות: תנודתיות קיצונית, אין דיבידנדים\n\nחשוב: אל תשקיע יותר ממה שאתה מוכן להפסיד.\n\n⚠️ מידע חינוכי בלבד.'
      : 'Bitcoin as part of a long-term portfolio:\n\n• Bitcoin is highly volatile — 50%+ swings are possible\n• Recommended allocation: 5-15% of portfolio (no more)\n• Bitcoin ETFs: IBIT (BlackRock), FBTC (Fidelity)\n• Expense ratio: ~0.25%\n\nPros: Diversification, high growth potential\nCons: Extreme volatility, no dividends\n\nImportant: Never invest more than you can afford to lose.\n\n⚠️ Educational information only.';
  }

  return he
    ? 'שאלה מעניינת! כרגע אני עובד במצב מקומי ויכול לענות על שאלות נפוצות על:\n\n• תעודות סל (VOO, SPY, QQQ, SCHD...)\n• כלל ה-4%\n• איזון מחדש\n• אסטרטגיית דיבידנדים\n• תכנון פרישה\n• ביטקוין בתיק\n\nלתשובות מתקדמות יותר, הגדר מפתח OpenAI בלחיצה על ⚙.\n\n⚠️ מידע חינוכי בלבד.'
    : 'Interesting question! I\'m currently in local mode and can answer common questions about:\n\n• ETFs (VOO, SPY, QQQ, SCHD...)\n• The 4% Rule\n• Rebalancing\n• Dividend strategy\n• Retirement planning\n• Bitcoin in portfolio\n\nFor more advanced answers, set up your OpenAI API key by clicking ⚙.\n\n⚠️ Educational information only.';
}
