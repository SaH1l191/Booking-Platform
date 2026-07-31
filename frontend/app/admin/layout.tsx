"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";

const adminLinks = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/admin/hotels",
    label: "Hotels",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    href: "/admin/roomCategories",
    label: "Room Categories",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AuthGuard requiredRoles={["admin"]}>
      <div className="min-h-screen bg-cream flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 bg-navy text-white fixed inset-y-0 left-0 z-50">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-white/10">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 21V7l9-4 9 4v14" stroke="#c9a96e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 21V11h6v10" stroke="#c9a96e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 11V7" stroke="#c9a96e" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <span className="text-lg font-semibold font-serif">Haven</span>
                <span className="block text-[10px] text-gold uppercase tracking-widest">Admin</span>
              </div>
            </Link>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {adminLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Back to site */}
          <div className="px-3 pb-4">
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to site
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 lg:ml-64">
          {/* Mobile header */}
          <div className="lg:hidden sticky top-0 z-40 glass border-b border-border-light px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 21V7l9-4 9 4v14" stroke="#c9a96e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 21V11h6v10" stroke="#c9a96e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="font-serif font-semibold text-navy">Haven</span>
              </Link>
              <span className="text-xs font-semibold uppercase tracking-wider text-gold">Admin Panel</span>
            </div>
            {/* Mobile nav */}
            <div className="flex gap-1 mt-3 overflow-x-auto scrollbar-hide">
              {adminLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isActive
                        ? "bg-navy text-white"
                        : "bg-cream-dark text-primary-soft"
                      }`}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="p-6 md:p-8 lg:p-10">
            {children}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
