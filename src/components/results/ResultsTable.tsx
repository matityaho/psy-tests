import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScoreDisplay } from "./ScoreDisplay";
import type { ScoringResult } from "@/lib/types";

interface ResultsTableProps {
  results: Record<string, ScoringResult>;
}

export function ResultsTable({ results }: ResultsTableProps) {
  const entries = Object.values(results).filter(
    (r) =>
      r.type === "standard_score" ||
      r.type === "interpretation" ||
      (r.type === "custom" &&
        !r.outputId.startsWith("mean_") &&
        !r.outputId.startsWith("sd_")),
  );

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
          <TableHead>Type</TableHead>
          <TableHead>Result</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((result) => (
          <TableRow key={result.outputId}>
            <TableCell className="font-medium">{result.label}</TableCell>
            <TableCell className="text-muted-foreground">
              {result.type.replace("_", " ")}
            </TableCell>
            <TableCell>
              <ScoreDisplay result={result} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
