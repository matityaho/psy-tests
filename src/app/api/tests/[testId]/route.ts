import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateTestSchema } from "@/lib/validations/test";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  const { testId } = await params;
  const test = await prisma.test.findUnique({ where: { id: testId } });

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  return NextResponse.json(test);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  const { testId } = await params;
  const body = await request.json();
  const parsed = updateTestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const test = await prisma.test.update({
    where: { id: testId },
    data: parsed.data,
  });

  return NextResponse.json(test);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  const { testId } = await params;

  const assessmentCount = await prisma.assessment.count({
    where: { testId },
  });

  if (assessmentCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete test with existing assessments" },
      { status: 409 },
    );
  }

  await prisma.test.delete({ where: { id: testId } });

  return NextResponse.json({ success: true });
}
