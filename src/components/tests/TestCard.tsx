import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Test } from "@prisma/client";

interface TestCardProps {
  test: Test;
}

export function TestCard({ test }: TestCardProps) {
  const inputs = test.inputs as { id: string; label: string }[];
  const outputs = test.outputs as { id: string; label: string }[];

  return (
    <Link href={`/tests/${test.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{test.name}</CardTitle>
            {test.category && (
              <Badge variant="secondary">{test.category}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {test.description && (
            <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
              {test.description}
            </p>
          )}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{inputs.length} inputs</span>
            <span>{outputs.length} outputs</span>
            {test.ageRange && <span>Ages {test.ageRange}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
