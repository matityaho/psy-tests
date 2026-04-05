import { z } from "zod";
import {
  inputDefinitionSchema,
  outputDefinitionSchema,
  scoringRuleSetSchema,
} from "@/lib/types/scoring-rules";

export const createTestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  ageRange: z.string().optional(),
  scoringRules: scoringRuleSetSchema,
  inputs: z.array(inputDefinitionSchema),
  outputs: z.array(outputDefinitionSchema),
  rawDescription: z.string().optional(),
  documentUrls: z.array(z.string()).default([]),
});

export const updateTestSchema = createTestSchema.partial();
