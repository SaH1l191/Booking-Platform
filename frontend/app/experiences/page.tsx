"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useRoomCategoriesStore, useHotelsStore } from "@/stores";
import type { RoomType } from "@/stores/types";

const roomTypes: (RoomType | "ALL")[] = ["ALL", "SINGLE", "DOUBLE", "FAMILY", "DELUXE", "SUITE"];

const roomImages: Record<RoomType, string> = {
  SINGLE: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop",
  DOUBLE: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600&h=400&fit=crop",
  FAMILY: "https://images.unsplash.com/photo-1590490360182-c33d955e5bde?w=600&h=400&fit=crop",
  DELUXE: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop",
  SUITE: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&h=400&fit=crop",
};

const roomIcons: Record<RoomType, string> = {
  SINGLE: "1",
  DOUBLE: "2",
  FAMILY: "3+",
  DELUXE: "★",
  SUITE: "♛",
};

export default function ExperiencesPage() {
  const [selectedType, setSelectedType] = useState<RoomType | "ALL">("ALL");
  const { roomCategories, isLoading, error, fetchRoomCategories, clearError } = useRoomCategoriesStore();
  const { hotels, fetchHotels } = useHotelsStore();

  useEffect(() => {
    fetchRoomCategories();
    fetchHotels();
  }, [fetchRoomCategories, fetchHotels]);

  const filtered = roomCategories.filter((rc) =>
    selectedType === "ALL" || rc.roomType === selectedType
  );

  const getHotelName = (hotelId: number) =>
    hotels.find((h) => h.id === hotelId)?.name || "Unknown Hotel";

  const getHotelLocation = (hotelId: number) =>
    hotels.find((h) => h.id === hotelId)?.location || "";

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream">
        {/* Search Header */}
        <div className="sticky top-[72px] z-40 glass border-b border-border-light">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
            <div className="flex items-center gap-4 h-16 md:h-20">
              <div className="flex-1 max-w-2xl">
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search room types"
                    className="w-full pl-12 pr-4 py-3 bg-cream border border-border-light rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent focus:bg-white transition-all placeholder:text-muted"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Room Type Filter Pills */}
        <div className="border-b border-border bg-white/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
            <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-hide">
              {roomTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    selectedType === type
                      ? "bg-navy text-white shadow-luxury"
                      : "bg-white text-primary-soft border border-border-light hover:border-border"
                  }`}
                >
                  {type === "ALL" ? "All" : type.charAt(0) + type.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-5">
          <p className="text-sm text-muted">
            {isLoading ? "Loading..." : `${filtered.length} experiences`}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
            <div className="p-4 bg-danger-light border border-danger/20 rounded-xl text-sm text-danger mb-4">
              {error}
              <button onClick={clearError} className="ml-2 underline font-medium">dismiss</button>
            </div>
          </div>
        )}

        {/* Room Categories Grid */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20 pb-12">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/3] rounded-2xl bg-border-light" />
                  <div className="mt-4 space-y-2.5">
                    <div className="h-4 bg-border-light rounded w-3/4" />
                    <div className="h-3 bg-border-light rounded w-1/2" />
                    <div className="h-3 bg-border-light rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((rc) => (
                <Link
                  key={rc.id}
                  href={`/hotels/${rc.hotelId}`}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-border-light">
                    <img
                      src={roomImages[rc.roomType]}
                      alt={`${rc.roomType} room`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 glass px-3 py-1.5 rounded-xl">
                      <span className="text-xs font-semibold text-navy">
                        {roomIcons[rc.roomType]} {rc.roomType.charAt(0) + rc.roomType.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 bg-navy text-white px-3 py-1.5 rounded-xl">
                      <span className="text-xs font-semibold">{rc.roomCount} available</span>
                    </div>
                  </div>

                  <div className="mt-3.5 px-0.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-serif font-medium text-[15px] text-navy">
                          {rc.roomType.charAt(0) + rc.roomType.slice(1).toLowerCase()} Room
                        </h3>
                        <p className="text-muted text-sm mt-0.5">{getHotelName(rc.hotelId)}</p>
                        {getHotelLocation(rc.hotelId) && (
                          <p className="text-muted-light text-xs mt-0.5">{getHotelLocation(rc.hotelId)}</p>
                        )}
                      </div>
                    </div>
                    <p className="mt-2">
                      <span className="font-semibold text-navy">${rc.price}</span>
                      <span className="text-muted text-sm"> /night</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-28">
              <div className="w-20 h-20 mx-auto bg-cream-dark rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-muted-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-2xl font-serif font-medium text-navy">No experiences found</h3>
              <p className="mt-2 text-sm text-muted">Try adjusting your filters</p>
              <button
                onClick={() => setSelectedType("ALL")}
                className="mt-6 px-6 py-3 bg-navy text-white rounded-xl font-medium hover:bg-navy-light transition-colors shadow-luxury"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
