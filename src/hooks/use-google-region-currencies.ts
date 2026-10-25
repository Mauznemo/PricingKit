import { useQuery } from '@tanstack/react-query';

/**
 * The currency Google Play bills each region in right now. Prices that were
 * set under an older regions version can be in a currency Google no longer
 * takes, so a calculation for Google goes by this first.
 */
export function useGoogleRegionCurrencies(enabled: boolean) {
  return useQuery<Record<string, string>>({
    queryKey: ['google-region-currencies'],
    queryFn: async () => {
      const response = await fetch('/api/region-currencies');
      if (!response.ok) throw new Error('Failed to read region currencies');
      const data = (await response.json()) as { currencies: Record<string, string> };
      return data.currencies;
    },
    enabled,
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });
}
