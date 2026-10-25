import { describe, expect, it } from 'vitest';
import { switchPlatformRoute } from '../platform-routes';

describe('switchPlatformRoute', () => {
  it('keeps the section', () => {
    expect(switchPlatformRoute('/dashboard/apple/subscriptions', 'google')).toBe('/dashboard/google/subscriptions');
    expect(switchPlatformRoute('/dashboard/apple', 'google')).toBe('/dashboard/google');
  });

  it("drops an item ID, which belongs to the other store", () => {
    expect(switchPlatformRoute('/dashboard/apple/subscriptions/6821653142', 'google')).toBe('/dashboard/google/subscriptions');
    expect(switchPlatformRoute('/dashboard/google/products/lifetime', 'apple')).toBe('/dashboard/apple/products');
  });

  it('goes to the platform root from elsewhere', () => {
    expect(switchPlatformRoute('/setup', 'apple')).toBe('/dashboard/apple');
  });
});
