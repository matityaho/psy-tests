"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InputDefinition } from "@/lib/types";

interface AssessmentEntryProps {
  patientId: string;
  testId: string;
  testName: string;
  inputs: InputDefinition[];
}

export function AssessmentEntry({
  patientId,
  testId,
  testName,
  inputs,
}: AssessmentEntryProps) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, string>>({});
  const [respondentType, setRespondentType] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setScore(inputId: string, value: string) {
    setScores((prev) => ({ ...prev, [inputId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const inputScores: Record<string, number> = {};
    for (const [key, value] of Object.entries(scores)) {
      if (value !== "") {
        inputScores[key] = Number(value);
      }
    }

    try {
      const res = await fetch(`/api/patients/${patientId}/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          inputScores,
          respondentType: respondentType || undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save assessment");
        return;
      }

      router.push(`/patients/${patientId}`);
    } catch {
      setError("Failed to save assessment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{testName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inputs.map((input) => (
              <div key={input.id}>
                <Label htmlFor={input.id}>
                  {input.label}
                  {input.required && (
                    <span className="ml-1 text-destructive">*</span>
                  )}
                </Label>
                <Input
                  id={input.id}
                  type="number"
                  min={input.min}
                  max={input.max}
                  step={input.type === "integer" ? 1 : "any"}
                  value={scores[input.id] || ""}
                  onChange={(e) => setScore(input.id, e.target.value)}
                  required={input.required}
                  className="mt-1"
                />
                {input.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {input.description}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="respondentType">Respondent Type (optional)</Label>
              <Select value={respondentType} onValueChange={setRespondentType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Submit Scores"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
