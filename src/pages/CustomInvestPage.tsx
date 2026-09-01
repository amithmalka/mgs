import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLangStore } from '../store/langStore';
import { useCustomStore } from '../store/customStore';
import { useIsAdmin } from '../lib/useIsAdmin';
import { t } from '../i18n/translations';
import { Card } from '../components/layout/Card';
import { Icon } from '../components/shared/Icon';
import { formatCurrency } from '../utils/format';
import { fetchStocks } from '../lib/customStocks';
import type { StockListData } from '../lib/customStocks';
import { fetchPrices } from '../lib/marketData';
import type { PriceInfo } from '../lib/marketData';
import { HoldingsEditor } from '../components/custom/HoldingsEditor';
import { SharedStockList } from '../components/custom/SharedStockList';
import { CustomProjection } from '../components/custom/CustomProjection';
import { RebalancePanel } from '../components/custom/RebalancePanel';
import { MonthlyTracker } from '../components/custom/MonthlyTracker';
import { blendedReturn, simulateCustom } from '../utils/customPortfolio';
import { Disclaimer } from '../components/shared/Disclaimer';

const emptyList: StockListData = { stocks: [], setupNeeded: false };

export function CustomInvestPage() {
  const { lang } = useLangStore();
  const isRtl = lang === 'he';
  const isAdmin = useIsAdmin();
  const { holdings, monthlyDeposit, horizonYears } = useCustomStore();

  const [list, setList] = useState<StockListData>(emptyList);
  const [loadingList, setLoadingList] = useState(true);
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});
  const [pricesError, setPricesError] = useState('');
  const [loadingPrices, setLoadingPrices] = useState(false);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setList(await fetchStocks());
    setLoadingList(false);
  }, []);
  useEffect(() => { loadList(); }, [loadList]);

  // Live prices for everything on screen — the student's holdings plus the
  // admin list, deduped so one ticker is never fetched twice.
  const tickers = useMemo(() => {
    const all = [...holdings.map(h => h.ticker), ...list.stocks.map(s => s.ticker)];
    return [...new Set(all.map(x => x.trim().toUpperCase()).filter(Boolean))];
  }, [holdings, list.stocks]);

  const refreshPrices = useCallback(async () => {
    if (tickers.length === 0) { setPrices({}); return; }
    setLoadingPrices(true); setPricesError('');
    try { setPrices(await fetchPrices(tickers)); }
    catch (e) { setPricesError((e as Error).message); }
    finally { setLoadingPrices(false); }
  }, [tickers]);

  useEffect(() => { refreshPrices(); }, [refreshPrices]);

  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalTarget = holdings.reduce((s, h) => s + h.targetPercent, 0);
  const blended = blendedReturn(holdings);
  const projection = useMemo(
    () => simulateCustom(holdings, monthlyDeposit, horizonYears),
    [holdings, monthlyDeposit, horizonYears]
  );
  const finalRow = projection[projection.length - 1];

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Card glow>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <h2 className="text-xl font-bold text-gold-gradient">{t('customTitle', lang)}</h2>
            <p className="text-[12px] text-text-muted mt-1.5">{t('customSubtitle', lang)}</p>
          </div>
          <button
            onClick={refreshPrices}
            disabled={loadingPrices || tickers.length === 0}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-surface-4 text-text-muted hover:text-gold hover:border-gold-border transition-colors disabled:opacity-40"
          >
            {loadingPrices ? t('loading', lang) : t('refreshPrices', lang)}
          </button>
        </div>

        {holdings.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <Stat label={t('currentValue', lang)} value={formatCurrency(totalValue)} />
            <Stat label={t('blendedReturn', lang)} value={`${blended.toFixed(1)}%`} accent />
            <Stat label={t('monthlyDepositLabel', lang)} value={formatCurrency(monthlyDeposit)} />
            <Stat
              label={t('projectedIn', lang, { years: horizonYears })}
              value={finalRow ? formatCurrency(finalRow.totalValue) : '—'}
              accent
            />
          </div>
        )}

        {/* Allocation sanity — silently-wrong weights are the easiest mistake here */}
        {holdings.length > 0 && Math.abs(totalTarget - 100) > 0.5 && (
          <p className="mt-3 text-[11px] text-warning flex items-center gap-1.5">
            <Icon name="warning" size={13} />
            {t('targetsNotHundred', lang, { total: totalTarget.toFixed(1) })}
          </p>
        )}

        {pricesError && (
          <p className="mt-3 text-[11px] text-text-dim">
            {t('pricesUnavailable', lang)} <span dir="ltr" className="font-mono">{pricesError}</span>
          </p>
        )}
      </Card>

      {/* ── The student's own portfolio ──────────────────────────────────── */}
      <HoldingsEditor prices={prices} />

      {/* ── Admin's shared recommended list ──────────────────────────────── */}
      <SharedStockList
        list={list}
        loading={loadingList}
        isAdmin={isAdmin}
        prices={prices}
        onReload={loadList}
      />

      {/* ── Projection ──────────────────────────────────────────────────── */}
      {holdings.length > 0 && <CustomProjection rows={projection} holdings={holdings} />}

      {/* ── Deposit routing ─────────────────────────────────────────────── */}
      {holdings.length > 0 && <RebalancePanel prices={prices} />}

      {/* ── Monthly progress ────────────────────────────────────────────── */}
      <MonthlyTracker blendedReturn={blended} />

      <Disclaimer variant="full" />
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-3 border border-surface-4 px-3 py-2.5">
      <p className="text-[10px] text-text-dim truncate">{label}</p>
      <p className={`text-[15px] font-bold mt-0.5 ${accent ? 'text-gold' : 'text-text'}`}>{value}</p>
    </div>
  );
}
