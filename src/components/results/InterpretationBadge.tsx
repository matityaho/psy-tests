import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface InterpretationBadgeProps {
  label: string;
}

function getVariant(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("very superior") || lower.includes("extremely high"))
    return "bg-blue-100 text-blue-800";
  if (
    lower.includes("superior") ||
    lower.includes("above average") ||
    lower.includes("high")
  )
    return "bg-green-100 text-green-800";
  if (lower.includes("average")) return "bg-gray-100 text-gray-800";
  if (lower.includes("low average") || lower.includes("below average"))
    return "bg-orange-100 text-orange-800";
  if (
    lower.includes("borderline") ||
    lower.includes("extremely low") ||
    lower.includes("very low")
  )
    return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

export function InterpretationBadge({ label }: InterpretationBadgeProps) {
  return (
    <Badge variant="outline" className={cn("font-medium", getVariant(label))}>
      {label}
    </Badge>
  );
}
