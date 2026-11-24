"use client";
import type { HourlyAQI, Profile } from "@/lib/types";
import { getBand } from "@/lib/cpcb-bands";

interface Props { forecast: HourlyAQI[]; profile: Profile; }

function formatHour(h: number): string {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function findBestHour(hours: HourlyAQI[], candidates: number[]): HourlyAQI | null {
  const eligible = hours.filter(h => candidates.includes(h.hour));
  if (!eligible.length) return hours.length ? hours.reduce((a, b) => a.pm25 < b.pm25 ? a : b) : null;
  return eligible.reduce((a, b) => a.pm25 < b.pm25 ? a : b);
}

export function PlanTomorrowCard({ forecast, profile }: Props) {
  if (!forecast || forecast.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm font-semibold mb-1">Plan Tomorrow 📅</p>
        <p className="text-xs text-muted-foreground">No forecast available yet.</p>
      </div>
    );
  }

  // Use second half of forecast as "tomorrow" if available, else reuse full list
  const tomorrowForecast = forecast.length >= 24 ? forecast.slice(24) : forecast;

  const avgAQI = Math.round(tomorrowForecast.reduce((s, h) => s + h.aqi, 0) / tomorrowForecast.length);
  const summaryBand = getBand(avgAQI);

  const bestExercise = findBestHour(tomorrowForecast, [6,7,8,17,18,19]);
  const bestSchool = findBestHour(tomorrowForecast, [7,8,9]);
  const bestCommute = findBestHour(tomorrowForecast, [8,9,10]);

  const rows = [
    { show: true, icon: "🏃", label: "Best exercise", hour: bestExercise },
    { show: profile.household.kids > 0, icon: "🎒", label: "School run: aim for", hour: bestSchool },
    { show: profile.commute.mode !== "wfh", icon: "🚗", label: "Best commute", hour: bestCommute },
  ].filter(r => r.show && r.hour);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Plan Tomorrow 📅</p>
          <p className="text-xs text-muted-foreground">Based on hourly forecast</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: summaryBand.hex }} />
          <span style={{ color: summaryBand.hex }}>{summaryBand.name}</span>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          if (!row.hour) return null;
          const band = getBand(row.hour.aqi);
          return (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {row.icon} {row.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatHour(row.hour.hour)}</span>
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
