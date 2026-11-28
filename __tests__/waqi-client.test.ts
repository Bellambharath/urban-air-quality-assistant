/**
 * __tests__/waqi-client.test.ts
 *
 * Unit tests for WAQI station parsing, CPCB conversion, and fallback logic.
 */

import { describe, it, expect } from "vitest";
import {
  computeCPCBFromStation,
  pm25ToAQI,
} from "../lib/waqi-client";
import { getBand } from "../lib/cpcb-bands";

describe("WAQI Station CPCB Conversion", () => {
  it("pm25=150 → AQI lands in CPCB scale (>200, Very Poor 301–400), not the US value", () => {
    // In US EPA AQI, PM2.5 = 150 µg/m³ is AQI ≈ 200 (which maps to Moderate <= 200 in CPCB)
    // In India CPCB AQI, PM2.5 = 150 µg/m³ (120–250 breakpoint) converts to AQI 324 (Very Poor)
    const station = {
      aqi: 200, // US EPA AQI from WAQI
      iaqi: { pm25: { v: 150 } },
    };

    const cpcbAQI = computeCPCBFromStation(station);
    expect(cpcbAQI).toBe(324);
    expect(cpcbAQI).toBeGreaterThan(200);

    const band = getBand(cpcbAQI);
    // Verified that it does not land in the US value's band (Moderate)
    expect(band.name).not.toBe("Moderate");
    expect(band.name).toBe("Very Poor");
  });

  it("pm25=105 → AQI lands in the Poor band (201–300), not the US value", () => {
    // In US EPA AQI, PM2.5 = 105 µg/m³ is AQI ≈ 175 (which maps to Moderate in CPCB)
    // In India CPCB AQI, PM2.5 = 105 µg/m³ (90–120 breakpoint) converts to AQI 250 (Poor)
    const station = {
      aqi: 175, // US EPA AQI from WAQI
      iaqi: { pm25: { v: 105 } },
    };

    const cpcbAQI = computeCPCBFromStation(station);
    expect(cpcbAQI).toBe(251);
    expect(cpcbAQI).toBeGreaterThanOrEqual(201);
    expect(cpcbAQI).toBeLessThanOrEqual(300);

    const band = getBand(cpcbAQI);
    expect(band.name).toBe("Poor");
    expect(band.name).not.toBe("Moderate");
  });

  it("falls back to station.aqi only when PM2.5 is missing", () => {
    const stationWithoutPM = {
      aqi: 88,
      iaqi: {
        o3: { v: 40 },
      },
    };

    const fallbackAQI = computeCPCBFromStation(stationWithoutPM);
    expect(fallbackAQI).toBe(88);
  });

  it("takes the maximum of PM2.5 and PM10 CPCB sub-indices", () => {
    const station = {
      aqi: 120,
      iaqi: {
        pm25: { v: 45 },  // CPCB sub-index for PM2.5 45 is 75 (Satisfactory)
        pm10: { v: 280 }, // CPCB sub-index for PM10 280 is 231 (Poor 201–300)
      },
    };

    const cpcbAQI = computeCPCBFromStation(station);
    expect(cpcbAQI).toBe(231);
    expect(getBand(cpcbAQI).name).toBe("Poor");
  });
});

describe("pm25ToAQI CPCB Breakpoints", () => {
  it("converts Good band PM2.5 (0–30) to AQI (0–50)", () => {
    expect(pm25ToAQI(0)).toBe(0);
    expect(pm25ToAQI(15)).toBe(25);
    expect(pm25ToAQI(30)).toBe(50);
  });

  it("converts Satisfactory band PM2.5 (30–60) to AQI (51–100)", () => {
    expect(pm25ToAQI(45)).toBe(76);
    expect(pm25ToAQI(60)).toBe(100);
  });

  it("converts Moderate band PM2.5 (60–90) to AQI (101–200)", () => {
    expect(pm25ToAQI(75)).toBe(151);
    expect(pm25ToAQI(90)).toBe(200);
  });

  it("converts Poor band PM2.5 (90–120) to AQI (201–300)", () => {
    expect(pm25ToAQI(100)).toBe(234);
    expect(pm25ToAQI(120)).toBe(300);
  });

  it("converts Very Poor band PM2.5 (120–250) to AQI (301–400)", () => {
    expect(pm25ToAQI(150)).toBe(324);
    expect(pm25ToAQI(250)).toBe(400);
  });

  it("converts Severe band PM2.5 (250–500) to AQI (401–500)", () => {
    expect(pm25ToAQI(375)).toBe(451);
    expect(pm25ToAQI(500)).toBe(500);
    expect(pm25ToAQI(600)).toBe(500); // Clamped
  });
});
