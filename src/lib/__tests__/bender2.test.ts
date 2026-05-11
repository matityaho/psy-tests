import { describe, it, expect } from "vitest";
import { executeScoring } from "@/lib/scoring-engine";
import { BENDER2_RULE_SET } from "@/data/bender2_ruleset";
import type { ScoringContext } from "@/lib/types";

const patientAt = (
  ageYears: number,
  ageMonths: number,
): ScoringContext => ({
  ageYears,
  ageMonths,
  gender: "male",
});

describe("Bender II rule set — example case (age 12-0 to 12-3)", () => {
  const inputs = {
    copy_raw: 42,
    copy_duration: 11 * 60 + 15,
    recall_raw: 36,
    recall_duration: 6 * 60 + 21,
  };
  const ctx = patientAt(12, 0);
  const results = executeScoring(BENDER2_RULE_SET, inputs, ctx);

  it("Copy: raw 42 → standard 131", () => {
    expect(results["copy_standard"].value).toBe(131);
  });

  it("Copy: standard 131 → percentile ≈ 98.06", () => {
    expect(results["copy_percentile"].value).toBeCloseTo(98.06, 1);
  });

  it("Copy: standard 131 → verbal גבוה מאוד", () => {
    expect(results["copy_verbal"].value).toBe("גבוה מאוד");
  });

  it("Copy duration: 11:15 → z ≈ -0.31", () => {
    expect(results["copy_duration_z"].value).toBeCloseTo(-0.31, 2);
  });

  it("Copy duration: z=-0.31 → verbal ממוצע", () => {
    expect(results["copy_duration_verbal"].value).toBe("ממוצע");
  });

  it("Recall: raw 36 → standard 157", () => {
    expect(results["recall_standard"].value).toBe(157);
  });

  it("Recall: standard 157 → percentile ≈ 99.99", () => {
    expect(results["recall_percentile"].value).toBeCloseTo(99.99, 1);
  });

  it("Recall duration: 6:21 → z ≈ 1.33", () => {
    expect(results["recall_duration_z"].value).toBeCloseTo(1.33, 2);
  });

  it("Recall duration: z=1.33 → verbal איטי מהממוצע", () => {
    expect(results["recall_duration_verbal"].value).toBe("איטי מהממוצע");
  });
});

describe("Bender II rule set — out-of-range patient", () => {
  it("returns clear error for patient under 4", () => {
    const inputs = { copy_raw: 10, copy_duration: 600 };
    const ctx = patientAt(3, 0);
    const results = executeScoring(BENDER2_RULE_SET, inputs, ctx);
    expect(String(results["copy_standard"].value)).toContain(
      "מטופל מחוץ לטווח",
    );
  });
});

describe("Bender II rule set — age 4 has no recall data", () => {
  it("recall lookup fails gracefully for age 4", () => {
    const inputs = {
      copy_raw: 10,
      copy_duration: 540,
      recall_raw: 5,
      recall_duration: 120,
    };
    const ctx = patientAt(4, 5);
    const results = executeScoring(BENDER2_RULE_SET, inputs, ctx);
    expect(results["copy_standard"].value).toBeTypeOf("number");
    expect(String(results["recall_standard"].value)).toContain("Error");
  });
});
