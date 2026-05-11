import { z } from "zod";

export const inputDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  type: z.enum(["number", "integer", "time_mmss"]),
  min: z.number().optional(),
  max: z.number().optional(),
  required: z.boolean(),
});

export type InputDefinition = z.infer<typeof inputDefinitionSchema>;

export const outputDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum([
    "standard_score",
    "percentile",
    "interpretation",
    "composite",
    "custom",
  ]),
});

export type OutputDefinition = z.infer<typeof outputDefinitionSchema>;

export const conditionVariableSchema = z.object({
  id: z.string(),
  source: z.enum([
    "patient.age",
    "patient.gender",
    "assessment.respondentType",
    "input",
  ]),
  sourceInputId: z.string().optional(),
});

export type ConditionVariable = z.infer<typeof conditionVariableSchema>;

export const ageGroupSchema = z.object({
  id: z.string(),
  minMonths: z.number().int().nonnegative(),
  maxMonths: z.number().int().nonnegative(),
});

export type AgeGroup = z.infer<typeof ageGroupSchema>;

export const lookupTableStepSchema = z.object({
  type: z.literal("lookup_table"),
  outputId: z.string(),
  inputId: z.string(),
  conditionFilters: z.record(z.string(), z.string()).optional(),
  table: z.record(z.string(), z.number()).optional(),
  conditionKey: z.string().optional(),
  tablesByGroup: z
    .record(z.string(), z.record(z.string(), z.number()))
    .optional(),
});

export type LookupTableStep = z.infer<typeof lookupTableStepSchema>;

export const formulaStepSchema = z.object({
  type: z.literal("formula"),
  outputId: z.string(),
  formula: z.string(),
  variables: z.record(z.string(), z.string()),
});

export type FormulaStep = z.infer<typeof formulaStepSchema>;

export const thresholdStepSchema = z.object({
  type: z.literal("threshold"),
  outputId: z.string(),
  sourceOutputId: z.string(),
  thresholds: z.array(
    z.object({
      min: z.number().nullable(),
      max: z.number().nullable(),
      label: z.string(),
    }),
  ),
});

export type ThresholdStep = z.infer<typeof thresholdStepSchema>;

export const mappingStepSchema = z.object({
  type: z.literal("mapping"),
  outputId: z.string(),
  sourceId: z.string(),
  map: z.record(z.string(), z.union([z.string(), z.number()])),
});

export type MappingStep = z.infer<typeof mappingStepSchema>;

export const zScoreStepSchema = z.object({
  type: z.literal("z_score"),
  outputId: z.string(),
  inputId: z.string(),
  conditionKey: z.string(),
  statsByGroup: z.record(
    z.string(),
    z.object({ mean: z.number(), sd: z.number().positive() }),
  ),
});

export type ZScoreStep = z.infer<typeof zScoreStepSchema>;

export const scoringStepSchema = z.discriminatedUnion("type", [
  lookupTableStepSchema,
  formulaStepSchema,
  thresholdStepSchema,
  mappingStepSchema,
  zScoreStepSchema,
]);

export type ScoringStep = z.infer<typeof scoringStepSchema>;

export const scoringRuleSetSchema = z.object({
  version: z.string(),
  description: z.string(),
  conditions: z.array(conditionVariableSchema),
  ageGroups: z.array(ageGroupSchema).optional(),
  steps: z.array(scoringStepSchema),
});

export type ScoringRuleSet = z.infer<typeof scoringRuleSetSchema>;

export interface ScoringResult {
  outputId: string;
  label: string;
  value: number | string;
  type: OutputDefinition["type"];
}

export interface ScoringContext {
  ageYears: number;
  ageMonths: number;
  gender: string;
  respondentType?: string;
}
