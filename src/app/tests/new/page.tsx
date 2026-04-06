import { TestBuilder } from "@/components/tests/TestBuilder";

export default function NewTestPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Create New Test</h2>
      <TestBuilder />
    </div>
  );
}
