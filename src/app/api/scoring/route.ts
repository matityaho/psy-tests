import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeScoring } from "@/lib/scoring-engine";
import { scoringRuleSetSchema } from "@/lib/types";
import { requireSession } from "@/lib/api-auth";

const scoringRequestSchema = z.object({
  ruleSet: scoringRuleSetSchema,
  inputs: z.record(z.string(), z.number()),
  context: z.object({
    ageYears: z.number().int().nonnegative(),
    ageMonths: z.number().int().min(0).max(11),
    gender: z.string(),
    respondentType: z.string().optional(),
  }),
});

export async function POST(request: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const body = await request.json();
  const parsed = scoringRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const results = executeScoring(
    parsed.data.ruleSet,
    parsed.data.inputs,
    parsed.data.context,
  );

  return NextResponse.json(results);
}
