"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useHotelsStore } from "@/stores";

const fallbackImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop";

const roomTypes = ["ALL", "SINGLE", "DOUBLE", "FAMILY", "DELUXE", "SUITE"];

export default function HotelsPage() {
  const searchParams = useSearchParams();
  const urlLocation = searchParams.get("location") || "";

  const {
    hotels,
    searchQuery,
    selectedRoomType,
    isLoading,
    error,
    fetchHotels,
    setSearchQuery,
    setSelectedRoomType,
    clearError,
  } = useHotelsStore();

  useEffect(() => {
    if (urlLocation && !searchQuery) {
      setSearchQuery(urlLocation);
    }
  }, [urlLocation, searchQuery, setSearchQuery]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  const filtered = hotels.filter((hotel) => {
    const matchSearch =
      hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hotel.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType =
      selectedRoomType === "ALL" ||
      hotel.roomCategories?.some((rc) => rc.roomType === selectedRoomType);
    return matchSearch && matchType;
  });

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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search destinations, hotels"
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
                  onClick={() => setSelectedRoomType(type as typeof selectedRoomType)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedRoomType === type
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
            {isLoading ? "Loading..." : `${filtered.length} stays`}
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

        {/* Hotels Grid */}
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
              {filtered.map((hotel) => {
                const lowestPrice = hotel.roomCategories?.length
                  ? Math.min(...hotel.roomCategories.map((rc) => rc.price))
                  : null;

                return (
                  <Link
                    key={hotel.id}
                    href={`/hotels/${hotel.id}`}
                    className="group cursor-pointer"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                      <img
                        src={fallbackImage}
                        alt={hotel.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <button className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white transition-colors">
                        <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                        <span className="text-xs font-medium">Guest favourite</span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-[15px] text-gray-900">{hotel.name}</h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span className="text-sm font-medium">{hotel.rating || "New"}</span>
                        </div>
                      </div>
                      <p className="text-gray-500 text-sm mt-0.5">{hotel.location}</p>
                      {hotel.roomCategories && hotel.roomCategories.length > 0 && (
                        <p className="text-gray-400 text-xs mt-1">
                          {hotel.roomCategories.map((rc) => rc.roomType).join(" · ")}
                        </p>
                      )}
                      <p className="mt-1.5">
                        {lowestPrice !== null ? (
                          <>
                            <span className="font-semibold">${lowestPrice}</span>
                            <span className="text-gray-500"> /night</span>
                          </>
                        ) : (
                          <span className="text-gray-400">Price unavailable</span>
                        )}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-24">
              <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">No stays found</h3>
              <p className="mt-2 text-sm text-gray-500">Try adjusting your search or filters</p>
              <button
                onClick={() => { setSearchQuery(""); setSelectedRoomType("ALL"); }}
                className="mt-6 px-6 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
