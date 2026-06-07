"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 shrink-0">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M29 6.5C23.5 1.5 15.5 0 10 3.5C6 6 4 10.5 4 15.5C4 22 8.5 28 16 30C10 32 3 28.5 0 22C3.5 26.5 9 29.5 15 29C10 32 2 29 0 22L4 15.5C4 10.5 6 6 10 3.5C15.5 0 23.5 1.5 29 6.5Z" fill="#FF385C"/>
            </svg>
            <span className="text-xl font-semibold text-gray-900 hidden sm:block">stayease</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/hotels" className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
              Stays
            </Link>
            <Link href="/experiences" className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
              Experiences
            </Link>
          </nav>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/bookings" className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
              My Bookings
            </Link>
            
            <button className="flex items-center gap-3 border border-gray-300 rounded-full py-1.5 pl-3 pr-1.5 hover:shadow-md transition-shadow">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-700"
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
          <div className="md:hidden border-t border-gray-200 py-2 pb-4">
            <Link href="/hotels" className="block px-4 py-3 text-sm font-medium hover:bg-gray-100 rounded-lg">
              Stays
            </Link>
            <Link href="/experiences" className="block px-4 py-3 text-sm font-medium hover:bg-gray-100 rounded-lg">
              Experiences
            </Link>
            <Link href="/bookings" className="block px-4 py-3 text-sm font-medium hover:bg-gray-100 rounded-lg">
              My Bookings
            </Link>
            <div className="border-t border-gray-200 mt-2 pt-2">
              <Link href="/login" className="block px-4 py-3 text-sm font-medium hover:bg-gray-100 rounded-lg">
                Log in
              </Link>
              <Link href="/signup" className="block px-4 py-3 text-sm font-medium hover:bg-gray-100 rounded-lg">
                Sign up
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
