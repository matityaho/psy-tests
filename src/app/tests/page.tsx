export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { getRequiredSession, isAdmin } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button-variants";
import { TestCard } from "@/components/tests/TestCard";

export default async function TestsPage() {
  const session = await getRequiredSession();
  const userIsAdmin = isAdmin(session);

  const tests = await prisma.test.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Test Library</h2>
        {userIsAdmin && (
          <Link href="/tests/new" className={buttonVariants()}>
            New Test
          </Link>
        )}
      </div>

      {tests.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No tests yet.</p>
          {userIsAdmin && (
            <Link
              href="/tests/new"
              className={buttonVariants({ className: "mt-4" })}
            >
              Create your first test
            </Link>
          )}
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
