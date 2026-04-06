import type { ScoringResult } from "@/lib/types";
import { InterpretationBadge } from "./InterpretationBadge";

interface ScoreDisplayProps {
  result: ScoringResult;
}

export function ScoreDisplay({ result }: ScoreDisplayProps) {
  const isError =
    typeof result.value === "string" &&
    String(result.value).startsWith("Error:");

  if (isError) {
    return (
      <span className="text-sm text-muted-foreground">
        {String(result.value)}
      </span>
    );
  }

  if (result.type === "interpretation") {
    return <InterpretationBadge label={String(result.value)} />;
  }

  return <span className="font-medium">{result.value}</span>;
}
