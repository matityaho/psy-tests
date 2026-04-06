"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  InputDefinition,
  OutputDefinition,
  ScoringRuleSet,
} from "@/lib/types";

interface GeneratedRules {
  ruleSet: ScoringRuleSet;
  inputs: InputDefinition[];
  outputs: OutputDefinition[];
  documentUrls: string[];
}

export function useTestBuilder() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState<GeneratedRules | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);

  async function generateRules() {
    setGenerating(true);
    setError(null);
    setRawError(null);

    const formData = new FormData();
    formData.set("description", description);
    for (const file of files) {
      formData.append("files", file);
    }

    try {
      const res = await fetch("/api/tests/generate-rules", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setRawError(data.raw || null);
        return;
      }

      setGenerated(data);
    } catch {
      setError("Failed to generate rules. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveTest(name: string, category?: string, ageRange?: string) {
    if (!generated) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description,
          category,
          ageRange,
          scoringRules: generated.ruleSet,
          inputs: generated.inputs,
          outputs: generated.outputs,
          rawDescription: description,
          documentUrls: generated.documentUrls,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(
          data.error?.fieldErrors
            ? "Validation error"
            : data.error || "Failed to save test",
        );
        return;
      }

      const test = await res.json();
      router.push(`/tests/${test.id}`);
    } catch {
      setError("Failed to save test. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return {
    description,
    setDescription,
    files,
    setFiles,
    generating,
    saving,
    generated,
    error,
    rawError,
    generateRules,
    saveTest,
    setGenerated,
  };
}
