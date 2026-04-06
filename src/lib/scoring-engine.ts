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
      step.type === "lookup_table" &&
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
  if (age <= 7) return "5-7";
  if (age <= 10) return "8-10";
  if (age <= 13) return "11-13";
  if (age <= 16) return "14-16";
  if (age <= 23) return "17-23";
  if (age <= 29) return "24-29";
  if (age <= 39) return "30-39";
  if (age <= 49) return "40-49";
  if (age <= 59) return "50-59";
  if (age <= 69) return "60-69";
  if (age <= 79) return "70-79";
  return "80+";
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
  resolvedConditions: Record<string, string>,
): ScoringResult | null {
  switch (step.type) {
    case "lookup_table":
      return executeLookup(step, inputs, resolvedConditions);
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
  resolvedConditions: Record<string, string>,
): ScoringResult {
  const inputValue = resolvedConditions[step.inputId] ?? inputs[step.inputId];

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
    let expression = step.formula;
    for (const [placeholder, val] of Object.entries(scope)) {
      expression = expression.replaceAll(`{${placeholder}}`, String(val));
    }
    const value = evaluate(expression, scope) as number;
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
    thresholds: { min: number | null; max: number | null; label: string }[];
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

  const val = source.value as number;
  const match = step.thresholds.find(
    (t) => (t.min === null || val >= t.min) && (t.max === null || val <= t.max),
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
