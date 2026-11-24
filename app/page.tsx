"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasProfile } from "@/lib/profile";

/**
 * Root page — redirects:
 *   no profile  → /onboarding
 *   has profile → /dashboard
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (hasProfile()) {
      router.replace("/dashboard");
    } else {
      router.replace("/onboarding");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-muted-foreground text-sm animate-pulse">Loading AirWise…</div>
    </div>
  );
}
