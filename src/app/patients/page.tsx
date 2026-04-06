export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { getRequiredSession } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent } from "@/components/ui/card";

export default async function PatientsPage() {
  const session = await getRequiredSession();

  const patients = await prisma.patient.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { assessments: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Patients</h2>
        <Link href="/patients/new" className={buttonVariants()}>
          New Patient
        </Link>
      </div>

      {patients.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No patients yet.</p>
          <Link
            href="/patients/new"
            className={buttonVariants({ className: "mt-4" })}
          >
            Add your first patient
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {patients.map((patient) => (
            <Link key={patient.id} href={`/patients/${patient.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <span className="font-medium">
                      {patient.firstName} {patient.lastName}
                    </span>
                    <span className="ml-4 text-sm text-muted-foreground">
                      DOB: {patient.dateOfBirth.toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {patient._count.assessments} assessment(s)
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
