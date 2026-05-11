import { evaluate } from "mathjs";
import {
  ScoringRuleSet,
  ScoringResult,
  ScoringContext,
  ScoringStep,
  AgeGroup,
} from "@/lib/types";

export const AGE_OUT_OF_RANGE = "AGE_OUT_OF_RANGE";

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
        resolved[condition.id] = resolveAgeGroup(
          context.ageYears,
          context.ageMonths,
          ruleSet.ageGroups,
        );
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
            context[condition.sourceInputId as keyof ScoringContext] ?? "",
          );
        }
        break;
    }
  }

  return resolved;
}

function resolveAgeGroup(
  ageYears: number,
  ageMonths: number,
  ageGroups: AgeGroup[] | undefined,
): string {
  if (!ageGroups || ageGroups.length === 0) {
    return AGE_OUT_OF_RANGE;
  }

  const totalMonths = ageYears * 12 + ageMonths;
  const match = ageGroups.find(
    (g) => totalMonths >= g.minMonths && totalMonths <= g.maxMonths,
  );

  return match ? match.id : AGE_OUT_OF_RANGE;
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
    case "z_score":
      return executeZScore(step, inputs, resolvedConditions);
  }
}

function executeLookup(
  step: {
    outputId: string;
    inputId: string;
    table?: Record<string, number>;
    conditionKey?: string;
    tablesByGroup?: Record<string, Record<string, number>>;
  },
  inputs: Record<string, number>,
  resolvedConditions: Record<string, string>,
): ScoringResult {
  const inputValue = resolvedConditions[step.inputId] ?? inputs[step.inputId];

  if (inputValue === undefined) {
    return errorResult(step.outputId, `missing input ${step.inputId}`);
  }

  let table: Record<string, number> | undefined;
  if (step.tablesByGroup && step.conditionKey) {
    const groupKey = resolvedConditions[step.conditionKey];
    if (!groupKey || groupKey === AGE_OUT_OF_RANGE) {
      return errorResult(step.outputId, "מטופל מחוץ לטווח גילי המבחן");
    }
    table = step.tablesByGroup[groupKey];
    if (!table) {
      return errorResult(step.outputId, `no table for group ${groupKey}`);
    }
  } else if (step.table) {
    table = step.table;
  } else {
    return errorResult(step.outputId, "lookup_table missing data");
  }

  const key = String(inputValue);
  const value = table[key];

  if (value === undefined) {
    return errorResult(step.outputId, `no table entry for ${key}`);
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
      return errorResult(step.outputId, `missing variable ${sourceId}`);
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
    return errorResult(step.outputId, `formula evaluation failed`);
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
      ...errorResult(
        step.outputId,
        `missing source output ${step.sourceOutputId}`,
      ),
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
    value: match ? match.label : `Error: no threshold match for ${source.value}`,
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
    return errorResult(step.outputId, `missing input ${step.sourceId}`);
  }

  const key = String(inputValue);
  const value = step.map[key];

  if (value === undefined) {
    return errorResult(step.outputId, `no mapping for ${key}`);
  }

  return {
    outputId: step.outputId,
    label: step.outputId,
    value,
    type: "custom",
  };
}

function executeZScore(
  step: {
    outputId: string;
    inputId: string;
    conditionKey: string;
    statsByGroup: Record<string, { mean: number; sd: number }>;
  },
  inputs: Record<string, number>,
  resolvedConditions: Record<string, string>,
): ScoringResult {
  const inputValue = inputs[step.inputId];

  if (inputValue === undefined) {
    return errorResult(step.outputId, `missing input ${step.inputId}`);
  }

  const groupKey = resolvedConditions[step.conditionKey];

  if (!groupKey || groupKey === AGE_OUT_OF_RANGE) {
    return errorResult(step.outputId, "מטופל מחוץ לטווח גילי המבחן");
  }

  const stats = step.statsByGroup[groupKey];

  if (!stats) {
    return errorResult(step.outputId, `no stats for group ${groupKey}`);
  }

  const z = (inputValue - stats.mean) / stats.sd;

  return {
    outputId: step.outputId,
    label: step.outputId,
    value: Math.round(z * 100) / 100,
    type: "custom",
  };
}

function errorResult(outputId: string, message: string): ScoringResult {
  return {
    outputId,
    label: outputId,
    value: `Error: ${message}`,
    type: "custom",
  };
}
