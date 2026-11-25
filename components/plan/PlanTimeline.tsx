"use client";

import { PlanCard } from "./PlanCard";
import { useT } from "@/lib/LocaleContext";
import type { PlanItem } from "@/lib/types";

interface PlanTimelineProps {
  items: PlanItem[];
  isLoading?: boolean;
}

export function PlanTimeline({ items, isLoading }: PlanTimelineProps) {
  const t = useT();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted/40 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        {t("noRecommendations")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <PlanCard key={item.id} item={item} index={i} />
      ))}
    </div>
  );
}
