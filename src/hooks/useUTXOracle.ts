import { useQuery } from '@tanstack/react-query';

export interface UTXOraclePrice {
  price_usd: number;
  date: string;
  mode: string;
  name: string;
  source: string;
  trigger_block_hash: string;
  updated_at: string;
}

const CACHE_KEY = 'utxoracle:cached-price';

function saveToCache(data: UTXOraclePrice): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // storage may be full or unavailable — silently ignore
  }
}

function loadFromCache(): UTXOraclePrice | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as UTXOraclePrice) : null;
  } catch {
    return null;
  }
}

export function useUTXOracle() {
  return useQuery<UTXOraclePrice>({
    queryKey: ['utxoracle-price'],
    queryFn: async ({ signal }) => {
      const url = `https://proxy.shakespeare.diy/?url=${encodeURIComponent('https://nutmix.note-teeth.ts.net/latest.json')}`;
      try {
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error('Failed to fetch price');
        const data = await res.json() as UTXOraclePrice;
        saveToCache(data);
        return data;
      } catch (err) {
        // If the fetch fails, fall back to the last cached price
        const cached = loadFromCache();
        if (cached) return cached;
        throw err;
      }
    },
    // Seed with cached data on first load for instant display
    initialData: loadFromCache() ?? undefined,
    refetchInterval: 60_000, // refresh every 60 seconds
    staleTime: 30_000,
  });
}
