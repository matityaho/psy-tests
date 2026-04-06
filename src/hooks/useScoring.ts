"use client";

import { useState, useCallback } from "react";
import type {
  ScoringRuleSet,
  ScoringResult,
  ScoringContext,
} from "@/lib/types";

export function useScoring() {
  const [results, setResults] = useState<Record<string, ScoringResult> | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const preview = useCallback(
    async (
      ruleSet: ScoringRuleSet,
      inputs: Record<string, number>,
      context: ScoringContext,
    ) => {
      setLoading(true);

      try {
        const res = await fetch("/api/scoring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleSet, inputs, context }),
        });

        if (res.ok) {
          const data = await res.json();
          setResults(data);
          return data;
        }
      } catch {
        // ignore preview errors
      } finally {
        setLoading(false);
      }

      return null;
    },
    [],
  );

  return { results, loading, preview };
}
