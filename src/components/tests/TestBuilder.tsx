"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOutputPreview } from "./InputOutputPreview";
import { useTestBuilder } from "@/hooks/useTestBuilder";

export function TestBuilder() {
  const {
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
  } = useTestBuilder();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [ageRange, setAgeRange] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="files">
              Test documents (PDFs, images of norm tables)
            </Label>
            <Input
              id="files"
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
              onChange={handleFileChange}
              className="mt-1"
            />
            {files.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {files.length} file(s) selected
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Describe how this test works</Label>
            <Textarea
              id="description"
              placeholder="Describe the test: what are the subtests, how is it scored, what norm tables apply, what do the scores mean..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              className="mt-1"
            />
          </div>

          <Button onClick={generateRules} disabled={generating || !description}>
            {generating ? "Generating Rules..." : "Generate Rules"}
          </Button>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
              {rawError && (
                <details className="mt-2">
                  <summary className="cursor-pointer">Raw AI response</summary>
                  <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs">
                    {rawError}
                  </pre>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {generated && (
        <>
          <InputOutputPreview
            inputs={generated.inputs}
            outputs={generated.outputs}
          />

          <Card>
            <CardHeader>
              <CardTitle>Save Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Test Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., WISC-V, BASC-3"
                  className="mt-1"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Cognitive, Behavioral"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="ageRange">Age Range</Label>
                  <Input
                    id="ageRange"
                    value={ageRange}
                    onChange={(e) => setAgeRange(e.target.value)}
                    placeholder="e.g., 6-16"
                    className="mt-1"
                  />
                </div>
              </div>
              <Button
                onClick={() => saveTest(name, category, ageRange)}
                disabled={saving || !name}
              >
                {saving ? "Saving..." : "Save Test"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
