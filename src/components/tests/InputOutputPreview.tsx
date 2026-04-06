import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InputDefinition, OutputDefinition } from "@/lib/types";

interface InputOutputPreviewProps {
  inputs: InputDefinition[];
  outputs: OutputDefinition[];
}

export function InputOutputPreview({
  inputs,
  outputs,
}: InputOutputPreviewProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Inputs ({inputs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {inputs.map((input) => (
              <div
                key={input.id}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <div>
                  <span className="font-medium">{input.label}</span>
                  {input.description && (
                    <p className="text-xs text-muted-foreground">
                      {input.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Badge variant="outline">{input.type}</Badge>
                  {input.required && (
                    <Badge variant="secondary">required</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Outputs ({outputs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {outputs.map((output) => (
              <div
                key={output.id}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <span className="font-medium">{output.label}</span>
                <Badge variant="outline">{output.type}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
