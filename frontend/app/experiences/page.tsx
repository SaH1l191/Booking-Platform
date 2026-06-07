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
      <main className="min-h-screen bg-white">
        {/* Search Header */}
        <div className="sticky top-16 z-40 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
            <div className="flex items-center gap-4 h-16 md:h-20">
              <div className="flex-1 max-w-2xl">
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search room types"
                    className="w-full pl-12 pr-4 py-3 bg-gray-100 border border-transparent rounded-full text-[15px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Room Type Filter Pills */}
        <div className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
            <div className="flex items-center gap-4 overflow-x-auto py-3 scrollbar-hide">
              {roomTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedType === type
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {type === "ALL" ? "All" : type.charAt(0) + type.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-4">
          <p className="text-sm text-gray-500">
            {isLoading ? "Loading..." : `${filtered.length} experiences`}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
              {error}
              <button onClick={clearError} className="ml-2 underline">dismiss</button>
            </div>
          </div>
        )}

        {/* Room Categories Grid */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20 pb-12">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square rounded-xl bg-gray-200" />
                  <div className="mt-3 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
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
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                    <img
                      src={roomImages[rc.roomType]}
                      alt={`${rc.roomType} room`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                      <span className="text-xs font-medium">
                        {roomIcons[rc.roomType]} {rc.roomType.charAt(0) + rc.roomType.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 bg-pink-500 text-white px-2.5 py-1 rounded-full">
                      <span className="text-xs font-medium">{rc.roomCount} available</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-[15px] text-gray-900">
                          {rc.roomType.charAt(0) + rc.roomType.slice(1).toLowerCase()} Room
                        </h3>
                        <p className="text-gray-500 text-sm mt-0.5">{getHotelName(rc.hotelId)}</p>
                        {getHotelLocation(rc.hotelId) && (
                          <p className="text-gray-400 text-xs mt-0.5">{getHotelLocation(rc.hotelId)}</p>
                        )}
                      </div>
                    </div>
                    <p className="mt-1.5">
                      <span className="font-semibold">${rc.price}</span>
                      <span className="text-gray-500"> /night</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-24">
              <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">No experiences found</h3>
              <p className="mt-2 text-sm text-gray-500">Try adjusting your filters</p>
              <button
                onClick={() => setSelectedType("ALL")}
                className="mt-6 px-6 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
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
