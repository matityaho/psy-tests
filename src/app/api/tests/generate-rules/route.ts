import { NextRequest, NextResponse } from "next/server";
import { saveUploadedFile } from "@/lib/ai/parse-document";
import { generateRules } from "@/lib/ai/generate-rules";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const description = formData.get("description") as string;
  const files = formData.getAll("files") as File[];

  if (!description) {
    return NextResponse.json(
      { error: "Description is required" },
      { status: 400 },
    );
  }

  const tempId = randomUUID();
  const filePaths: string[] = [];

  for (const file of files) {
    const filePath = await saveUploadedFile(file, tempId);
    filePaths.push(filePath);
  }

  const result = await generateRules(description, filePaths);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error, raw: result.raw },
      { status: 422 },
    );
  }

  return NextResponse.json({
    ...result.data,
    documentUrls: filePaths.map((p) =>
      p.replace(process.cwd() + "/public", ""),
    ),
  });
}
