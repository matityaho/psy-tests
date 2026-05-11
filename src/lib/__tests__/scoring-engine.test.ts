import { describe, it, expect } from "vitest";
import { executeScoring } from "@/lib/scoring-engine";
import { ScoringRuleSet, ScoringContext } from "@/lib/types";

const ctx = (ageYears = 10, ageMonths = 0): ScoringContext => ({
  ageYears,
  ageMonths,
  gender: "male",
});

describe("executeScoring", () => {
  it("scores a lookup table step", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test lookup",
      conditions: [],
      steps: [
        {
          type: "lookup_table",
          outputId: "output_1",
          inputId: "input_1",
          table: { "10": 85, "15": 100, "20": 115 },
        },
      ],
    };

    const results = executeScoring(ruleSet, { input_1: 15 }, ctx());

    expect(results["output_1"]).toEqual({
      outputId: "output_1",
      label: "output_1",
      value: 100,
      type: "custom",
    });
  });

  it("scores a formula step", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test formula",
      conditions: [],
      steps: [
        {
          type: "formula",
          outputId: "output_1",
          formula: "(a + b) / 2 * 15 + 100",
          variables: { a: "input_1", b: "input_2" },
        },
      ],
    };

    const results = executeScoring(
      ruleSet,
      { input_1: 10, input_2: 12 },
      ctx(),
    );

    expect(results["output_1"].value).toBe(((10 + 12) / 2) * 15 + 100);
  });

  it("scores a threshold step using a prior output", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test threshold",
      conditions: [],
      steps: [
        {
          type: "lookup_table",
          outputId: "standard_score",
          inputId: "input_1",
          table: { "15": 85 },
        },
        {
          type: "threshold",
          outputId: "interpretation",
          sourceOutputId: "standard_score",
          thresholds: [
            { min: 0, max: 69, label: "Extremely Low" },
            { min: 70, max: 79, label: "Borderline" },
            { min: 80, max: 89, label: "Low Average" },
            { min: 90, max: 109, label: "Average" },
            { min: 110, max: 119, label: "High Average" },
            { min: 120, max: 129, label: "Superior" },
            { min: 130, max: 999, label: "Very Superior" },
          ],
        },
      ],
    };

    const results = executeScoring(ruleSet, { input_1: 15 }, ctx());

    expect(results["standard_score"].value).toBe(85);
    expect(results["interpretation"].value).toBe("Low Average");
  });

  it("scores a mapping step", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test mapping",
      conditions: [],
      steps: [
        {
          type: "mapping",
          outputId: "output_1",
          sourceId: "input_1",
          map: { "1": "Low", "2": "Medium", "3": "High" },
        },
      ],
    };

    const results = executeScoring(ruleSet, { input_1: 2 }, ctx());

    expect(results["output_1"].value).toBe("Medium");
  });

  it("resolves per-rule-set age groups by months", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test age groups",
      conditions: [{ id: "age_group", source: "patient.age" }],
      ageGroups: [
        { id: "young", minMonths: 60, maxMonths: 95 },
        { id: "old", minMonths: 96, maxMonths: 130 },
      ],
      steps: [
        {
          type: "lookup_table",
          outputId: "output_1",
          inputId: "input_1",
          conditionFilters: { age_group: "young" },
          table: { "10": 90 },
        },
        {
          type: "lookup_table",
          outputId: "output_1",
          inputId: "input_1",
          conditionFilters: { age_group: "old" },
          table: { "10": 95 },
        },
      ],
    };

    expect(
      executeScoring(ruleSet, { input_1: 10 }, ctx(10, 0))["output_1"].value,
    ).toBe(95);
    expect(
      executeScoring(ruleSet, { input_1: 10 }, ctx(7, 0))["output_1"].value,
    ).toBe(90);
  });

  it("uses tablesByGroup for grouped lookup", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test grouped lookup",
      conditions: [{ id: "age_group", source: "patient.age" }],
      ageGroups: [
        { id: "g1", minMonths: 60, maxMonths: 95 },
        { id: "g2", minMonths: 96, maxMonths: 130 },
      ],
      steps: [
        {
          type: "lookup_table",
          outputId: "output_1",
          inputId: "input_1",
          conditionKey: "age_group",
          tablesByGroup: {
            g1: { "10": 90 },
            g2: { "10": 95 },
          },
        },
      ],
    };

    expect(
      executeScoring(ruleSet, { input_1: 10 }, ctx(10, 0))["output_1"].value,
    ).toBe(95);
    expect(
      executeScoring(ruleSet, { input_1: 10 }, ctx(7, 0))["output_1"].value,
    ).toBe(90);
  });

  it("computes z_score from per-group stats", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test z_score",
      conditions: [{ id: "age_group", source: "patient.age" }],
      ageGroups: [{ id: "g1", minMonths: 60, maxMonths: 130 }],
      steps: [
        {
          type: "z_score",
          outputId: "duration_z",
          inputId: "duration_seconds",
          conditionKey: "age_group",
          statsByGroup: {
            g1: { mean: 600, sd: 100 },
          },
        },
      ],
    };

    const results = executeScoring(
      ruleSet,
      { duration_seconds: 700 },
      ctx(10, 0),
    );

    expect(results["duration_z"].value).toBe(1);
  });

  it("computes percentile via formula+erf for standard score", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test percentile",
      conditions: [],
      steps: [
        {
          type: "formula",
          outputId: "percentile",
          formula: "round((1 + erf((s - 100) / 15 / sqrt(2))) / 2 * 10000) / 100",
          variables: { s: "standard_score" },
        },
      ],
    };

    const results = executeScoring(ruleSet, { standard_score: 131 }, ctx());

    expect(results["percentile"].value).toBeCloseTo(98.06, 2);
  });

  it("returns out-of-range error when patient age has no matching group", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test out of range",
      conditions: [{ id: "age_group", source: "patient.age" }],
      ageGroups: [{ id: "g1", minMonths: 60, maxMonths: 95 }],
      steps: [
        {
          type: "z_score",
          outputId: "z",
          inputId: "x",
          conditionKey: "age_group",
          statsByGroup: { g1: { mean: 0, sd: 1 } },
        },
      ],
    };

    const results = executeScoring(ruleSet, { x: 5 }, ctx(20, 0));

    expect(results["z"].value).toContain("מטופל מחוץ לטווח");
  });

  it("returns error result for missing input", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test missing input",
      conditions: [],
      steps: [
        {
          type: "lookup_table",
          outputId: "output_1",
          inputId: "input_1",
          table: { "10": 85 },
        },
      ],
    };

    const results = executeScoring(ruleSet, {}, ctx());

    expect(results["output_1"].value).toBe("Error: missing input input_1");
  });

  it("handles partial scoring — succeeds for available inputs", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test partial",
      conditions: [],
      steps: [
        {
          type: "lookup_table",
          outputId: "output_1",
          inputId: "input_1",
          table: { "10": 85 },
        },
        {
          type: "lookup_table",
          outputId: "output_2",
          inputId: "input_2",
          table: { "20": 100 },
        },
      ],
    };

    const results = executeScoring(ruleSet, { input_2: 20 }, ctx());

    expect(results["output_1"].value).toBe("Error: missing input input_1");
    expect(results["output_2"].value).toBe(100);
  });
});
