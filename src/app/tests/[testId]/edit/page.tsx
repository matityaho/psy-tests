import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { RuleEditor } from "@/components/tests/RuleEditor";
import type {
  InputDefinition,
  OutputDefinition,
  ScoringRuleSet,
} from "@/lib/types";

export default async function EditTestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;

  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) notFound();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Edit: {test.name}</h2>
      <RuleEditor
        testId={test.id}
        initialRuleSet={test.scoringRules as ScoringRuleSet}
        initialInputs={test.inputs as InputDefinition[]}
        initialOutputs={test.outputs as OutputDefinition[]}
      />
    </div>
  );
}
