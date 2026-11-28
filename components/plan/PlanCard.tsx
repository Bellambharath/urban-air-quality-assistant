"use client";

/**
 * components/plan/PlanCard.tsx
 *
 * Expandable card for a single recommended action: shows its engine-computed
 * impact and, when expanded, the explanation and a "how we calculate" link.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Leaf, Wind, Car, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/LocaleContext";
import { translateImpactUnit } from "@/lib/i18n";
import type { PlanItem } from "@/lib/types";

interface PlanCardProps {
  item: PlanItem;
  index: number;
}

const CATEGORY_ICONS = {
  routine: Wind,
  indoor: Leaf,
  alternative: Car,
};

export function PlanCard({ item, index }: PlanCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { locale } = useLocale();
  const t = useT();
  const Icon = CATEGORY_ICONS[item.category];

  const hasImpact = item.impact_value > 0;

  const effortLabel =
    item.effort === "low"
      ? t("effortLow")
      : item.effort === "medium"
      ? t("effortMedium")
      : t("effortHigh");

  const localizedUnit = translateImpactUnit(locale, item.impact_unit);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      <Card
        className={cn(
          "overflow-hidden border transition-colors duration-200 cursor-pointer",
          "hover:border-muted-foreground/30"
        )}
        onClick={() => setExpanded((v) => !v)}
      >
        <CardContent className="p-4">
          {/* Collapsed header */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 p-1.5 rounded-md bg-muted/50 shrink-0">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-sm leading-snug">{item.title}</h3>
                {expanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </div>

              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">{item.when}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {effortLabel}
                </Badge>
              </div>

              {/* Impact badge */}
              {hasImpact && (
                <div className="mt-2 inline-flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded px-2 py-0.5 text-xs font-medium">
                  <Leaf className="w-3 h-3" />
                  {item.impact_value} {localizedUnit}
                </div>
              )}
            </div>
          </div>

          {/* Expanded explanation */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.explanation}
                  </p>
                  <button
                    className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <Info className="w-3 h-3" />
                    {t("howWeCalculate")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
