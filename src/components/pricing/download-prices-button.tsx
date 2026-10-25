'use client';

import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AppleProductPrice } from '@/lib/apple-connect/types';
import { downloadJson, toWebsitePrices } from '@/lib/website-prices';

interface DownloadPricesButtonProps {
  prices: Record<string, AppleProductPrice> | undefined;
  /** Prices that take effect later. With some, the button asks which to save. */
  scheduledPrices?: Record<string, AppleProductPrice>;
  fileName: string;
}

/** Saves the product's prices as the JSON file the website reads. */
export function DownloadPricesButton({ prices, scheduledPrices, fileName }: DownloadPricesButtonProps) {
  const count = Object.keys(prices ?? {}).length;
  const hasScheduled = Object.keys(scheduledPrices ?? {}).length > 0;

  const save = (withScheduled: boolean) => {
    const data = toWebsitePrices(prices ?? {}, withScheduled ? scheduledPrices : undefined);
    downloadJson(fileName, data);
    toast.success(`Saved ${fileName} with ${Object.keys(data).length} regions`);
  };

  if (!hasScheduled) {
    return (
      <Button variant="outline" size="sm" onClick={() => save(false)} disabled={count === 0}>
        <Download className="h-4 w-4 mr-2" />
        Download JSON
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={count === 0}>
          <Download className="h-4 w-4 mr-2" />
          Download JSON
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => save(false)}>Current prices</DropdownMenuItem>
        <DropdownMenuItem onClick={() => save(true)}>With scheduled changes</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
