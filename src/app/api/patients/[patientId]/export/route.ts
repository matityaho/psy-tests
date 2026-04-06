import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { PatientReport } from "@/lib/pdf/report-generator";
import type { ScoringResult } from "@/lib/types";

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

  const assessments = patient.assessments.map((a) => ({
    test: { name: a.test.name },
    assessmentDate: a.assessmentDate,
    respondentType: a.respondentType,
    results: a.results as Record<string, ScoringResult> | null,
  }));

  const buffer = await renderToBuffer(PatientReport({ patient, assessments }));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${patient.firstName}_${patient.lastName}_report.pdf"`,
    },
  });
}
