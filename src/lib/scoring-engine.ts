import { evaluate } from "mathjs";
import {
  ScoringRuleSet,
  ScoringResult,
  ScoringContext,
  ScoringStep,
} from "@/lib/types";

export function executeScoring(
  ruleSet: ScoringRuleSet,
  inputs: Record<string, number>,
  context: ScoringContext,
): Record<string, ScoringResult> {
  const results: Record<string, ScoringResult> = {};
  const resolvedConditions = resolveConditions(ruleSet, context);

  for (const step of ruleSet.steps) {
    if (
      step.conditionFilters &&
      !matchesConditions(step.conditionFilters, resolvedConditions)
    ) {
      continue;
    }

    const result = executeStep(step, inputs, results, resolvedConditions);
    if (result) {
      results[result.outputId] = result;
    }
  }

  return results;
}

function resolveConditions(
  ruleSet: ScoringRuleSet,
  context: ScoringContext,
): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const condition of ruleSet.conditions) {
    switch (condition.source) {
      case "patient.age":
        resolved[condition.id] = resolveAgeGroup(context.age);
        break;
      case "patient.gender":
        resolved[condition.id] = context.gender;
        break;
      case "assessment.respondentType":
        resolved[condition.id] = context.respondentType || "self";
        break;
      case "input":
        if (condition.sourceInputId) {
          resolved[condition.id] = String(
            context[condition.sourceInputId as keyof ScoringContext] || "",
          );
        }
        break;
    }
  }

  return resolved;
}

function resolveAgeGroup(age: number): string {
  if (age <= 5) return "0-5";
  if (age <= 8) return "6-8";
  if (age <= 11) return "9-11";
  if (age <= 14) return "12-14";
  if (age <= 17) return "15-17";
  return "18+";
}

function matchesConditions(
  filters: Record<string, string>,
  resolved: Record<string, string>,
): boolean {
  return Object.entries(filters).every(
    ([key, value]) => resolved[key] === value,
  );
}

function executeStep(
  step: ScoringStep,
  inputs: Record<string, number>,
  priorResults: Record<string, ScoringResult>,
  _conditions: Record<string, string>,
): ScoringResult | null {
  switch (step.type) {
    case "lookup_table":
      return executeLookup(step, inputs);
    case "formula":
      return executeFormula(step, inputs, priorResults);
    case "threshold":
      return executeThreshold(step, priorResults);
    case "mapping":
      return executeMapping(step, inputs);
  }
}

function executeLookup(
  step: { outputId: string; inputId: string; table: Record<string, number> },
  inputs: Record<string, number>,
): ScoringResult {
  const inputValue = inputs[step.inputId];

  if (inputValue === undefined) {
    return {
      outputId: step.outputId,
      label: step.outputId,
      value: `Error: missing input ${step.inputId}`,
      type: "custom",
    };
  }

  const key = String(inputValue);
  const value = step.table[key];

  if (value === undefined) {
    return {
      outputId: step.outputId,
      label: step.outputId,
      value: `Error: no table entry for ${key}`,
      type: "custom",
    };
  }

  return {
    outputId: step.outputId,
    label: step.outputId,
    value,
    type: "custom",
  };
}

function executeFormula(
  step: {
    outputId: string;
    formula: string;
    variables: Record<string, string>;
  },
  inputs: Record<string, number>,
  priorResults: Record<string, ScoringResult>,
): ScoringResult {
  const scope: Record<string, number> = {};

  for (const [placeholder, sourceId] of Object.entries(step.variables)) {
    if (inputs[sourceId] !== undefined) {
      scope[placeholder] = inputs[sourceId];
    } else if (
      priorResults[sourceId] &&
      typeof priorResults[sourceId].value === "number"
    ) {
      scope[placeholder] = priorResults[sourceId].value as number;
    } else {
      return {
        outputId: step.outputId,
        label: step.outputId,
        value: `Error: missing variable ${sourceId}`,
        type: "custom",
      };
    }
  }

  try {
    const value = evaluate(step.formula, scope) as number;
    return {
      outputId: step.outputId,
      label: step.outputId,
      value,
      type: "custom",
    };
  } catch {
    return {
      outputId: step.outputId,
      label: step.outputId,
      value: `Error: formula evaluation failed`,
      type: "custom",
    };
  }
}

function executeThreshold(
  step: {
    outputId: string;
    sourceOutputId: string;
    thresholds: { min: number; max: number; label: string }[];
  },
  priorResults: Record<string, ScoringResult>,
): ScoringResult {
  const source = priorResults[step.sourceOutputId];

  if (!source || typeof source.value !== "number") {
    return {
      outputId: step.outputId,
      label: step.outputId,
      value: `Error: missing source output ${step.sourceOutputId}`,
      type: "interpretation",
    };
  }

  const match = step.thresholds.find(
    (t) =>
      (source.value as number) >= t.min && (source.value as number) <= t.max,
  );

  return {
    outputId: step.outputId,
    label: step.outputId,
    value: match
      ? match.label
      : `Error: no threshold match for ${source.value}`,
    type: "interpretation",
  };
}

function executeMapping(
  step: {
    outputId: string;
    sourceId: string;
    map: Record<string, string | number>;
  },
  inputs: Record<string, number>,
): ScoringResult {
  const inputValue = inputs[step.sourceId];

  if (inputValue === undefined) {
    return {
      outputId: step.outputId,
      label: step.outputId,
      value: `Error: missing input ${step.sourceId}`,
      type: "custom",
    };
  }

  const key = String(inputValue);
  const value = step.map[key];

  if (value === undefined) {
    return {
      outputId: step.outputId,
      label: step.outputId,
      value: `Error: no mapping for ${key}`,
      type: "custom",
    };
  }

  return {
    outputId: step.outputId,
    label: step.outputId,
    value,
    type: "custom",
  };
}
