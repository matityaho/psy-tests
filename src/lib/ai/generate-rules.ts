import Anthropic from "@anthropic-ai/sdk";
import {
  scoringRuleSetSchema,
  inputDefinitionSchema,
  outputDefinitionSchema,
} from "@/lib/types";
import { DocumentBlock, fileToContentBlock } from "./parse-document";
import { z } from "zod";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a psychometric test analysis expert. Your job is to analyze psychological test descriptions and documents (norm tables, scoring manuals, etc.) and generate a deterministic scoring rule set as structured JSON.

You must return a JSON object matching this exact structure:

{
  "ruleSet": {
    "version": "1.0",
    "description": "string - brief description of the test",
    "conditions": [
      {
        "id": "string - e.g., age_group",
        "source": "patient.age" | "patient.gender" | "assessment.respondentType" | "input",
        "sourceInputId": "string - only if source is input"
      }
    ],
    "steps": [
      // Each step is one of:
      // 1. lookup_table: { type: "lookup_table", outputId, inputId, conditionFilters?, table: { "raw_score": standard_score } }
      // 2. formula: { type: "formula", outputId, formula: "math expression with {placeholders}", variables: { placeholder: inputId_or_outputId } }
      // 3. threshold: { type: "threshold", outputId, sourceOutputId, thresholds: [{ min, max, label }] }
      // 4. mapping: { type: "mapping", outputId, sourceId, map: { "key": "value" } }
    ]
  },
  "inputs": [
    { "id": "input_1", "label": "string", "description": "string?", "type": "number" | "integer", "min": number?, "max": number?, "required": true }
  ],
  "outputs": [
    { "id": "output_1", "label": "string", "type": "standard_score" | "percentile" | "interpretation" | "composite" | "custom" }
  ]
}

Rules:
- Include ALL norm tables from the documents as lookup_table steps
- Use condition variables (age_group, gender, respondentType) to select the correct norm table
- Always add threshold steps to map standard scores to verbal interpretations
- Steps execute in order — later steps can reference outputs from earlier steps
- Return ONLY valid JSON, no markdown, no preamble, no trailing text`;

const responseSchema = z.object({
  ruleSet: scoringRuleSetSchema,
  inputs: z.array(inputDefinitionSchema),
  outputs: z.array(outputDefinitionSchema),
});

export type GenerateRulesResult =
  | { success: true; data: z.infer<typeof responseSchema> }
  | { success: false; error: string; raw?: string };

export async function generateRules(
  description: string,
  filePaths: string[],
): Promise<GenerateRulesResult> {
  const contentBlocks: (DocumentBlock | { type: "text"; text: string })[] = [];

  for (const filePath of filePaths) {
    const block = await fileToContentBlock(filePath);
    contentBlocks.push(block);
  }

  contentBlocks.push({
    type: "text",
    text: `Test description:\n\n${description}\n\nAnalyze the above documents and description, then generate the scoring rule set JSON.`,
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: contentBlocks }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { success: false, error: "No text response from Claude" };
  }

  const raw = textBlock.text.trim();

  try {
    const json = JSON.parse(raw);
    const parsed = responseSchema.safeParse(json);

    if (!parsed.success) {
      return {
        success: false,
        error: `Validation failed: ${parsed.error.message}`,
        raw,
      };
    }

    return { success: true, data: parsed.data };
  } catch {
    return { success: false, error: "Failed to parse JSON response", raw };
  }
}
