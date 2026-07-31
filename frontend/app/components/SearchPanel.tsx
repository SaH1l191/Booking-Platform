"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { geocodeLocation } from "@/lib/geocode";

export default function SearchPanel() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) {
      setLoading(true);
      const coords = await geocodeLocation(location.trim());
      if (coords) {
        params.set("latitude", String(coords.lat));
        params.set("longitude", String(coords.lng));
        params.set("radius", "10");
      } else {
        params.set("location", location.trim());
      }
      setLoading(false);
    }
    router.push(`/hotels?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSearch} className="relative z-50 w-full max-w-lg mx-auto">
      <div className="flex items-center bg-white border border-border rounded-full shadow-luxury hover:shadow-luxury-lg transition-all">
        <div className="flex-1 relative">
          <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Anywhere"
            className="w-full pl-12 pr-6 py-4 bg-transparent text-sm font-medium text-navy placeholder:text-muted-light focus:outline-none"
          />
        </div>

        <div className="pr-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-navy hover:bg-navy-light text-white rounded-full px-6 py-3.5 transition-all flex items-center gap-2 shadow-luxury disabled:opacity-60"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            <span className="text-sm font-semibold hidden sm:block">{loading ? "Locating..." : "Search"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
