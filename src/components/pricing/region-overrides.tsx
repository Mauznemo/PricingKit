'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** Manual prices by region code, in the region's own currency. */
export type RegionOverrides = Record<string, number>;

export interface OverrideRegion {
  code: string;
  name: string;
  currency: string;
}

function readOverrides(storageKey: string): RegionOverrides {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : {};
    const result: RegionOverrides = {};
    for (const [code, value] of Object.entries(parsed ?? {})) {
      if (typeof value === 'number' && value > 0) result[code] = value;
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Manual prices of one product, kept in the browser per product, so they are
 * there again the next time its prices are recalculated.
 */
export function useRegionOverrides(storageKey: string): [RegionOverrides, (next: RegionOverrides) => void] {
  const [overrides, setOverrides] = useState<RegionOverrides>({});

  useEffect(() => {
    setOverrides(readOverrides(storageKey));
  }, [storageKey]);

  const update = (next: RegionOverrides) => {
    setOverrides(next);
    try {
      if (Object.keys(next).length === 0) {
        window.localStorage.removeItem(storageKey);
      } else {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
    } catch {
      // Storage unavailable (private window): the overrides last for this visit
    }
  };

  return [overrides, update];
}

interface RegionOverridesSectionProps {
  regions: OverrideRegion[];
  overrides: RegionOverrides;
  onChange: (next: RegionOverrides) => void;
  /** What the strategy gives each region, to start from and to compare with. */
  calculated: Record<string, number>;
  /** The price the store will really take for a typed one (Apple: its closest tier). */
  snap?: (code: string, value: number) => number | null;
  /** A region that cannot be overridden (the base region). */
  excludeCode?: string;
  /** Called when a region is added, so it can be selected for the update. */
  onAdd?: (code: string) => void;
}

function formatAmount(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** Regions whose price is set by hand, while all others follow the strategy. */
export function RegionOverridesSection({
  regions,
  overrides,
  onChange,
  calculated,
  snap,
  excludeCode,
  onAdd,
}: RegionOverridesSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  // What is typed into each field, so "5." can be typed on the way to "5.99"
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const byCode = useMemo(() => new Map(regions.map((r) => [r.code, r])), [regions]);

  const pickable = useMemo(() => {
    const q = query.trim().toLowerCase();
    return regions.filter(
      (r) =>
        r.code !== excludeCode &&
        overrides[r.code] === undefined &&
        (q === '' ||
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.currency.toLowerCase().includes(q))
    );
  }, [regions, overrides, excludeCode, query]);

  const overridden = Object.keys(overrides)
    .filter((code) => byCode.has(code))
    .sort((a, b) => byCode.get(a)!.name.localeCompare(byCode.get(b)!.name));

  const add = (code: string) => {
    const start = calculated[code];
    onChange({ ...overrides, [code]: start && start > 0 ? start : 0.99 });
    setDrafts((d) => {
      const next = { ...d };
      delete next[code];
      return next;
    });
    onAdd?.(code);
    setPickerOpen(false);
    setQuery('');
  };

  const remove = (code: string) => {
    const next = { ...overrides };
    delete next[code];
    onChange(next);
  };

  const type = (code: string, text: string) => {
    setDrafts((d) => ({ ...d, [code]: text }));
    const value = parseFloat(text);
    if (Number.isFinite(value) && value > 0) {
      onChange({ ...overrides, [code]: value });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label>Manual prices</Label>
          <p className="text-xs text-muted-foreground mt-1">
            These regions keep the price you set here. All others follow the strategy.
          </p>
        </div>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add region
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pickable.length > 0) {
                    e.preventDefault();
                    add(pickable[0].code);
                  }
                }}
                placeholder="Search country, code or currency"
                aria-label="Search regions"
                className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-1" onWheel={(e) => e.stopPropagation()}>
              {pickable.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">No region found</p>
              ) : (
                pickable.map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => add(r.code)}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:outline-none"
                  >
                    <Badge variant="outline" className="font-mono">{r.code}</Badge>
                    <span className="flex-1 truncate">{r.name}</span>
                    <span className="text-xs text-muted-foreground">{r.currency}</span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {overridden.length > 0 && (
        <div className="border rounded-lg divide-y">
          {overridden.map((code) => {
            const region = byCode.get(code)!;
            const value = overrides[code];
            const snapped = snap?.(code, value);
            const strategyPrice = calculated[code];
            return (
              <div key={code} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <Badge variant="outline" className="font-mono">{code}</Badge>
                <span className="text-sm min-w-32 flex-1">{region.name}</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={drafts[code] ?? String(value)}
                    onChange={(e) => type(code, e.target.value)}
                    onBlur={() =>
                      setDrafts((d) => {
                        const next = { ...d };
                        delete next[code];
                        return next;
                      })
                    }
                    aria-label={`Manual price for ${region.name}`}
                    className="w-28 h-8"
                  />
                  <span className="text-xs text-muted-foreground w-10">{region.currency}</span>
                </div>
                <div className="text-xs text-muted-foreground w-44">
                  {snapped !== null && snapped !== undefined && Math.abs(snapped - value) > 0.001 ? (
                    <span className="text-amber-600 dark:text-amber-500">
                      Closest Apple tier: {formatAmount(snapped, region.currency)}
                    </span>
                  ) : strategyPrice !== undefined ? (
                    <>Strategy: {formatAmount(strategyPrice, region.currency)}</>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => remove(code)}
                  aria-label={`Remove manual price for ${region.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Search field above a table of regions. */
export function RegionSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search country, code or currency"
        aria-label="Search regions"
        className="pl-9 h-9"
      />
    </div>
  );
}

/** Keeps the rows whose country, code or currency contains the query. */
export function matchesRegionQuery(
  query: string,
  row: { code: string; name: string; currency: string }
): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  return (
    row.name.toLowerCase().includes(q) ||
    row.code.toLowerCase().includes(q) ||
    row.currency.toLowerCase().includes(q)
  );
}
