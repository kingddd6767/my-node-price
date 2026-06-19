import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bitcoin } from 'lucide-react';

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.4',
    date: '2026-06-19',
    changes: [
      'Price badge now shows sats per fiat unit in sats mode (e.g. "1 USD = 1,543 sats")',
      'If 1 unit of fiat is worth less than 1 sat, the badge flips to show fiat per sat (e.g. "1 sat = KES 8.23")',
      'Shared URLs no longer include the BTC/sats value — fiat is the source of truth and BTC recalculates fresh from the live price when a link is opened',
      'Added this changelog page, accessible by tapping the version number in the footer',
    ],
  },
  {
    version: '1.3',
    date: '2026-06-19',
    changes: [
      'Added share button — encodes currency, sats/BTC mode, and fiat value into a shareable URL',
      'On mobile uses the native share sheet; on desktop copies the link to clipboard',
      'Opening a shared link restores the exact state — currency, mode, and fiat value pre-filled',
      'BTC/sats value recalculates from the live price when a shared link is opened',
    ],
  },
  {
    version: '1.2',
    date: '2026-06-19',
    changes: [
      'Added sats/BTC toggle for the Bitcoin input field',
      'Sats is now the default input mode',
      'Long-press the sats/BTC label to toggle, or use the quick switch button',
      'When in sats mode, shows BTC equivalent below (and vice versa)',
      'Mode is persisted to localStorage across sessions',
    ],
  },
  {
    version: '1.1',
    date: '2026-06-19',
    changes: [
      'Added secret custom currency picker — long-press the currency label to unlock',
      'Supports any ISO 4217 currency code (KES, EUR, GBP, etc.)',
      'Exchange rates fetched from open.er-api.com with a clear third-party disclosure',
      'Active preset buttons now highlight in orange',
      'Currency preference persisted to localStorage',
    ],
  },
  {
    version: '1.0',
    date: '2026-06-19',
    changes: [
      'Initial release of My Node\'s Price',
      'Live BTC/USD price fetched from a personal Bitcoin node running UTXOracle',
      'Price is a 144-block rolling average (~24 hours), derived entirely on-chain',
      'Bidirectional USD ↔ BTC converter',
      'Quick-convert preset buttons: $1, $5, $10, $25, $50, $100, $500, $1k',
      'Last known price cached in localStorage — works even when node is unreachable',
      'Amber warning shown when displaying a cached/stale price',
      'Block date range and time-ago freshness indicator',
      'Manual refresh button',
    ],
  },
];

export default function Changelog() {
  useSeoMeta({
    title: "Changelog — My Node's Price",
    description: 'Version history for My Node\'s Price',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex flex-col items-center p-4 pt-10 gap-8">

      {/* header */}
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-orange-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to calculator
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-orange-500 rounded-xl shadow-md shadow-orange-500/30">
            <Bitcoin className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Changelog
          </h1>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          What's changed in My Node's Price
        </p>
      </div>

      {/* entries */}
      <div className="w-full max-w-md space-y-6 pb-12">
        {CHANGELOG.map((entry) => (
          <div key={entry.version} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  v{entry.version}
                </span>
                {entry.version === CHANGELOG[0].version && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500 text-white">
                    Latest
                  </span>
                )}
              </div>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">{entry.date}</span>
            </div>
            <ul className="space-y-1.5">
              {entry.changes.map((change, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                  {change}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
