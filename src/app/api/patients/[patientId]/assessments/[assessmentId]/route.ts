import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateAssessmentSchema } from "@/lib/validations/assessment";
import { executeScoring } from "@/lib/scoring-engine";
import { ScoringRuleSet } from "@/lib/types";
import { requirePatientOwner } from "@/lib/api-auth";
import { computePatientAge } from "@/lib/age";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string; assessmentId: string }> },
) {
  const { patientId, assessmentId } = await params;
  const { error } = await requirePatientOwner(patientId);
  if (error) return error;

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { test: true, patient: true },
  });

  if (!assessment) {
    return NextResponse.json(
      { error: "Assessment not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(assessment);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; assessmentId: string }> },
) {
  const { patientId, assessmentId } = await params;
  const { error } = await requirePatientOwner(patientId);
  if (error) return error;

  const body = await request.json();
  const parsed = updateAssessmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { test: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Assessment not found" },
      { status: 404 },
    );
  }

  const updateData: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.inputScores) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const { ageYears, ageMonths } = computePatientAge(
      patient.dateOfBirth,
      existing.assessmentDate,
    );

    updateData.results = executeScoring(
      existing.test.scoringRules as ScoringRuleSet,
      parsed.data.inputScores,
      {
        ageYears,
        ageMonths,
        gender: patient.gender,
        respondentType:
          parsed.data.respondentType || existing.respondentType || undefined,
      },
    );
  }

  const assessment = await prisma.assessment.update({
    where: { id: assessmentId },
    data: updateData,
    include: { test: true },
  });

  return NextResponse.json(assessment);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string; assessmentId: string }> },
) {
  const { patientId, assessmentId } = await params;
  const { error } = await requirePatientOwner(patientId);
  if (error) return error;

  await prisma.assessment.delete({ where: { id: assessmentId } });

  return NextResponse.json({ success: true });
}
