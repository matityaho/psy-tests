import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createTestSchema } from "@/lib/validations/test";
import { requireSession, requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const tests = await prisma.test.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tests);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
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
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error saving test";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
