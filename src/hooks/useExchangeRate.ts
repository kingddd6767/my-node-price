import { useQuery } from '@tanstack/react-query';

interface ExchangeRateData {
  rate: number;       // units of `currency` per 1 USD
  currency: string;
  updatedAt: string;
}

/**
 * Fetches USD → target currency exchange rate from open.er-api.com.
 * Supports a wide range of currencies (150+).
 * Only active when currency !== 'USD'.
 */
export function useExchangeRate(currency: string) {
  return useQuery<ExchangeRateData>({
    queryKey: ['exchange-rate', currency],
    enabled: currency !== 'USD',
    queryFn: async ({ signal }) => {
      const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal });
      if (!res.ok) throw new Error('Failed to fetch exchange rate');
      const json = await res.json() as {
        result: string;
        rates: Record<string, number>;
        time_last_update_utc: string;
      };
      if (json.result !== 'success') throw new Error('Exchange rate API error');
      const rate = json.rates[currency.toUpperCase()];
      if (!rate) throw new Error(`Currency not found: ${currency}`);
      return { rate, currency: currency.toUpperCase(), updatedAt: json.time_last_update_utc };
    },
    refetchInterval: 60 * 60 * 1000, // hourly
    staleTime: 30 * 60 * 1000,
  });
}
