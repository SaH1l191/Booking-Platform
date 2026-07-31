"use client";

import Link from "next/link";
import { useEffect } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import SearchPanel from "./components/SearchPanel";
import { useHotelsStore } from "@/stores";

const fallbackImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop";

export default function Home() {
  const { hotels, categories, isLoading, fetchHotels, fetchCategories, selectedCategory, setSelectedCategory, setPage } = useHotelsStore();

  useEffect(() => {
    fetchCategories();
    fetchHotels();
  }, [fetchCategories, fetchHotels]);

  const handleCategoryClick = (slug: string) => {
    const newCategory = selectedCategory === slug ? "" : slug;
    setSelectedCategory(newCategory);
    setPage(1);
    fetchHotels();
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream">
        {/* Hero Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-navy/[0.03] to-transparent pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-20 pt-12 pb-10">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl lg:text-[56px] font-serif font-medium text-navy leading-[1.1] tracking-tight">
                Find your next
                <span className="block text-gold italic">extraordinary stay</span>
              </h1>
              <p className="mt-4 text-muted text-lg max-w-xl mx-auto leading-relaxed">
                Discover handpicked hotels, boutique retreats, and unique experiences crafted for the discerning traveler.
              </p>
            </div>
            <SearchPanel />
          </div>
        </div>

        {/* Category Filters */}
        <div className="border-b border-border bg-white/60 backdrop-blur-sm sticky top-[72px] z-40">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
            <div className="flex items-center gap-2 md:gap-3 overflow-x-auto py-4 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.slug
                      ? "bg-navy text-white shadow-luxury"
                      : "bg-white text-primary-soft hover:bg-cream-dark border border-border-light hover:border-border"
                  }`}
                >
                  <span className="text-base">{cat.icon || "🏠"}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hotel Grid */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-10">
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
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-border-light">
                      <img
                        src={hotelImage}
                        alt={hotel.images?.[0]?.altText || hotel.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {hotel.categories?.length > 0 && (
                        <div className="absolute top-3 left-3 glass px-3 py-1.5 rounded-xl">
                          <span className="text-xs font-semibold text-navy">{hotel.categories[0].name}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3.5 px-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-serif font-medium text-[15px] text-navy leading-snug">{hotel.name}</h3>
                        <div className="flex items-center gap-1 shrink-0 bg-gold-light px-2 py-0.5 rounded-md">
                          <svg className="w-3 h-3 text-gold-dark" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span className="text-xs font-semibold text-navy">{hotel.rating || "New"}</span>
                        </div>
                      </div>
                      <p className="text-muted text-sm mt-0.5">{hotel.location}</p>
                      {hotel.categories && hotel.categories.length > 1 && (
                        <p className="text-muted-light text-xs mt-1">
                          {hotel.categories.map((c) => c.name).join(" · ")}
                        </p>
                      )}
                      <p className="mt-2">
                        {lowestPrice !== null ? (
                          <>
                            <span className="font-semibold text-navy">${lowestPrice}</span>
                            <span className="text-muted text-sm"> /night</span>
                          </>
                        ) : (
                          <span className="text-muted-light text-sm">Price unavailable</span>
                        )}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {!isLoading && hotels.length === 0 && (
            <div className="text-center py-28">
              <div className="w-20 h-20 mx-auto bg-cream-dark rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-muted-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-serif font-medium text-navy">No stays available</h3>
              <p className="mt-2 text-sm text-muted">Check back later for new listings</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
