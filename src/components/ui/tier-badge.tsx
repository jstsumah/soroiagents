
"use client";

import { Badge } from "@/components/ui/badge";
import type { Tier } from "@/lib/types";
import { cn } from "@/lib/utils";
import * as React from "react";

interface TierBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  tier: Tier;
}

// These are now fallbacks, the actual colors are set via CSS variables
const tierTextColors: Partial<Record<Tier, string>> = {
  Silver: "text-black",
  Gold: "text-black",
  Platinum: "text-black",
  "Rack Rates": "text-white",
};

export function TierBadge({ tier, className }: TierBadgeProps) {
  const textColorClass = tierTextColors[tier] || "text-white";

  return (
    <Badge 
      className={cn("border-transparent", textColorClass, className)}
      style={{ backgroundColor: `var(--tier-${tier.toLowerCase().replace(' ', '-')})` }}
    >
      {tier}
    </Badge>
  );
}
