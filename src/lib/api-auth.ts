import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }
  return { error: null, session };
}

export async function requireAdmin() {
  const { error, session } = await requireSession();
  if (error) return { error, session: null };
  if (!isAdmin(session!)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      session: null,
    };
  }
  return { error: null, session: session! };
}

export async function requirePatientOwner(patientId: string) {
  const { error, session } = await requireSession();
  if (error) return { error, session: null, patient: null };

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });
  if (!patient) {
    return {
      error: NextResponse.json({ error: "Patient not found" }, { status: 404 }),
      session: null,
      patient: null,
    };
  }
  if (patient.userId && patient.userId !== session!.user.id) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      session: null,
      patient: null,
    };
  }

  return { error: null, session: session!, patient };
}
