/**
 * __tests__/cpcb-bands.test.ts
 *
 * Unit tests for CPCB AQI bands logic, rounding, and color mappings.
 */

import { describe, it, expect } from "vitest";
import { getBand, getBandHex, getBandName, CPCB_BANDS } from "../lib/cpcb-bands";

describe("CPCB Bands - Fractional AQI rounding and classification", () => {
  it("rounds fractional AQI 50.5 to Satisfactory (51), NOT Severe", () => {
    const band = getBand(50.5);
    expect(band.name).toBe("Satisfactory");
    expect(band.name).not.toBe("Severe");
  });

  it("rounds fractional AQI 50.4 to Good (50)", () => {
    const band = getBand(50.4);
    expect(band.name).toBe("Good");
  });

  it("rounds 100.4 to Satisfactory and 100.5 to Moderate", () => {
    expect(getBand(100.4).name).toBe("Satisfactory");
    expect(getBand(100.5).name).toBe("Moderate");
  });

  it("rounds 200.4 to Moderate and 200.5 to Poor", () => {
    expect(getBand(200.4).name).toBe("Moderate");
    expect(getBand(200.5).name).toBe("Poor");
  });

  it("rounds 300.4 to Poor and 300.5 to Very Poor", () => {
    expect(getBand(300.4).name).toBe("Poor");
    expect(getBand(300.5).name).toBe("Very Poor");
  });

  it("rounds 400.4 to Very Poor and 400.5 to Severe", () => {
    expect(getBand(400.4).name).toBe("Very Poor");
    expect(getBand(400.5).name).toBe("Severe");
  });

  it("clamps negative values to Good", () => {
    expect(getBand(-10).name).toBe("Good");
  });

  it("clamps values over 500 to Severe", () => {
    expect(getBand(650).name).toBe("Severe");
  });
});

describe("CPCB Bands - Color fidelity (Severe is maroon #7f1d1d)", () => {
  it("Severe band has maroon hex #7f1d1d", () => {
    const severeBand = CPCB_BANDS.find((b) => b.name === "Severe");
    expect(severeBand).toBeDefined();
    expect(severeBand?.hex).toBe("#7f1d1d");
  });

  it("getBandHex returns maroon #7f1d1d for Severe AQI (450)", () => {
    expect(getBandHex(450)).toBe("#7f1d1d");
    expect(getBandHex(500)).toBe("#7f1d1d");
  });

  it("Severe is darker/different than Very Poor (#ef4444) and not light pink (#fda4af)", () => {
    const veryPoorHex = getBandHex(350);
    const severeHex = getBandHex(450);

    expect(veryPoorHex).toBe("#ef4444");
    expect(severeHex).toBe("#7f1d1d");
    expect(severeHex).not.toBe("#fda4af");
  });
});
