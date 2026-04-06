import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPatientSchema } from "@/lib/validations/patient";
import { requireSession } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error, session } = await requireSession();
  if (error) return error;

  const search = request.nextUrl.searchParams.get("search");

  const patients = await prisma.patient.findMany({
    where: {
      userId: session!.user.id,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { assessments: true } } },
  });

  return NextResponse.json(patients);
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireSession();
  if (error) return error;

  const body = await request.json();
  const parsed = createPatientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const patient = await prisma.patient.create({
    data: { ...parsed.data, userId: session!.user.id },
  });

  return NextResponse.json(patient, { status: 201 });
}
