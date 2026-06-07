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
    const locations = Array.from(new Set(hotels.map((h) => h.location))).slice(0, 6);
    return locations;
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
    <div ref={panelRef} className="relative w-full md:max-w-3xl mx-auto">
      {/* Bar */}
      <div className="flex items-center bg-white border border-gray-300 rounded-full shadow-sm hover:shadow-md transition-shadow">
        {/* Location */}
        <button
          onClick={() => setActiveTab(activeTab === "location" ? null : "location")}
          className={`flex-1 text-left px-5 py-3.5 rounded-l-full transition-colors ${
            activeTab === "location" ? "bg-gray-100" : "hover:bg-gray-50"
          }`}
        >
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-900">
            Where
          </span>
          <span className={`block text-sm mt-0.5 ${location ? "text-gray-900" : "text-gray-400"}`}>
            {displayLocation}
          </span>
        </button>

        <div className="w-px h-8 bg-gray-300" />

        {/* Check in */}
        <button
          onClick={() => setActiveTab(activeTab === "dates" ? null : "dates")}
          className={`flex-1 text-left px-5 py-3.5 transition-colors ${
            activeTab === "dates" ? "bg-gray-100" : "hover:bg-gray-50"
          }`}
        >
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-900">
            Check in
          </span>
          <span className={`block text-sm mt-0.5 ${checkIn ? "text-gray-900" : "text-gray-400"}`}>
            {checkIn ? formatDateShort(checkIn) : "Add dates"}
          </span>
        </button>

        <div className="w-px h-8 bg-gray-300" />

        {/* Check out */}
        <button
          onClick={() => setActiveTab(activeTab === "dates" ? null : "dates")}
          className={`flex-1 text-left px-5 py-3.5 transition-colors ${
            activeTab === "dates" ? "bg-gray-100" : "hover:bg-gray-50"
          }`}
        >
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-900">
            Check out
          </span>
          <span className={`block text-sm mt-0.5 ${checkOut ? "text-gray-900" : "text-gray-400"}`}>
            {checkOut ? formatDateShort(checkOut) : "Add dates"}
          </span>
        </button>

        <div className="w-px h-8 bg-gray-300" />

        {/* Guests */}
        <button
          onClick={() => setActiveTab(activeTab === "guests" ? null : "guests")}
          className={`flex-1 text-left px-5 py-3.5 transition-colors ${
            activeTab === "guests" ? "bg-gray-100" : "hover:bg-gray-50"
          }`}
        >
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-900">
            Who
          </span>
          <span className={`block text-sm mt-0.5 ${guests > 0 ? "text-gray-900" : "text-gray-400"}`}>
            {displayGuests}
          </span>
        </button>

        {/* Search button */}
        <button
          onClick={handleSearch}
          className="mr-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-full p-3 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Dropdown panels */}
      {activeTab === "location" && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 z-50">
          <div className="relative mb-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Search destinations"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {locationSearch ? "Results" : "Nearby destinations"}
          </p>

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {filteredLocations.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No destinations found</p>
            ) : (
              filteredLocations.map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    setLocation(loc);
                    setActiveTab(null);
                    setLocationSearch("");
                  }}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left ${
                    location === loc
                      ? "bg-pink-50 border border-pink-200"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">{loc}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "dates" && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 p-6 z-50">
          <div className="flex gap-6">
            {/* Check-in */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-900 mb-1">
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
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            {/* Check-out */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-900 mb-1">
                Check-out
              </label>
              <input
                type="date"
                value={checkOut}
                min={checkIn || today}
                onChange={(e) => setCheckOut(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>
          {checkIn && checkOut && (
            <p className="mt-3 text-sm text-gray-500">
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

      {activeTab === "guests" && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 p-5 z-50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Adults</p>
                <p className="text-xs text-gray-500">Ages 13+</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setGuests(Math.max(1, guests - 1))}
                  disabled={guests <= 1}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-gray-900 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  −
                </button>
                <span className="text-sm font-medium w-4 text-center">{guests}</span>
                <button
                  onClick={() => setGuests(Math.min(16, guests + 1))}
                  disabled={guests >= 16}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-gray-900 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
