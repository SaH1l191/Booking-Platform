"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useHotelsStore } from "@/stores";

interface SearchPanelProps {
  onSearch?: (params: {
    location: string;
    checkIn: string;
    checkOut: string;
    guests: number;
  }) => void;
}

export default function SearchPanel({ onSearch }: SearchPanelProps) {
  const router = useRouter();
  const { hotels, fetchHotels } = useHotelsStore();

  const [activeTab, setActiveTab] = useState<"location" | "dates" | "guests" | null>(null);
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [locationSearch, setLocationSearch] = useState("");

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setActiveTab(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const nearbyLocations = useMemo(() => {
    return Array.from(new Set(hotels.map((h) => h.location))).slice(0, 6);
  }, [hotels]);

  const filteredLocations = useMemo(() => {
    if (!locationSearch) return nearbyLocations;
    return nearbyLocations.filter((loc) =>
      loc.toLowerCase().includes(locationSearch.toLowerCase())
    );
  }, [locationSearch, nearbyLocations]);

  const today = new Date().toISOString().split("T")[0];

  function handleSearch() {
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    params.set("guests", String(guests));

    if (onSearch) {
      onSearch({ location, checkIn, checkOut, guests });
    } else {
      router.push(`/hotels?${params.toString()}`);
    }
    setActiveTab(null);
  }

  const displayLocation = location || "Anywhere";
  const displayGuests = guests > 0 ? `${guests} guest${guests !== 1 ? "s" : ""}` : "Add guests";

  return (
    <div ref={panelRef} className="relative w-full md:max-w-4xl mx-auto">
      {/* Search Bar */}
      <div className="flex items-center bg-white border border-border rounded-2xl shadow-luxury hover:shadow-luxury-lg transition-all">
        {/* Location */}
        <button
          onClick={() => setActiveTab(activeTab === "location" ? null : "location")}
          className={`flex-1 text-left px-6 py-4 rounded-l-2xl transition-colors ${
            activeTab === "location" ? "bg-cream-dark" : "hover:bg-cream-dark/50"
          }`}
        >
          <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
            Location
          </span>
          <span className={`block text-sm mt-0.5 font-medium ${location ? "text-navy" : "text-muted-light"}`}>
            {displayLocation}
          </span>
        </button>

        <div className="w-px h-10 bg-border" />

        {/* Check in */}
        <button
          onClick={() => setActiveTab(activeTab === "dates" ? null : "dates")}
          className={`flex-1 text-left px-6 py-4 transition-colors ${
            activeTab === "dates" ? "bg-cream-dark" : "hover:bg-cream-dark/50"
          }`}
        >
          <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
            Check in
          </span>
          <span className={`block text-sm mt-0.5 font-medium ${checkIn ? "text-navy" : "text-muted-light"}`}>
            {checkIn ? formatDateShort(checkIn) : "Add dates"}
          </span>
        </button>

        <div className="w-px h-10 bg-border" />

        {/* Check out */}
        <button
          onClick={() => setActiveTab(activeTab === "dates" ? null : "dates")}
          className={`flex-1 text-left px-6 py-4 transition-colors ${
            activeTab === "dates" ? "bg-cream-dark" : "hover:bg-cream-dark/50"
          }`}
        >
          <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
            Check out
          </span>
          <span className={`block text-sm mt-0.5 font-medium ${checkOut ? "text-navy" : "text-muted-light"}`}>
            {checkOut ? formatDateShort(checkOut) : "Add dates"}
          </span>
        </button>

        <div className="w-px h-10 bg-border" />

        {/* Guests */}
        <button
          onClick={() => setActiveTab(activeTab === "guests" ? null : "guests")}
          className={`flex-1 text-left px-6 py-4 transition-colors ${
            activeTab === "guests" ? "bg-cream-dark" : "hover:bg-cream-dark/50"
          }`}
        >
          <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
            Guests
          </span>
          <span className={`block text-sm mt-0.5 font-medium ${guests > 0 ? "text-navy" : "text-muted-light"}`}>
            {displayGuests}
          </span>
        </button>

        {/* Search button */}
        <div className="pr-2">
          <button
            onClick={handleSearch}
            className="bg-navy hover:bg-navy-light text-white rounded-xl px-5 py-3.5 transition-all flex items-center gap-2 shadow-luxury"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm font-semibold hidden lg:block">Search</span>
          </button>
        </div>
      </div>

      {/* Location Dropdown */}
      {activeTab === "location" && (
        <div className="absolute top-full left-0 mt-3 w-80 bg-white rounded-2xl shadow-luxury-lg border border-border-light p-5 z-50">
          <div className="relative mb-4">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Search destinations"
              className="w-full pl-10 pr-4 py-2.5 bg-cream border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition-all"
            />
          </div>

          <p className="text-[10px] font-semibold text-muted uppercase tracking-[0.15em] mb-3">
            {locationSearch ? "Results" : "Popular destinations"}
          </p>

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {filteredLocations.length === 0 ? (
              <p className="text-sm text-muted-light py-4 text-center">No destinations found</p>
            ) : (
              filteredLocations.map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    setLocation(loc);
                    setActiveTab(null);
                    setLocationSearch("");
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                    location === loc
                      ? "bg-gold-light border border-gold/20"
                      : "hover:bg-cream-dark"
                  }`}
                >
                  <div className="w-10 h-10 bg-cream rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-navy">{loc}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Dates Dropdown */}
      {activeTab === "dates" && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-white rounded-2xl shadow-luxury-lg border border-border-light p-6 z-50">
          <div className="flex gap-6">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-muted mb-1.5">
                Check-in
              </label>
              <input
                type="date"
                value={checkIn}
                min={today}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  if (checkOut && e.target.value >= checkOut) setCheckOut("");
                }}
                className="px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-muted mb-1.5">
                Check-out
              </label>
              <input
                type="date"
                value={checkOut}
                min={checkIn || today}
                onChange={(e) => setCheckOut(e.target.value)}
                className="px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold transition-all"
              />
            </div>
          </div>
          {checkIn && checkOut && (
            <p className="mt-3 text-sm text-muted">
              {Math.ceil(
                (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
              )}{" "}
              night{Math.ceil(
                (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
              ) !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* Guests Dropdown */}
      {activeTab === "guests" && (
        <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-2xl shadow-luxury-lg border border-border-light p-6 z-50">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-navy">Adults</p>
                <p className="text-xs text-muted">Ages 13+</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setGuests(Math.max(1, guests - 1))}
                  disabled={guests <= 1}
                  className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted hover:border-navy hover:text-navy disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  &minus;
                </button>
                <span className="text-sm font-semibold w-4 text-center text-navy">{guests}</span>
                <button
                  onClick={() => setGuests(Math.min(16, guests + 1))}
                  disabled={guests >= 16}
                  className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted hover:border-navy hover:text-navy disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
