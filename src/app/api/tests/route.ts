import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createTestSchema } from "@/lib/validations/test";

export async function GET() {
  const tests = await prisma.test.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tests);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createTestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const test = await prisma.test.create({ data: parsed.data });

  return NextResponse.json(test, { status: 201 });
}
