export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { PatientCard } from "@/components/patients/PatientCard";
import { ResultsTable } from "@/components/results/ResultsTable";
import type { ScoringResult } from "@/lib/types";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
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

  if (!patient) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Patient Card</h2>
        <div className="flex gap-2">
          <Link
            href={`/patients/${patientId}/add-test`}
            className={buttonVariants({ variant: "outline" })}
          >
            Add Test
          </Link>
          <a
            href={`/api/patients/${patientId}/export`}
            className={buttonVariants({ variant: "outline" })}
          >
            Export PDF
          </a>
        </div>
      </div>

      <PatientCard patient={patient} />

      {patient.assessments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No assessments yet.</p>
          <Link
            href={`/patients/${patientId}/add-test`}
            className={buttonVariants({ className: "mt-4" })}
          >
            Add first assessment
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {patient.assessments.map((assessment) => (
            <Card key={assessment.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {assessment.test.name}
                  </CardTitle>
                  <div className="flex gap-2">
                    {assessment.respondentType && (
                      <Badge variant="outline">
                        {assessment.respondentType}
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {assessment.assessmentDate.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {assessment.results ? (
                  <ResultsTable
                    results={
                      assessment.results as unknown as Record<
                        string,
                        ScoringResult
                      >
                    }
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No results computed.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
