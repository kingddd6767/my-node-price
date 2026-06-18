import { useQuery } from '@tanstack/react-query';

interface ExchangeRateData {
  rate: number;
  currency: string;
  updatedAt: string;
}

/**
 * Fetches the USD → target currency exchange rate using open.er-api.com.
 * Supports a wide range of currencies including KES.
 * Only fetches when currency is not USD.
 */
export function useExchangeRate(currency: string) {
  return useQuery<ExchangeRateData>({
    queryKey: ['exchange-rate', currency],
    enabled: currency !== 'USD',
    queryFn: async ({ signal }) => {
      const res = await fetch(
        `https://open.er-api.com/v6/latest/USD`,
        { signal },
      );
      if (!res.ok) throw new Error('Failed to fetch exchange rate');
      const json = await res.json() as {
        rates: Record<string, number>;
        time_last_update_utc: string;
        result: string;
      };
      if (json.result !== 'success') throw new Error('Exchange rate API returned an error');
      const rate = json.rates[currency];
      if (!rate) throw new Error(`No rate found for ${currency}`);
      return {
        rate,
        currency,
        updatedAt: json.time_last_update_utc,
      };
    },
    refetchInterval: 60 * 60 * 1000, // refresh every hour
    staleTime: 30 * 60 * 1000,
  });
}
