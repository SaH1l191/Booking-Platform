"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AuthGuard from "../../components/AuthGuard";
import { useAuthStore } from "@/stores";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [editing, setEditing] = useState(false);

  return (
    <AuthGuard>
      <>
        <Navbar />
        <main className="min-h-screen bg-cream">
          <div className="max-w-2xl mx-auto px-6 md:px-10 py-12">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-serif font-semibold text-navy">Profile</h1>
              <button
                onClick={() => setEditing(!editing)}
                className="px-4 py-2 text-sm font-medium text-navy bg-cream-dark rounded-xl hover:bg-border-light transition-colors"
              >
                {editing ? "Cancel" : "Edit"}
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-border-light shadow-luxury p-8">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border-light">
                <div className="w-16 h-16 rounded-full bg-navy flex items-center justify-center text-white text-xl font-bold">
                  {user?.username?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-navy">{user?.username || "User"}</h2>
                  <p className="text-sm text-muted">{user?.email}</p>
                  <p className="text-xs text-muted-light mt-0.5 capitalize">{user?.roles?.join(", ") || "Member"}</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted mb-1">Username</label>
                  <p className="text-navy font-medium">{user?.username || "—"}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted mb-1">Email</label>
                  <p className="text-navy font-medium">{user?.email || "—"}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted mb-1">Member since</label>
                  <p className="text-navy font-medium">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border-light">
                <Link
                  href="/bookings"
                  className="inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-muted transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  View my bookings
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    </AuthGuard>
  );
}
