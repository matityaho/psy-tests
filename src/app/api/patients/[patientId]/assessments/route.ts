import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createAssessmentSchema } from "@/lib/validations/assessment";
import { executeScoring } from "@/lib/scoring-engine";
import { ScoringRuleSet } from "@/lib/types";
import { requirePatientOwner } from "@/lib/api-auth";
import { computePatientAge } from "@/lib/age";

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

  const assessmentDate = parsed.data.assessmentDate || new Date();
  const { ageYears, ageMonths } = computePatientAge(
    patient!.dateOfBirth,
    assessmentDate,
  );

  const results = executeScoring(
    test.scoringRules as ScoringRuleSet,
    parsed.data.inputScores,
    {
      ageYears,
      ageMonths,
      gender: patient!.gender,
      respondentType: parsed.data.respondentType,
    },
  );

  const assessment = await prisma.assessment.create({
    data: {
      patientId,
      testId: parsed.data.testId,
      inputScores: parsed.data.inputScores,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results: results as any,
      respondentType: parsed.data.respondentType,
      assessmentDate,
      notes: parsed.data.notes,
    },
    include: { test: true },
  });

  return NextResponse.json(assessment, { status: 201 });
}
