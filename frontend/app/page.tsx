"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import SearchPanel from "./components/SearchPanel";
import { useHotelsStore } from "@/stores";

const fallbackImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop";

export default function Home() {
  const { hotels, categories, isLoading, fetchHotels, fetchCategories, selectedCategory, setSelectedCategory, toggleLike } = useHotelsStore();

  useEffect(() => {
    fetchCategories();
    fetchHotels();
  }, [fetchCategories, fetchHotels]);

  const handleCategoryClick = (slug: string) => {
    const newCategory = selectedCategory === slug ? "" : slug;
    setSelectedCategory(newCategory);
    fetchHotels(newCategory);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white">
        {/* Hero + Search */}
        <div className="relative bg-gradient-to-b from-gray-50 to-white pt-8 pb-6">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-6">
              Find your next stay
            </h1>
            <SearchPanel />
          </div>
        </div>

        {/* Category Filters */}
        <div className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
            <div className="flex items-center gap-6 md:gap-8 overflow-x-auto py-4 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className={`flex flex-col items-center gap-1.5 min-w-[60px] pb-2 border-b-2 transition-colors ${
                    selectedCategory === cat.slug
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <span className="text-2xl">{cat.icon || "🏠"}</span>
                  <span className="text-xs font-medium whitespace-nowrap">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hotel Grid */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-8">
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
              {hotels.map((hotel) => {
                const lowestPrice = hotel.roomCategories?.length
                  ? Math.min(...hotel.roomCategories.map((rc) => rc.price))
                  : null;

                const hotelImage = hotel.images?.length > 0
                  ? hotel.images[0].url
                  : fallbackImage;

                return (
                  <Link
                    key={hotel.id}
                    href={`/hotels/${hotel.id}`}
                    className="group cursor-pointer"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                      <img
                        src={hotelImage}
                        alt={hotel.images?.[0]?.altText || hotel.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleLike(hotel.id);
                        }}
                        className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
                      >
                        <svg
                          className={`w-5 h-5 ${hotel.isLiked ? "text-red-500 fill-red-500" : "text-gray-800"}`}
                          fill={hotel.isLiked ? "currentColor" : "none"}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                      {hotel.categories?.length > 0 && (
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                          <span className="text-xs font-medium">{hotel.categories[0].name}</span>
                        </div>
                      )}
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
                      {hotel.categories && hotel.categories.length > 1 && (
                        <p className="text-gray-400 text-xs mt-1">
                          {hotel.categories.map((c) => c.name).join(" · ")}
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

          {!isLoading && hotels.length === 0 && (
            <div className="text-center py-24">
              <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">No stays available</h3>
              <p className="mt-2 text-sm text-gray-500">Check back later for new listings</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
