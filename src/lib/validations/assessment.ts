import { z } from "zod";

export const createAssessmentSchema = z.object({
  testId: z.string().min(1),
  inputScores: z.record(z.number()),
  respondentType: z.enum(["self", "parent", "teacher"]).optional(),
  assessmentDate: z
    .string()
    .transform((s) => new Date(s))
    .optional(),
  notes: z.string().optional(),
});

export const updateAssessmentSchema = z.object({
  inputScores: z.record(z.number()).optional(),
  respondentType: z.enum(["self", "parent", "teacher"]).optional(),
  notes: z.string().optional(),
});
