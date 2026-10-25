// Which currency Google Play bills each region in. That changes between
// "regions versions" (Argentina went from ARS to USD in 2025/03), and Google
// refuses a price in the wrong currency for the version it is sent with. So
// the currencies and the version always come from Google itself, through
// convertRegionPrices, never from a list in this code or from prices that
// were set under an older version.
import { googlePlayFetch } from './client';
import type { Money, ServiceAccountCredentials } from './types';

export interface RegionPricing {
  /** The regions version the currencies hold for, to send with an update. */
  version: string;
  /** Currency of each region code. */
  currencies: Record<string, string>;
  /** Google's own conversion of the price that was asked for, per region. */
  converted: Record<string, Money>;
}

interface ConvertRegionPricesResponse {
  convertedRegionPrices?: Record<string, { regionCode: string; price: Money }>;
  regionVersion?: { version?: string };
}

/** Asks Google what `price` is in every region, in the currency it bills there. */
export async function getRegionPricing(
  credentials: ServiceAccountCredentials,
  packageName: string,
  price: Money
): Promise<RegionPricing> {
  const response = await googlePlayFetch<ConvertRegionPricesResponse>(
    credentials,
    `/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/pricing:convertRegionPrices`,
    { method: 'POST', body: { price } }
  );

  const currencies: Record<string, string> = {};
  const converted: Record<string, Money> = {};
  for (const [regionCode, entry] of Object.entries(response.convertedRegionPrices ?? {})) {
    currencies[regionCode] = entry.price.currencyCode;
    converted[regionCode] = entry.price;
  }

  const version = response.regionVersion?.version;
  if (!version) {
    throw new Error('Google did not say which regions version its currencies are for');
  }
  return { version, currencies, converted };
}

interface RegionPriced {
  regionCode: string;
  price: Money;
}

/**
 * Puts every price into the currency Google bills its region in at
 * `pricing.version`. A price in another currency (set under an older
 * version) is replaced by Google's own conversion of the price `pricing`
 * was asked for. Returns the regions that were replaced.
 */
export function fitToRegionCurrencies<T extends RegionPriced>(
  configs: T[],
  pricing: RegionPricing
): { configs: T[]; refitted: string[] } {
  const refitted: string[] = [];
  const result = configs.map((config) => {
    const expected = pricing.currencies[config.regionCode];
    if (!expected || expected === config.price.currencyCode) return config;
    refitted.push(config.regionCode);
    return { ...config, price: pricing.converted[config.regionCode] };
  });
  return { configs: result, refitted };
}
