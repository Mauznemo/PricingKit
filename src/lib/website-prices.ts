// Price files for a website that shows the local price of a product: one JSON
// object per product, keyed the way App Store Connect keys the prices
// (alpha-2 for subscriptions, alpha-3 for in-app purchases), with only what a
// page needs to show a price.

export interface WebsitePriceEntry {
  territoryCode: string;
  currency: string;
  customerPrice: string;
}

export type WebsitePrices = Record<string, WebsitePriceEntry>;

interface PriceLike {
  territoryCode: string;
  currency: string;
  customerPrice: string;
}

/**
 * Strips the prices down to the three fields and sorts them by key. With
 * `scheduled`, a scheduled price replaces the current one of its territory.
 */
export function toWebsitePrices(
  current: Record<string, PriceLike>,
  scheduled?: Record<string, PriceLike>
): WebsitePrices {
  const merged: Record<string, PriceLike> = { ...current, ...(scheduled ?? {}) };
  const result: WebsitePrices = {};
  for (const key of Object.keys(merged).sort()) {
    const { territoryCode, currency, customerPrice } = merged[key];
    result[key] = { territoryCode, currency, customerPrice };
  }
  return result;
}

const PERIOD_NAMES: Record<string, string> = {
  ONE_WEEK: 'weekly',
  ONE_MONTH: 'monthly',
  TWO_MONTHS: 'two-monthly',
  THREE_MONTHS: 'quarterly',
  SIX_MONTHS: 'half-yearly',
  ONE_YEAR: 'yearly',
};

/** `monthly-price.json` for a monthly subscription, `<productId>-price.json` otherwise. */
export function websitePriceFileName(productId: string, period?: string): string {
  const name = (period && PERIOD_NAMES[period]) || productId.replace(/[^\w.-]+/g, '-');
  return `${name}-price.json`;
}

/** Saves `data` as a pretty-printed JSON file through the browser. */
export function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
