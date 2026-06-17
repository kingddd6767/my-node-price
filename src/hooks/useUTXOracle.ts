import { useQuery } from '@tanstack/react-query';

interface UTXOraclePrice {
  price: number;
  block_height: number;
  updated_at: string;
}

export function useUTXOracle() {
  return useQuery<UTXOraclePrice>({
    queryKey: ['utxoracle-price'],
    queryFn: async ({ signal }) => {
      const url = `https://proxy.shakespeare.diy/?url=${encodeURIComponent('https://api.utxoracle.io/latest.json')}`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error('Failed to fetch price');
      return res.json() as Promise<UTXOraclePrice>;
    },
    refetchInterval: 60_000, // refresh every 60 seconds
    staleTime: 30_000,
  });
}
