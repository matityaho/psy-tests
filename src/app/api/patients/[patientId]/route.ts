import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updatePatientSchema } from "@/lib/validations/patient";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const { patientId } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      assessments: {
        include: { test: true },
        orderBy: { assessmentDate: "desc" },
      },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return NextResponse.json(patient);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const { patientId } = await params;
  const body = await request.json();
  const parsed = updatePatientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const patient = await prisma.patient.update({
    where: { id: patientId },
    data: parsed.data,
  });

  return NextResponse.json(patient);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const { patientId } = await params;

  await prisma.patient.delete({ where: { id: patientId } });

  return NextResponse.json({ success: true });
}
