"use client";

/**
 * app/error.tsx
 *
 * Route-level error boundary for the app segment. Catches unexpected
 * render/runtime errors and offers a recovery action. Static English so it
 * never depends on client-only state (locale/localStorage) during recovery.
 */

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for debugging / monitoring.
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-background text-foreground">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        An unexpected error occurred while loading this page. You can try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
