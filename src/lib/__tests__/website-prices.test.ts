import { describe, expect, it } from 'vitest';
import { fromGooglePrices, moneyToPriceString, toWebsitePrices, websitePriceFileName } from '../website-prices';

const price = (territoryCode: string, currency: string, customerPrice: string) => ({
  territoryCode,
  currency,
  customerPrice,
  proceeds: '1.00',
  pricePointId: 'pp-' + territoryCode,
});

describe('toWebsitePrices', () => {
  it('keeps only the three fields, sorted by key', () => {
    const result = toWebsitePrices({
      US: price('US', 'USD', '7.99'),
      DE: price('DE', 'EUR', '5.99'),
    });
    expect(Object.keys(result)).toEqual(['DE', 'US']);
    expect(result.DE).toEqual({ territoryCode: 'DE', currency: 'EUR', customerPrice: '5.99' });
  });

  it('keeps the keys as they are (alpha-3 for in-app purchases)', () => {
    const result = toWebsitePrices({ DEU: price('DEU', 'EUR', '99.99') });
    expect(result).toEqual({ DEU: { territoryCode: 'DEU', currency: 'EUR', customerPrice: '99.99' } });
  });

  it('lets a scheduled price replace the current one', () => {
    const result = toWebsitePrices(
      { US: price('US', 'USD', '6.99'), DE: price('DE', 'EUR', '5.99') },
      { US: price('US', 'USD', '7.99') }
    );
    expect(result.US.customerPrice).toBe('7.99');
    expect(result.DE.customerPrice).toBe('5.99');
  });
});

describe('websitePriceFileName', () => {
  it('names a subscription by its period', () => {
    expect(websitePriceFileName('dev.app.monthly', 'ONE_MONTH')).toBe('monthly-price.json');
    expect(websitePriceFileName('dev.app.yearly', 'ONE_YEAR')).toBe('yearly-price.json');
  });

  it('names anything else by its product ID', () => {
    expect(websitePriceFileName('lifetime')).toBe('lifetime-price.json');
    expect(websitePriceFileName('my app/lifetime')).toBe('my-app-lifetime-price.json');
  });
});

describe('Google prices', () => {
  it('writes units and nanos without float rounding', () => {
    expect(moneyToPriceString({ currencyCode: 'USD', units: '7', nanos: 990000000 })).toBe('7.99');
    expect(moneyToPriceString({ currencyCode: 'EUR', units: '39', nanos: 990000000 })).toBe('39.99');
    expect(moneyToPriceString({ currencyCode: 'JPY', units: '780' })).toBe('780');
    expect(moneyToPriceString({ currencyCode: 'USD', units: '0', nanos: 50000000 })).toBe('0.05');
  });

  it('becomes the same shape as the Apple prices, keyed by region', () => {
    const result = toWebsitePrices(
      fromGooglePrices({ DE: { currencyCode: 'EUR', units: '5', nanos: 990000000 } })
    );
    expect(result).toEqual({ DE: { territoryCode: 'DE', currency: 'EUR', customerPrice: '5.99' } });
  });
});
