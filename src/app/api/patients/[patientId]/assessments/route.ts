import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createAssessmentSchema } from "@/lib/validations/assessment";
import { executeScoring } from "@/lib/scoring-engine";
import { ScoringRuleSet } from "@/lib/types";
import { requirePatientOwner } from "@/lib/api-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const { patientId } = await params;
  const { error } = await requirePatientOwner(patientId);
  if (error) return error;

  const assessments = await prisma.assessment.findMany({
    where: { patientId },
    include: { test: true },
    orderBy: { assessmentDate: "desc" },
  });

  return NextResponse.json(assessments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const { patientId } = await params;
  const { error, patient } = await requirePatientOwner(patientId);
  if (error) return error;

  const body = await request.json();
  const parsed = createAssessmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const test = await prisma.test.findUnique({
    where: { id: parsed.data.testId },
  });
  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const now = new Date();
  const age = Math.floor(
    (now.getTime() - patient!.dateOfBirth.getTime()) /
      (365.25 * 24 * 60 * 60 * 1000),
  );

  const results = executeScoring(
    test.scoringRules as ScoringRuleSet,
    parsed.data.inputScores,
    {
      age,
      gender: patient!.gender,
      respondentType: parsed.data.respondentType,
    },
  );

  const assessment = await prisma.assessment.create({
    data: {
      patientId,
      testId: parsed.data.testId,
      inputScores: parsed.data.inputScores,
      results:
        results as unknown as import("@prisma/client").Prisma.InputJsonValue,
      respondentType: parsed.data.respondentType,
      assessmentDate: parsed.data.assessmentDate || new Date(),
      notes: parsed.data.notes,
    },
    include: { test: true },
  });

  return NextResponse.json(assessment, { status: 201 });
}
