"use client";

/**
 * components/forecast/PlanTomorrowCard.tsx
 *
 * Forecast card previewing tomorrow's outlook and the suggested plan-ahead action.
 */

import type { HourlyAQI, Profile } from "@/lib/types";
import { getLocalizedBand } from "@/lib/cpcb-bands";
import { useLocale, useT } from "@/lib/LocaleContext";
import { formatLocalizedHour } from "@/lib/i18n";

interface Props {
  forecast: HourlyAQI[];
  profile: Profile;
}

function findBestHour(hours: HourlyAQI[], candidates: number[]): HourlyAQI | null {
  const eligible = hours.filter((h) => candidates.includes(h.hour));
  if (!eligible.length) return hours.length ? hours.reduce((a, b) => (a.pm25 < b.pm25 ? a : b)) : null;
  return eligible.reduce((a, b) => (a.pm25 < b.pm25 ? a : b));
}

export function PlanTomorrowCard({ forecast, profile }: Props) {
  const { locale } = useLocale();
  const t = useT();

  if (!forecast || forecast.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm font-semibold mb-1">{t("planTomorrow")}</p>
        <p className="text-xs text-muted-foreground">{t("noForecastYet")}</p>
      </div>
    );
  }

  // Use second half of forecast as "tomorrow" if available, else reuse full list
  const tomorrowForecast = forecast.length >= 24 ? forecast.slice(24) : forecast;

  const avgAQI = Math.round(tomorrowForecast.reduce((s, h) => s + h.aqi, 0) / tomorrowForecast.length);
  const summaryBand = getLocalizedBand(avgAQI, locale);

  const bestExercise = findBestHour(tomorrowForecast, [6, 7, 8, 17, 18, 19]);
  const bestSchool = findBestHour(tomorrowForecast, [7, 8, 9]);
  const bestCommute = findBestHour(tomorrowForecast, [8, 9, 10]);

  const rows = [
    { show: true, icon: "🏃", label: t("bestExerciseTime"), hour: bestExercise },
    { show: profile.household.kids > 0, icon: "🎒", label: t("schoolRun"), hour: bestSchool },
    { show: profile.commute.mode !== "wfh", icon: "🚗", label: t("bestCommute"), hour: bestCommute },
  ].filter((r) => r.show && r.hour);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{t("planTomorrow")}</p>
          <p className="text-xs text-muted-foreground">{t("basedOnHourlyForecast")}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: summaryBand.hex }} />
          <span style={{ color: summaryBand.hex }}>{summaryBand.localizedName}</span>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          if (!row.hour) return null;
          const band = getLocalizedBand(row.hour.aqi, locale);
          return (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {row.icon} {row.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatLocalizedHour(row.hour.hour, locale)}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: band.hex + "25", color: band.hex }}
                >
                  AQI {row.hour.aqi}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
