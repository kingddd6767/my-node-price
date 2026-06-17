import { useQuery } from '@tanstack/react-query';

interface ExchangeRateData {
  rate: number;
  currency: string;
  updatedAt: string;
}

/**
 * Fetches the USD → target currency exchange rate using the Frankfurter API.
 * Only fetches when currency is not USD.
 */
export function useExchangeRate(currency: string) {
  return useQuery<ExchangeRateData>({
    queryKey: ['exchange-rate', currency],
    enabled: currency !== 'USD',
    queryFn: async ({ signal }) => {
      const url = `https://proxy.shakespeare.diy/?url=${encodeURIComponent(
        `https://api.frankfurter.app/latest?from=USD&to=${currency}`,
      )}`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error('Failed to fetch exchange rate');
      const json = await res.json() as { rates: Record<string, number>; date: string };
      const rate = json.rates[currency];
      if (!rate) throw new Error(`No rate found for ${currency}`);
      return {
        rate,
        currency,
        updatedAt: json.date,
      };
    },
    refetchInterval: 60 * 60 * 1000, // refresh every hour
    staleTime: 30 * 60 * 1000,
  });
}
