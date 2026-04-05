import { describe, it, expect } from "vitest";
import { executeScoring } from "@/lib/scoring-engine";
import { ScoringRuleSet, ScoringContext } from "@/lib/types";

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

    const inputs = { input_1: 15 };
    const context: ScoringContext = { age: 10, gender: "male" };

    const results = executeScoring(ruleSet, inputs, context);

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

    const inputs = { input_1: 10, input_2: 12 };
    const context: ScoringContext = { age: 10, gender: "male" };

    const results = executeScoring(ruleSet, inputs, context);

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

    const inputs = { input_1: 15 };
    const context: ScoringContext = { age: 10, gender: "male" };

    const results = executeScoring(ruleSet, inputs, context);

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

    const inputs = { input_1: 2 };
    const context: ScoringContext = { age: 10, gender: "male" };

    const results = executeScoring(ruleSet, inputs, context);

    expect(results["output_1"].value).toBe("Medium");
  });

  it("handles condition-filtered lookup tables", () => {
    const ruleSet: ScoringRuleSet = {
      version: "1.0",
      description: "Test conditions",
      conditions: [{ id: "age_group", source: "patient.age" }],
      steps: [
        {
          type: "lookup_table",
          outputId: "output_1",
          inputId: "input_1",
          conditionFilters: { age_group: "6-8" },
          table: { "10": 90 },
        },
        {
          type: "lookup_table",
          outputId: "output_1",
          inputId: "input_1",
          conditionFilters: { age_group: "9-11" },
          table: { "10": 95 },
        },
      ],
    };

    const inputs = { input_1: 10 };
    const context: ScoringContext = { age: 10, gender: "male" };

    const results = executeScoring(ruleSet, inputs, context);

    expect(results["output_1"].value).toBe(95);
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

    const inputs = {};
    const context: ScoringContext = { age: 10, gender: "male" };

    const results = executeScoring(ruleSet, inputs, context);

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

    const inputs = { input_2: 20 };
    const context: ScoringContext = { age: 10, gender: "male" };

    const results = executeScoring(ruleSet, inputs, context);

    expect(results["output_1"].value).toBe("Error: missing input input_1");
    expect(results["output_2"].value).toBe(100);
  });
});
