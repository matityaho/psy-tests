"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center border-b bg-background px-6">
      <div className="ml-auto flex items-center gap-4">
        {session?.user && (
          <>
            {session.user.image && (
              <img
                src={session.user.image}
                alt=""
                className="h-8 w-8 rounded-full"
              />
            )}
            <span className="text-sm text-muted-foreground">
              {session.user.name}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sign Out
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
