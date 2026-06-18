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

export function useUTXOracle() {
  return useQuery<UTXOraclePrice>({
    queryKey: ['utxoracle-price'],
    queryFn: async ({ signal }) => {
      const url = `https://proxy.shakespeare.diy/?url=${encodeURIComponent('https://nutmix.note-teeth.ts.net/latest.json')}`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error('Failed to fetch price');
      return res.json() as Promise<UTXOraclePrice>;
    },
    refetchInterval: 60_000, // refresh every 60 seconds
    staleTime: 30_000,
  });
}
