"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { toast.error("Enter your email"); return; }
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-border-light bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-navy flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 21V7l9-4 9 4v14" stroke="#c9a96e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 21V11h6v10" stroke="#c9a96e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-lg font-semibold text-navy font-serif">Haven</span>
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-12 md:py-20">
        <h1 className="text-4xl font-serif font-semibold text-navy leading-tight">Reset your password</h1>
        <p className="mt-3 text-muted">Enter your email and we&apos;ll send you a reset link.</p>

        {sent ? (
          <div className="mt-8 p-6 bg-gold-light rounded-2xl text-center">
            <p className="text-navy font-medium">Check your email</p>
            <p className="text-sm text-muted mt-1">If an account with <strong>{email}</strong> exists, you&apos;ll receive a reset link shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-4 py-3.5 border border-border rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition-all bg-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 bg-navy hover:bg-navy-light text-white font-semibold rounded-xl transition-all shadow-luxury"
            >
              Send reset link
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          Remember your password?{" "}
          <Link href="/login" className="font-medium text-navy underline hover:text-muted transition-colors">
            Log in
          </Link>
        </p>
      </main>
    </div>
  );
}
