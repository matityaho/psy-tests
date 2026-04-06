export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssessmentEntry } from "@/components/patients/AssessmentEntry";
import type { InputDefinition } from "@/lib/types";

export default async function AddTestPage({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<{ testId?: string }>;
}) {
  const { patientId } = await params;
  const { testId } = await searchParams;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });
  if (!patient) notFound();

  if (testId) {
    const test = await prisma.test.findUnique({ where: { id: testId } });
    if (!test) notFound();

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">
          Enter Scores: {patient.firstName} {patient.lastName}
        </h2>
        <AssessmentEntry
          patientId={patientId}
          testId={test.id}
          testName={test.name}
          inputs={test.inputs as InputDefinition[]}
        />
      </div>
    );
  }

  const tests = await prisma.test.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">
        Select Test: {patient.firstName} {patient.lastName}
      </h2>

      {tests.length === 0 ? (
        <p className="text-muted-foreground">
          No tests available. Create a test first.
        </p>
      ) : (
        <div className="space-y-2">
          {tests.map((test) => (
            <Link
              key={test.id}
              href={`/patients/${patientId}/add-test?testId=${test.id}`}
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <span className="font-medium">{test.name}</span>
                    {test.description && (
                      <p className="text-sm text-muted-foreground">
                        {test.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {test.category && (
                      <Badge variant="secondary">{test.category}</Badge>
                    )}
                    {test.ageRange && (
                      <Badge variant="outline">Ages {test.ageRange}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
