export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { getRequiredSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function DashboardPage() {
  const session = await getRequiredSession();

  const [testCount, patientCount, recentPatients, recentAssessments] =
    await Promise.all([
      prisma.test.count({ where: { isActive: true } }),
      prisma.patient.count({ where: { userId: session.user.id } }),
      prisma.patient.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.assessment.findMany({
        where: { patient: { userId: session.user.id } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { patient: true, test: true },
      }),
    ]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{testCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{patientCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assessments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{recentAssessments.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Patients</CardTitle>
            <Link
              href="/patients/new"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              New Patient
            </Link>
          </CardHeader>
          <CardContent>
            {recentPatients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No patients yet.</p>
            ) : (
              <div className="space-y-2">
                {recentPatients.map((patient) => (
                  <Link
                    key={patient.id}
                    href={`/patients/${patient.id}`}
                    className="flex items-center justify-between rounded-md p-2 hover:bg-muted"
                  >
                    <span className="font-medium">
                      {patient.firstName} {patient.lastName}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {patient.updatedAt.toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Assessments</CardTitle>
            <Link
              href="/tests"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View Tests
            </Link>
          </CardHeader>
          <CardContent>
            {recentAssessments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No assessments yet.
              </p>
            ) : (
              <div className="space-y-2">
                {recentAssessments.map((assessment) => (
                  <Link
                    key={assessment.id}
                    href={`/patients/${assessment.patientId}`}
                    className="flex items-center justify-between rounded-md p-2 hover:bg-muted"
                  >
                    <div>
                      <span className="font-medium">
                        {assessment.patient.firstName}{" "}
                        {assessment.patient.lastName}
                      </span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {assessment.test.name}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {assessment.createdAt.toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
