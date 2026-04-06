import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPatientSchema } from "@/lib/validations/patient";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search");

  const patients = await prisma.patient.findMany({
    where: search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { assessments: true } } },
  });

  return NextResponse.json(patients);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createPatientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const patient = await prisma.patient.create({ data: parsed.data });

  return NextResponse.json(patient, { status: 201 });
}
