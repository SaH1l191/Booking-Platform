"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/stores";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    router.push("/login");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border-light">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-lg bg-navy flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 21V7l9-4 9 4v14" stroke="#c9a96e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 21V11h6v10" stroke="#c9a96e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 11V7" stroke="#c9a96e" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-semibold text-navy tracking-tight font-serif">Haven</span>
              <span className="text-[10px] block text-muted -mt-1 tracking-widest uppercase">Hotels & Stays</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/hotels" className="px-4 py-2 text-sm font-medium text-primary-soft hover:text-navy hover:bg-cream-dark rounded-lg transition-all">
              Stays
            </Link>
            <Link href="/experiences" className="px-4 py-2 text-sm font-medium text-primary-soft hover:text-navy hover:bg-cream-dark rounded-lg transition-all">
              Experiences
            </Link>
          </nav>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/bookings" className="px-4 py-2 text-sm font-medium text-primary-soft hover:text-navy hover:bg-cream-dark rounded-lg transition-all">
              My Bookings
            </Link>

            {/* User Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 border border-border rounded-xl py-1.5 pl-3 pr-1.5 hover:shadow-luxury transition-all bg-white"
              >
                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <div className="w-8 h-8 bg-navy rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-3 w-60 bg-white rounded-2xl shadow-luxury-lg border border-border-light py-2 z-50">
                  {isAuthenticated ? (
                    <>
                      <div className="px-5 py-4 border-b border-border-light">
                        <p className="text-sm font-semibold text-navy">{user?.username}</p>
                        <p className="text-xs text-muted mt-0.5 truncate">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/bookings"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-5 py-2.5 text-sm text-primary-soft hover:bg-cream-dark transition-colors"
                        >
                          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          My Bookings
                        </Link>
                        {user?.roles?.includes("admin") && (
                          <Link
                            href="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-5 py-2.5 text-sm text-primary-soft hover:bg-cream-dark transition-colors"
                          >
                            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Admin Panel
                          </Link>
                        )}
                      </div>
                      <div className="border-t border-border-light pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-danger hover:bg-danger-light transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Log out
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-1">
                      <Link
                        href="/login"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-5 py-2.5 text-sm text-primary-soft hover:bg-cream-dark transition-colors"
                      >
                        <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Log in
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-5 py-2.5 text-sm text-primary-soft hover:bg-cream-dark transition-colors"
                      >
                        <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Sign up
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-navy"
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border-light py-3 pb-5">
            <Link href="/hotels" className="block px-4 py-3 text-sm font-medium text-navy hover:bg-cream-dark rounded-lg transition-colors">
              Stays
            </Link>
            <Link href="/experiences" className="block px-4 py-3 text-sm font-medium text-navy hover:bg-cream-dark rounded-lg transition-colors">
              Experiences
            </Link>
            <Link href="/bookings" className="block px-4 py-3 text-sm font-medium text-navy hover:bg-cream-dark rounded-lg transition-colors">
              My Bookings
            </Link>
            <div className="border-t border-border-light mt-2 pt-2">
              {isAuthenticated ? (
                <>
                  <div className="px-4 py-2 text-xs font-medium text-muted uppercase tracking-wider">
                    Signed in as {user?.username || user?.email}
                  </div>
                  {user?.roles?.includes("admin") && (
                    <Link href="/admin" className="block px-4 py-3 text-sm font-medium text-navy hover:bg-cream-dark rounded-lg transition-colors">
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-danger hover:bg-danger-light rounded-lg transition-colors"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="block px-4 py-3 text-sm font-medium text-navy hover:bg-cream-dark rounded-lg transition-colors">
                    Log in
                  </Link>
                  <Link href="/signup" className="block px-4 py-3 text-sm font-medium text-navy hover:bg-cream-dark rounded-lg transition-colors">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
