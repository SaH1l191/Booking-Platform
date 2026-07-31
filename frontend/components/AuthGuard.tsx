"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import type { UserRole } from "@/stores/types";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

export default function AuthGuard({ children, requiredRoles }: AuthGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const [rehydrated, setRehydrated] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setRehydrated(true);
    });
    if (useAuthStore.persist.hasHydrated()) {
      setRehydrated(true);
    }
    return () => unsub();
  }, []);

  useEffect(() => {
    if (rehydrated && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [rehydrated, isAuthenticated, isLoading, router]);

  if (!rehydrated || isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-pulse text-muted">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRoles && user) {
    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));
    if (!hasRole) {
      return (
        <div className="min-h-screen bg-cream flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-navy mb-2">Access Denied</h1>
            <p className="text-muted">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
