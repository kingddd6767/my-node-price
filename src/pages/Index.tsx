import { useSeoMeta } from '@unhead/react';
import { useState, useCallback } from 'react';
import { useUTXOracle } from '@/hooks/useUTXOracle';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bitcoin, RefreshCw, ArrowRightLeft, AlertCircle, Server } from 'lucide-react';

// ── helpers ────────────────────────────────────────────────────────────────

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
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

const USD_PRESETS = [1, 5, 10, 25, 50, 100, 500, 1000];

// ── component ─────────────────────────────────────────────────────────────

const Index = () => {
  useSeoMeta({
    title: 'UTXOracle BTC Calculator',
    description: 'Convert USD to Bitcoin using UTXOracle running on a personal Bitcoin node.',
  });

  const { data, isLoading, isError, refetch, isFetching } = useUTXOracle();

  const [usdInput, setUsdInput] = useState('');
  const [btcInput, setBtcInput] = useState('');

  const price = data?.price_usd ?? 0;

  // USD → BTC
  const handleUsdChange = useCallback(
    (raw: string) => {
      const cleaned = raw.replace(/[^0-9.]/g, '');
      setUsdInput(cleaned);
      if (cleaned === '' || !price) {
        setBtcInput('');
        return;
      }
      const usdVal = parseFloat(cleaned);
      if (isNaN(usdVal)) {
        setBtcInput('');
        return;
      }
      const sats = (usdVal / price) * 1e8;
      setBtcInput(formatBTC(sats));
    },
    [price],
  );

  // BTC → USD
  const handleBtcChange = useCallback(
    (raw: string) => {
      const cleaned = raw.replace(/[^0-9.]/g, '');
      setBtcInput(cleaned);
      if (cleaned === '' || !price) {
        setUsdInput('');
        return;
      }
      const btcVal = parseFloat(cleaned);
      if (isNaN(btcVal)) {
        setUsdInput('');
        return;
      }
      const usd = btcVal * price;
      setUsdInput(usd.toFixed(2));
    },
    [price],
  );

  const applyPreset = (usd: number) => {
    handleUsdChange(String(usd));
  };

  // derived display values
  const satsValue =
    usdInput && price
      ? Math.round((parseFloat(usdInput) / price) * 1e8)
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex flex-col items-center justify-center p-4 gap-8">

      {/* ── header ─────────────────────────────────────────── */}
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
            href="https://utxoracle.io"
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
      <div className="flex items-center gap-3">
        {isLoading ? (
          <Skeleton className="h-9 w-52 rounded-full" />
        ) : isError ? (
          <Badge variant="destructive" className="text-sm px-4 py-1.5 gap-2">
            <AlertCircle className="w-4 h-4" />
            Failed to load price
          </Badge>
        ) : (
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Badge className="text-base px-5 py-1.5 bg-orange-500 hover:bg-orange-500 text-white rounded-full shadow-md shadow-orange-500/20">
              1 BTC = {formatUSD(price)}
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

      {/* ── calculator card ─────────────────────────────────── */}
      <Card className="w-full max-w-md shadow-xl shadow-zinc-200/50 dark:shadow-zinc-950/50 border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <CardContent className="p-6 space-y-5">

          {/* USD field */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              US Dollars (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-lg select-none">
                $
              </span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={usdInput}
                onChange={(e) => handleUsdChange(e.target.value)}
                className="pl-8 h-14 text-xl font-semibold rounded-xl border-zinc-200 dark:border-zinc-700 focus-visible:ring-orange-400"
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
          {isLoading && (
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700 px-4 py-3 text-center text-sm text-zinc-400">
              Fetching live price…
            </div>
          )}

          {/* source note */}
          {data && (
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-700/50 px-4 py-3 flex items-start gap-3">
              <Server className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">Price source: </span>
                {data.source}. The price is a <span className="font-medium text-zinc-600 dark:text-zinc-300">144-block rolling average</span> (~24 hrs) derived entirely on-chain — no exchange rate API or trusted third party is used.{' '}
                <span className="text-zinc-400 dark:text-zinc-500 italic">
                  Note: KES/USD conversion (if used) relies on a separate fiat exchange rate.
                </span>
              </p>
            </div>
          )}
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
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 px-2 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:border-orange-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
          href="https://utxoracle.io"
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
