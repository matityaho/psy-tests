import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScoringResult } from "@/lib/types";

interface ResultsTableProps {
  results: Record<string, ScoringResult>;
  inputScores?: Record<string, number>;
}

const DISPLAY_ORDER = [
  {
    label: "Immediate Recall",
    scoreId: "immediate_standard_score",
    interpretationId: "immediate_interpretation",
    inputId: "immediate_recall_raw",
  },
  {
    label: "Delayed Recall",
    scoreId: "delayed_standard_score",
    interpretationId: "delayed_interpretation",
    inputId: "delayed_recall_raw",
  },
  {
    label: "Recognition",
    scoreId: "recognition_standard_score",
    interpretationId: "recognition_interpretation",
    inputId: "recognition_raw",
  },
];

export function ResultsTable({ results, inputScores }: ResultsTableProps) {
  const hasStructuredResults = DISPLAY_ORDER.some(
    (row) => results[row.scoreId] || results[row.interpretationId],
  );

  if (!hasStructuredResults) {
    const entries = Object.values(results);
    if (entries.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">No results computed.</p>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Measure</TableHead>
            <TableHead>Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((result) => (
            <TableRow key={result.outputId}>
              <TableCell className="font-medium">{result.label}</TableCell>
              <TableCell>{String(result.value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Measure</TableHead>
          <TableHead>Raw Score</TableHead>
          <TableHead>Standard Score</TableHead>
          <TableHead>Interpretation</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {DISPLAY_ORDER.map((row) => {
          const score = results[row.scoreId];
          const interpretation = results[row.interpretationId];
          const rawValue = inputScores?.[row.inputId];

          return (
            <TableRow key={row.scoreId}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell>{rawValue !== undefined ? rawValue : ""}</TableCell>
              <TableCell>
                {score && typeof score.value === "number"
                  ? score.value.toFixed(2)
                  : ""}
              </TableCell>
              <TableCell>
                {interpretation ? String(interpretation.value) : ""}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
