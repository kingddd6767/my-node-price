import { useSeoMeta } from '@unhead/react';
import { useState, useCallback } from 'react';
import { useUTXOracle } from '@/hooks/useUTXOracle';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bitcoin, RefreshCw, ArrowRightLeft, AlertCircle } from 'lucide-react';

// ── helpers ────────────────────────────────────────────────────────────────

type Currency = 'USD' | 'KES';

interface CurrencyConfig {
  code: Currency;
  label: string;
  symbol: string;
  locale: string;
  flag: string;
}

const CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', label: 'US Dollar', symbol: '$', locale: 'en-US', flag: '🇺🇸' },
  { code: 'KES', label: 'Kenyan Shilling', symbol: 'KSh', locale: 'en-KE', flag: '🇰🇪' },
];

function formatFiat(value: number, currency: CurrencyConfig): string {
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatBTC(sats: number): string {
  const btc = sats / 1e8;
  return btc.toLocaleString('en-US', {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
  });
}

function formatSats(sats: number): string {
  return Math.round(sats).toLocaleString('en-US');
}

function formatTimeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ── quick-amount presets ───────────────────────────────────────────────────

const PRESETS: Record<Currency, number[]> = {
  USD: [1, 5, 10, 25, 50, 100, 500, 1000],
  KES: [100, 500, 1000, 2500, 5000, 10000, 50000, 100000],
};

function formatPreset(amount: number, currency: Currency): string {
  if (currency === 'KES') {
    if (amount >= 100000) return `${amount / 1000}k`;
    if (amount >= 1000) return `${amount / 1000}k`;
    return String(amount);
  }
  return amount >= 1000 ? `${amount / 1000}k` : String(amount);
}

// ── component ─────────────────────────────────────────────────────────────

const Index = () => {
  useSeoMeta({
    title: 'UTXOracle BTC Calculator',
    description: 'Convert USD or KES to Bitcoin using the UTXOracle on-chain price oracle.',
  });

  const { data, isLoading, isError, refetch, isFetching } = useUTXOracle();
  const { data: rateData, isLoading: isRateLoading } = useExchangeRate('KES');

  const [activeCurrency, setActiveCurrency] = useState<Currency>('USD');
  const [fiatInput, setFiatInput] = useState('');
  const [btcInput, setBtcInput] = useState('');

  const usdPrice = data?.price ?? 0;

  // Convert USD price to active currency.
  // Default rate to 1 (not 0) while loading to avoid dividing by zero.
  const rate = activeCurrency === 'KES' ? (rateData?.rate ?? 1) : 1;
  const price = usdPrice * rate; // price of 1 BTC in active currency

  const currencyConfig = CURRENCIES.find((c) => c.code === activeCurrency)!;

  const handleCurrencySwitch = (currency: Currency) => {
    setActiveCurrency(currency);
    setFiatInput('');
    setBtcInput('');
  };

  // Fiat → BTC
  const handleFiatChange = useCallback(
    (raw: string) => {
      const cleaned = raw.replace(/[^0-9.]/g, '');
      setFiatInput(cleaned);
      if (cleaned === '' || !price) {
        setBtcInput('');
        return;
      }
      const fiatVal = parseFloat(cleaned);
      if (isNaN(fiatVal)) {
        setBtcInput('');
        return;
      }
      const sats = (fiatVal / price) * 1e8;
      setBtcInput(formatBTC(sats));
    },
    [price],
  );

  // BTC → Fiat
  const handleBtcChange = useCallback(
    (raw: string) => {
      const cleaned = raw.replace(/[^0-9.]/g, '');
      setBtcInput(cleaned);
      if (cleaned === '' || !price) {
        setFiatInput('');
        return;
      }
      const btcVal = parseFloat(cleaned);
      if (isNaN(btcVal)) {
        setFiatInput('');
        return;
      }
      const fiat = btcVal * price;
      setFiatInput(fiat.toFixed(2));
    },
    [price],
  );

  const applyPreset = (amount: number) => {
    handleFiatChange(String(amount));
  };

  // derived display values
  const satsValue =
    fiatInput && price
      ? Math.round((parseFloat(fiatInput) / price) * 1e8)
      : null;

  const isPriceLoading = isLoading || (activeCurrency === 'KES' && isRateLoading);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex flex-col items-center justify-center p-4 gap-8">

      {/* ── header ─────────────────────────────────────── */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/30">
            <Bitcoin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            BTC Calculator
          </h1>
        </div>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          Powered by{' '}
          <a
            href="https://utxo.live"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-500 hover:text-orange-600 font-medium underline-offset-2 hover:underline"
          >
            UTXOracle
          </a>{' '}
          — price derived from a personal Bitcoin node
        </p>
      </div>

      {/* ── currency toggle ──────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
        {CURRENCIES.map((c) => (
          <button
            key={c.code}
            onClick={() => handleCurrencySwitch(c.code)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeCurrency === c.code
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <span>{c.flag}</span>
            <span>{c.code}</span>
          </button>
        ))}
      </div>

      {/* ── price badge ─────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {isPriceLoading ? (
          <Skeleton className="h-9 w-52 rounded-full" />
        ) : isError ? (
          <Badge variant="destructive" className="text-sm px-4 py-1.5 gap-2">
            <AlertCircle className="w-4 h-4" />
            Failed to load price
          </Badge>
        ) : (
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Badge className="text-base px-5 py-1.5 bg-orange-500 hover:bg-orange-500 text-white rounded-full shadow-md shadow-orange-500/20">
              1 BTC = {formatFiat(price, currencyConfig)}
            </Badge>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-full text-zinc-400 hover:text-orange-500 hover:bg-orange-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
              aria-label="Refresh price"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            {data && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {data.date} · {formatTimeAgo(data.updated_at)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── calculator card ─────────────────────────────── */}
      <Card className="w-full max-w-md shadow-xl shadow-zinc-200/50 dark:shadow-zinc-950/50 border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <CardContent className="p-6 space-y-5">

          {/* Fiat field */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              {currencyConfig.label} ({currencyConfig.code})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-base select-none">
                {currencyConfig.symbol}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={fiatInput}
                onChange={(e) => handleFiatChange(e.target.value)}
                className="pl-12 h-14 text-xl font-semibold rounded-xl border-zinc-200 dark:border-zinc-700 focus-visible:ring-orange-400"
              />
            </div>
          </div>

          {/* swap icon */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="p-2 rounded-full bg-orange-100 dark:bg-zinc-800 text-orange-500">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
          </div>

          {/* BTC field */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Bitcoin (BTC)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 font-bold text-lg select-none">
                ₿
              </span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00000000"
                value={btcInput}
                onChange={(e) => handleBtcChange(e.target.value)}
                className="pl-8 h-14 text-xl font-semibold rounded-xl border-zinc-200 dark:border-zinc-700 focus-visible:ring-orange-400"
              />
            </div>
          </div>

          {/* sats conversion */}
          {satsValue !== null && satsValue > 0 && (
            <div className="rounded-xl bg-orange-50 dark:bg-zinc-800/60 border border-orange-100 dark:border-zinc-700 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Satoshis</span>
              <span className="font-mono font-semibold text-orange-600 dark:text-orange-400 text-sm">
                {formatSats(satsValue)} sats
              </span>
            </div>
          )}

          {/* loading state for fields */}
          {isPriceLoading && (
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700 px-4 py-3 text-center text-sm text-zinc-400">
              Fetching live price…
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── quick presets ─────────────────────────────────── */}
      <div className="w-full max-w-md space-y-2">
        <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide text-center">
          Quick convert
        </p>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS[activeCurrency].map((amount) => (
            <button
              key={amount}
              onClick={() => applyPreset(amount)}
              disabled={!price}
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 px-2 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:border-orange-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {currencyConfig.symbol}{formatPreset(amount, activeCurrency)}
            </button>
          ))}
        </div>
      </div>

      {/* ── about utxoracle ───────────────────────────────────── */}
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm p-5 space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
        <p className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
          About UTXOracle
        </p>
        <p>
          UTXOracle derives the Bitcoin price directly from the Bitcoin blockchain
          itself — no trusted third party, no API keys, no censorship. It reads
          UTXO spending patterns on-chain to produce a consensus price. This app
          fetches from a personal Bitcoin node running UTXOracle.
          {activeCurrency === 'KES' && ' KES rates are sourced from open.er-api.com.'}
        </p>
        <a
          href="https://utxo.live"
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-500 hover:text-orange-600 font-medium hover:underline underline-offset-2"
        >
          Learn more →
        </a>
      </div>

      {/* ── footer ───────────────────────────────────────────── */}
      <p className="text-xs text-zinc-400 dark:text-zinc-600 pb-4">
        Vibed with{' '}
        <a
          href="https://shakespeare.diy"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-orange-500 transition-colors"
        >
          Shakespeare
        </a>
      </p>
    </div>
  );
};

export default Index;
