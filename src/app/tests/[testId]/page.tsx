export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { InputOutputPreview } from "@/components/tests/InputOutputPreview";
import type {
  InputDefinition,
  OutputDefinition,
  ScoringRuleSet,
} from "@/lib/types";

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;

  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: { _count: { select: { assessments: true } } },
  });

  if (!test) notFound();

  const inputs = test.inputs as InputDefinition[];
  const outputs = test.outputs as OutputDefinition[];
  const ruleSet = test.scoringRules as ScoringRuleSet;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{test.name}</h2>
          <div className="mt-1 flex gap-2">
            {test.category && (
              <Badge variant="secondary">{test.category}</Badge>
            )}
            {test.ageRange && (
              <Badge variant="outline">Ages {test.ageRange}</Badge>
            )}
          </div>
        </div>
        <Link
          href={`/tests/${test.id}/edit`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Edit Rules
        </Link>
      </div>

      {test.description && (
        <p className="text-muted-foreground">{test.description}</p>
      )}

      <InputOutputPreview inputs={inputs} outputs={outputs} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Scoring Rules ({ruleSet.steps.length} steps)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ruleSet.steps.map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md border p-2 text-sm"
              >
                <Badge variant="outline">{step.type}</Badge>
                <span>
                  {step.outputId}
                  {step.type === "lookup_table" &&
                    ` (${Object.keys(step.table).length} entries)`}
                  {step.type === "formula" && `: ${step.formula}`}
                  {step.type === "threshold" &&
                    ` (${step.thresholds.length} ranges)`}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {test._count.assessments} assessment(s) using this test
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
