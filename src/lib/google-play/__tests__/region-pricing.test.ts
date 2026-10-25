import { describe, expect, it } from 'vitest';
import { fitToRegionCurrencies, type RegionPricing } from '../region-pricing';

const pricing: RegionPricing = {
  version: '2025/03',
  currencies: { US: 'USD', AR: 'USD', DE: 'EUR' },
  converted: {
    US: { currencyCode: 'USD', units: '7', nanos: 990000000 },
    AR: { currencyCode: 'USD', units: '7', nanos: 990000000 },
    DE: { currencyCode: 'EUR', units: '7', nanos: 490000000 },
  },
};

describe('fitToRegionCurrencies', () => {
  it('keeps prices that are in the right currency', () => {
    const configs = [{ regionCode: 'DE', price: { currencyCode: 'EUR', units: '5', nanos: 990000000 } }];
    const { configs: result, refitted } = fitToRegionCurrencies(configs, pricing);
    expect(result[0].price.units).toBe('5');
    expect(refitted).toEqual([]);
  });

  it("replaces a price of an older regions version with Google's conversion", () => {
    const configs = [
      { regionCode: 'AR', price: { currencyCode: 'ARS', units: '6999' }, newSubscriberAvailability: true },
    ];
    const { configs: result, refitted } = fitToRegionCurrencies(configs, pricing);
    expect(result[0].price).toEqual(pricing.converted.AR);
    expect(result[0].newSubscriberAvailability).toBe(true);
    expect(refitted).toEqual(['AR']);
  });

  it('leaves regions Google did not mention alone', () => {
    const configs = [{ regionCode: 'XX', price: { currencyCode: 'XXX', units: '1' } }];
    expect(fitToRegionCurrencies(configs, pricing).configs[0].price.currencyCode).toBe('XXX');
  });
});
