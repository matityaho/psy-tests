"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ScoringRuleSet,
  InputDefinition,
  OutputDefinition,
} from "@/lib/types";

interface RuleEditorProps {
  testId: string;
  initialRuleSet: ScoringRuleSet;
  initialInputs: InputDefinition[];
  initialOutputs: OutputDefinition[];
}

export function RuleEditor({
  testId,
  initialRuleSet,
  initialInputs,
  initialOutputs,
}: RuleEditorProps) {
  const router = useRouter();
  const [ruleSetJson, setRuleSetJson] = useState(
    JSON.stringify(initialRuleSet, null, 2),
  );
  const [inputsJson, setInputsJson] = useState(
    JSON.stringify(initialInputs, null, 2),
  );
  const [outputsJson, setOutputsJson] = useState(
    JSON.stringify(initialOutputs, null, 2),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const scoringRules = JSON.parse(ruleSetJson);
      const inputs = JSON.parse(inputsJson);
      const outputs = JSON.parse(outputsJson);

      const res = await fetch(`/api/tests/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoringRules, inputs, outputs }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(
          data.error?.fieldErrors ? "Validation error" : "Failed to save",
        );
        return;
      }

      router.push(`/tests/${testId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof SyntaxError ? "Invalid JSON" : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Scoring Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={ruleSetJson}
            onChange={(e) => setRuleSetJson(e.target.value)}
            rows={20}
            className="font-mono text-xs"
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Inputs</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={inputsJson}
              onChange={(e) => setInputsJson(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Outputs</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={outputsJson}
              onChange={(e) => setOutputsJson(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
