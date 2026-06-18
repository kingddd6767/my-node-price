import { useQuery } from '@tanstack/react-query';

interface UTXOraclePrice {
  price_usd: number;
  date: string;
  mode: string;
  name: string;
  source: string;
  trigger_block_hash: string;
  updated_at: string;
  // Normalised field used throughout the app
  price: number;
}

export function useUTXOracle() {
  return useQuery<UTXOraclePrice>({
    queryKey: ['utxoracle-price'],
    queryFn: async ({ signal }) => {
      const res = await fetch('https://nutmix.note-teeth.ts.net/latest.json', { signal });
      if (!res.ok) throw new Error('Failed to fetch price');
      const json = await res.json() as Omit<UTXOraclePrice, 'price'>;
      // Normalise price_usd → price so the rest of the app doesn't need to change
      return { ...json, price: json.price_usd };
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
