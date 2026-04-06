import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
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
          <Button variant="outline" asChild>
            <Link href={`/patients/${patientId}/add-test`}>Add Test</Link>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/api/patients/${patientId}/export`}>Export PDF</a>
          </Button>
        </div>
      </div>

      <PatientCard patient={patient} />

      {patient.assessments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No assessments yet.</p>
          <Button className="mt-4" asChild>
            <Link href={`/patients/${patientId}/add-test`}>
              Add first assessment
            </Link>
          </Button>
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
                      assessment.results as Record<string, ScoringResult>
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
