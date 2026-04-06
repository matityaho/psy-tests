export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { TestCard } from "@/components/tests/TestCard";
import { cn } from "@/lib/utils";

export default async function TestsPage() {
  const tests = await prisma.test.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Test Library</h2>
        <Link href="/tests/new" className={cn(buttonVariants())}>
          New Test
        </Link>
      </div>

      {tests.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No tests yet.</p>
          <Link href="/tests/new" className={cn(buttonVariants(), "mt-4")}>
            Create your first test
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => (
            <TestCard key={test.id} test={test} />
          ))}
        </div>
      )}
    </div>
  );
}
