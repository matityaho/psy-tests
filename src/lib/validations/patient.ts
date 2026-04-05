import { z } from "zod";

export const createPatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().transform((s) => new Date(s)),
  gender: z.enum(["male", "female", "other"]),
  notes: z.string().optional(),
});

export const updatePatientSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dateOfBirth: z
    .string()
    .transform((s) => new Date(s))
    .optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  notes: z.string().optional(),
});
