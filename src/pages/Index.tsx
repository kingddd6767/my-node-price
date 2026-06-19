import { useSeoMeta } from '@unhead/react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUTXOracle } from '@/hooks/useUTXOracle';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bitcoin, RefreshCw, ArrowRightLeft, AlertCircle, Server, Globe, X, Check, Share2, Copy } from 'lucide-react';

// ── helpers ────────────────────────────────────────────────────────────────

function formatFiat(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
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

const USD_PRESETS = [1, 5, 10, 25, 50, 100, 500, 1000];

// ── URL param helpers ──────────────────────────────────────────────────────

function getUrlParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    currency: p.get('currency')?.toUpperCase() ?? null,
    mode: p.get('mode') === 'btc' ? 'btc' as const : p.get('mode') === 'sats' ? 'sats' as const : null,
    fiat: p.get('fiat') ?? null,
  };
}

function buildShareUrl(currency: string, mode: 'sats' | 'btc', fiat: string): string {
  const p = new URLSearchParams();
  p.set('currency', currency);
  p.set('mode', mode);
  if (fiat) p.set('fiat', fiat);
  return `${window.location.origin}${window.location.pathname}?${p.toString()}`;
}

// ── component ─────────────────────────────────────────────────────────────

const Index = () => {
  useSeoMeta({
    title: "My Node's Price",
    description: "Convert USD to Bitcoin using a real price derived from your own Bitcoin node.",
  });

  const { data, isLoading, isError, refetch, isFetching } = useUTXOracle();
  const isUsingCache = isError && !!data;

  // ── read URL params once on mount ────────────────────────────────────────
  const urlParams = useRef(getUrlParams());

  // ── currency state (persisted, URL param wins) ───────────────────────────
  const [savedCurrency, setSavedCurrency] = useLocalStorage<string>('btc-calc-currency', 'USD', {
    serialize: (v) => v,
    deserialize: (v) => v.toUpperCase(),
  });
  const [activeCurrency, setActiveCurrency] = useState<string>(
    urlParams.current.currency ?? savedCurrency
  );

  // ── sats vs BTC mode (persisted, URL param wins) ─────────────────────────
  const [btcMode, setBtcMode] = useLocalStorage<'sats' | 'btc'>('btc-calc-btcmode', 'sats', {
    serialize: (v) => v,
    deserialize: (v) => (v === 'btc' ? 'btc' : 'sats'),
  });

  // ── secret currency picker state ─────────────────────────────────────────
  const [pickerOpen, setPickerOpen] = useState(false);
  const [currencyInput, setCurrencyInput] = useState('');
  const [currencyError, setCurrencyError] = useState('');
  const currencyLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── long-press on ₿ label to toggle sats/btc ─────────────────────────────
  const btcLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [btcLabelFlash, setBtcLabelFlash] = useState(false);

  const handleBtcLabelDown = () => {
    btcLongPressTimer.current = setTimeout(() => {
      const next = btcMode === 'sats' ? 'btc' : 'sats';
      setBtcMode(next);
      setFiatInput('');
      setBtcInput('');
      setActivePreset(null);
      setBtcLabelFlash(true);
      setTimeout(() => setBtcLabelFlash(false), 600);
    }, 600);
  };
  const handleBtcLabelUp = () => {
    if (btcLongPressTimer.current) clearTimeout(btcLongPressTimer.current);
  };

  // ── exchange rate (only when non-USD) ────────────────────────────────────
  const isUSD = activeCurrency === 'USD';
  const { data: rateData, isLoading: isRateLoading, isError: isRateError } = useExchangeRate(activeCurrency);

  // price of 1 BTC in active currency
  const usdPrice = data?.price_usd ?? 0;
  const rate = isUSD ? 1 : (rateData?.rate ?? 1);
  const price = usdPrice * rate; // fiat per BTC

  // ── share button state ───────────────────────────────────────────────────
  const [shareCopied, setShareCopied] = useState(false);

  // ── calculator state ─────────────────────────────────────────────────────
  const [fiatInput, setFiatInput] = useState(urlParams.current.fiat ?? '');
  const [btcInput, setBtcInput] = useState('');
  const [activePreset, setActivePreset] = useState<number | null>(null);

  // Apply URL mode param after mount (needs setBtcMode which is from hook)
  useEffect(() => {
    if (urlParams.current.mode) setBtcMode(urlParams.current.mode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When price loads and we have URL params, recalculate from fiat to keep values fresh
  const urlParamsApplied = useRef(false);
  useEffect(() => {
    if (!price || urlParamsApplied.current) return;
    if (!urlParams.current.fiat) return;
    urlParamsApplied.current = true;
    const val = parseFloat(urlParams.current.fiat);
    if (isNaN(val)) return;
    const sats = (val / price) * 1e8;
    const mode = urlParams.current.mode ?? btcMode;
    setBtcInput(mode === 'sats' ? String(Math.round(sats)) : formatBTC(sats));
  }, [price, btcMode]);

  // ── currency switcher ────────────────────────────────────────────────────
  const switchCurrency = useCallback((currency: string) => {
    setActiveCurrency(currency);
    setSavedCurrency(currency);
    setFiatInput('');
    setBtcInput('');
    setActivePreset(null);
    setPickerOpen(false);
    setCurrencyInput('');
    setCurrencyError('');
  }, [setSavedCurrency]);

  const handlePickerSubmit = () => {
    const code = currencyInput.trim().toUpperCase();
    if (!code || code.length < 2 || code.length > 4) {
      setCurrencyError('Enter a valid 3-letter currency code (e.g. KES, EUR, GBP)');
      return;
    }
    setCurrencyError('');
    switchCurrency(code);
  };

  // Long-press on the currency label to open the secret picker
  const handleLabelMouseDown = () => {
    currencyLongPressTimer.current = setTimeout(() => setPickerOpen(true), 800);
  };
  const handleLabelMouseUp = () => {
    if (currencyLongPressTimer.current) clearTimeout(currencyLongPressTimer.current);
  };

  // ── conversion handlers ──────────────────────────────────────────────────
  const handleFiatChange = useCallback(
    (raw: string, fromPreset = false) => {
      const cleaned = raw.replace(/[^0-9.]/g, '');
      setFiatInput(cleaned);
      if (!fromPreset) setActivePreset(null);
      if (cleaned === '' || !price) { setBtcInput(''); return; }
      const val = parseFloat(cleaned);
      if (isNaN(val)) { setBtcInput(''); return; }
      const sats = (val / price) * 1e8;
      setBtcInput(btcMode === 'sats' ? String(Math.round(sats)) : formatBTC(sats));
    },
    [price, btcMode],
  );

  const handleBtcChange = useCallback(
    (raw: string) => {
      const cleaned = raw.replace(/[^0-9.]/g, '');
      setBtcInput(cleaned);
      setActivePreset(null);
      if (cleaned === '' || !price) { setFiatInput(''); return; }
      const val = parseFloat(cleaned);
      if (isNaN(val)) { setFiatInput(''); return; }
      // val is either sats or BTC depending on mode
      const btcVal = btcMode === 'sats' ? val / 1e8 : val;
      setFiatInput((btcVal * price).toFixed(2));
    },
    [price, btcMode],
  );

  const applyPreset = (usd: number) => {
    const fiatAmount = isUSD ? usd : usd * rate;
    setActivePreset(usd);
    handleFiatChange(fiatAmount.toFixed(2), true);
  };

  // ── share handler ────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    const url = buildShareUrl(activeCurrency, btcMode, fiatInput);
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Node's Price", url });
      } catch {
        // user cancelled — do nothing
      }
    } else {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }, [activeCurrency, btcMode, fiatInput, btcInput]);

  // derived display values
  const satsDisplay = fiatInput && price
    ? Math.round((parseFloat(fiatInput) / price) * 1e8)
    : null;

  const isPriceLoading = isLoading || (!isUSD && isRateLoading);
  const currencySymbol = isUSD ? '$' : activeCurrency;

  // ── contextual price badge text ──────────────────────────────────────────
  const priceBadgeText = (() => {
    if (!price) return '';
    if (btcMode === 'btc') {
      return `1 BTC = ${formatFiat(price, activeCurrency)}`;
    }
    // sats mode: show sats per 1 unit of fiat
    const satsPerFiat = 1e8 / price; // sats per 1 fiat unit
    if (satsPerFiat >= 1) {
      // e.g. "1 USD = 1,543 sats"
      return `1 ${activeCurrency} = ${formatSats(satsPerFiat)} sats`;
    } else {
      // fiat is worth less than 1 sat — flip it
      // e.g. "1 sat = KES 8.23"
      const fiatPerSat = price / 1e8;
      return `1 sat = ${formatFiat(fiatPerSat, activeCurrency)}`;
    }
  })();

  const btcLabel = btcMode === 'sats' ? 'Satoshis (sats)' : 'Bitcoin (BTC)';
  const btcPlaceholder = btcMode === 'sats' ? '0' : '0.00000000';
  const btcSymbol = btcMode === 'sats' ? 'sats' : '₿';

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex flex-col items-center justify-center p-4 gap-8">

      {/* ── header ─────────────────────────────────────────── */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/30">
            <Bitcoin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            My Node's Price
          </h1>
        </div>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          Powered by{' '}
          <a
            href="https://utxo.live/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-500 hover:text-orange-600 font-medium underline-offset-2 hover:underline"
          >
            UTXOracle
          </a>{' '}
          — on-chain Bitcoin price oracle
        </p>
      </div>

      {/* ── price badge ─────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2">
        {isPriceLoading ? (
          <Skeleton className="h-9 w-52 rounded-full" />
        ) : isError && !data ? (
          <Badge variant="destructive" className="text-sm px-4 py-1.5 gap-2">
            <AlertCircle className="w-4 h-4" />
            Failed to load price
          </Badge>
        ) : (
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Badge className="text-base px-5 py-1.5 bg-orange-500 hover:bg-orange-500 text-white rounded-full shadow-md shadow-orange-500/20">
              {priceBadgeText}
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
        {isUsingCache && (
          <span className="text-xs text-amber-500 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Node unreachable — showing cached price from {formatTimeAgo(data!.updated_at)}
          </span>
        )}
      </div>

      {/* ── calculator card ─────────────────────────────────── */}
      <Card className="w-full max-w-md shadow-xl shadow-zinc-200/50 dark:shadow-zinc-950/50 border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <CardContent className="p-6 space-y-5">

          {/* Fiat field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide select-none cursor-default"
                onMouseDown={handleLabelMouseDown}
                onMouseUp={handleLabelMouseUp}
                onMouseLeave={handleLabelMouseUp}
                onTouchStart={handleLabelMouseDown}
                onTouchEnd={handleLabelMouseUp}
                title="Hold to change currency"
              >
                {isUSD ? 'US Dollars (USD)' : `${activeCurrency}`}
              </label>
              {!isUSD && (
                <button
                  onClick={() => switchCurrency('USD')}
                  className="text-xs text-zinc-400 hover:text-orange-500 transition-colors flex items-center gap-1"
                  aria-label="Reset to USD"
                >
                  <X className="w-3 h-3" />
                  Reset to USD
                </button>
              )}
            </div>

            {/* Secret currency picker */}
            {pickerOpen && (
              <div className="rounded-xl border border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-zinc-800/80 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-orange-500 shrink-0" />
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                    Custom currency
                  </p>
                  <button
                    onClick={() => { setPickerOpen(false); setCurrencyInput(''); setCurrencyError(''); }}
                    className="ml-auto text-zinc-400 hover:text-zinc-600"
                    aria-label="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Enter any ISO 4217 currency code. Rates are fetched from{' '}
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">open.er-api.com</span>{' '}
                  — a third-party exchange rate service.
                </p>
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    value={currencyInput}
                    onChange={(e) => { setCurrencyInput(e.target.value.toUpperCase()); setCurrencyError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handlePickerSubmit(); if (e.key === 'Escape') { setPickerOpen(false); } }}
                    placeholder="KES, EUR, GBP…"
                    maxLength={4}
                    className="h-9 text-sm font-mono uppercase rounded-lg border-orange-200 dark:border-zinc-600 focus-visible:ring-orange-400"
                  />
                  <button
                    onClick={handlePickerSubmit}
                    className="h-9 px-3 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center gap-1 text-sm font-semibold shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
                {currencyError && (
                  <p className="text-xs text-red-500">{currencyError}</p>
                )}
              </div>
            )}

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm select-none">
                {currencySymbol}
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

          {/* Sats / BTC field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                className={`text-sm font-medium uppercase tracking-wide select-none cursor-default transition-colors ${
                  btcLabelFlash
                    ? 'text-orange-500'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
                onMouseDown={handleBtcLabelDown}
                onMouseUp={handleBtcLabelUp}
                onMouseLeave={handleBtcLabelUp}
                onTouchStart={handleBtcLabelDown}
                onTouchEnd={handleBtcLabelUp}
                title="Hold to switch between sats and BTC"
              >
                {btcLabel}
              </label>
              <button
                onClick={() => {
                  const next = btcMode === 'sats' ? 'btc' : 'sats';
                  setBtcMode(next);
                  setFiatInput('');
                  setBtcInput('');
                  setActivePreset(null);
                }}
                className="text-xs text-zinc-400 hover:text-orange-500 transition-colors flex items-center gap-1"
                title="Switch between sats and BTC"
              >
                <ArrowRightLeft className="w-3 h-3" />
                {btcMode === 'sats' ? 'Switch to BTC' : 'Switch to sats'}
              </button>
            </div>
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold text-lg select-none ${btcMode === 'sats' ? 'text-orange-500 text-sm' : 'text-orange-500'}`}>
                {btcSymbol}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder={btcPlaceholder}
                value={btcInput}
                onChange={(e) => handleBtcChange(e.target.value)}
                className="pl-12 h-14 text-xl font-semibold rounded-xl border-zinc-200 dark:border-zinc-700 focus-visible:ring-orange-400"
              />
            </div>
          </div>

          {/* show the other BTC unit below */}
          {satsDisplay !== null && satsDisplay > 0 && (
            <div className="rounded-xl bg-orange-50 dark:bg-zinc-800/60 border border-orange-100 dark:border-zinc-700 px-4 py-3 flex items-center justify-between">
              {btcMode === 'sats' ? (
                <>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Bitcoin</span>
                  <span className="font-mono font-semibold text-orange-600 dark:text-orange-400 text-sm">
                    {formatBTC(satsDisplay)} BTC
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Satoshis</span>
                  <span className="font-mono font-semibold text-orange-600 dark:text-orange-400 text-sm">
                    {formatSats(satsDisplay)} sats
                  </span>
                </>
              )}
            </div>
          )}

          {/* loading state */}
          {isPriceLoading && (
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700 px-4 py-3 text-center text-sm text-zinc-400">
              Fetching live price…
            </div>
          )}

          {/* third-party rate warning (non-USD only) */}
          {!isUSD && !isRateLoading && (
            <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${isRateError ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50' : 'bg-amber-50 dark:bg-zinc-800/40 border-amber-200 dark:border-amber-800/40'}`}>
              <Globe className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {isRateError ? (
                  <span className="text-red-600 dark:text-red-400 font-medium">Could not load {activeCurrency} rate. Check the currency code and try again.</span>
                ) : (
                  <>
                    <span className="font-semibold text-amber-700 dark:text-amber-400">{activeCurrency} rate</span>
                    {' '}via open.er-api.com ({rateData ? `1 USD = ${rateData.rate.toFixed(4)} ${activeCurrency}` : '…'}).
                    {' '}The BTC price is still derived on-chain — only the fiat conversion uses a third-party rate.
                  </>
                )}
              </p>
            </div>
          )}

          {/* source note */}
          {data && (
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-700/50 px-4 py-3 flex items-start gap-3">
              <Server className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">Price source: </span>
                {data.source}. The price is a <span className="font-medium text-zinc-600 dark:text-zinc-300">144-block rolling average</span> (~24 hrs) derived entirely on-chain.
              </p>
            </div>
          )}

          {/* share button */}
          <button
            onClick={handleShare}
            className={`w-full h-11 rounded-xl border font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              shareCopied
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:border-orange-400 hover:text-orange-600 dark:hover:text-orange-400'
            }`}
          >
            {shareCopied ? (
              <>
                <Check className="w-4 h-4" />
                Link copied!
              </>
            ) : (
              <>
                {typeof navigator !== 'undefined' && 'share' in navigator
                  ? <Share2 className="w-4 h-4" />
                  : <Copy className="w-4 h-4" />
                }
                Share this conversion
              </>
            )}
          </button>
        </CardContent>
      </Card>

      {/* ── quick presets ─────────────────────────────────────── */}
      <div className="w-full max-w-md space-y-2">
        <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide text-center">
          Quick convert
        </p>
        <div className="grid grid-cols-4 gap-2">
          {USD_PRESETS.map((usd) => (
            <button
              key={usd}
              onClick={() => applyPreset(usd)}
              disabled={!price}
              className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                activePreset === usd
                  ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/30'
                  : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:border-orange-400 hover:text-orange-600 dark:hover:text-orange-400'
              }`}
            >
              ${usd >= 1000 ? `${usd / 1000}k` : usd}
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
          UTXO spending patterns on-chain to produce a consensus price.
        </p>
        <p>
          This calculator fetches the price from a{' '}
          <span className="font-medium text-zinc-600 dark:text-zinc-300">personal Bitcoin node</span>{' '}
          running UTXOracle locally, rather than a centralised API. The price is a{' '}
          <span className="font-medium text-zinc-600 dark:text-zinc-300">144-block rolling average</span>{' '}
          (roughly 24 hours of blocks), smoothing out short-term volatility while staying
          fully grounded in on-chain data.
        </p>
        <a
          href="https://utxo.live/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-500 hover:text-orange-600 font-medium hover:underline underline-offset-2"
        >
          Learn more →
        </a>
      </div>

      {/* ── footer ───────────────────────────────────────────── */}
      {/* ── footer ───────────────────────────────────────────── */}
      <div className="pb-8 flex items-center gap-3">
        <a
          href="https://github.com/kingddd6767/my-node-price"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-orange-500 dark:text-zinc-500 dark:hover:text-orange-400 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          GitHub
        </a>
        <span className="text-zinc-300 dark:text-zinc-700">·</span>
        <a
          href="https://shakespeare.diy/clone?url=nostr%3A%2F%2Fnpub14vr3mcc5t6cxpr03xpv0f2lt9k94qnq9mm2phqw4k0jqzp97m83qycsplz%2Fgit.shakespeare.diy%2Futxoracle-btc-calculator"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src="https://shakespeare.diy/badge.svg" alt="Edit with Shakespeare" className="h-auto" />
        </a>
        <span className="text-zinc-300 dark:text-zinc-700">·</span>
        <Link to="/changelog" className="text-xs text-zinc-400 dark:text-zinc-600 hover:text-orange-500 transition-colors">
          v1.3
        </Link>
      </div>
    </div>
  );
};

export default Index;
