"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useHotelsStore } from "@/stores";

const fallbackImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop";

function HotelsContent() {
  const searchParams = useSearchParams();
  const urlLocation = searchParams.get("location") || "";
  const urlCategory = searchParams.get("category") || "";
  const urlCheckIn = searchParams.get("checkIn") || "";
  const urlCheckOut = searchParams.get("checkOut") || "";
  const urlGuests = searchParams.get("guests") || "";

  const [categorySearch, setCategorySearch] = useState("");

  const {
    hotels,
    categories,
    searchQuery,
    selectedCategory,
    isLoading,
    error,
    fetchHotels,
    fetchCategories,
    setSearchQuery,
    setSelectedCategory,
    clearError,
  } = useHotelsStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (urlLocation && !searchQuery) {
      setSearchQuery(urlLocation);
    }
    if (urlCategory && !selectedCategory) {
      setSelectedCategory(urlCategory);
      fetchHotels(urlCategory);
    }
  }, [urlLocation, urlCategory, searchQuery, selectedCategory, setSearchQuery, setSelectedCategory, fetchHotels]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  const handleCategoryClick = (slug: string) => {
    const newCategory = selectedCategory === slug ? "" : slug;
    setSelectedCategory(newCategory);
    fetchHotels(newCategory);
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filtered = hotels.filter((hotel) => {
    const matchSearch =
      hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hotel.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  const activeCategoryName = categories.find((c) => c.slug === selectedCategory)?.name || "";

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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search destinations, hotels"
                    className="w-full pl-12 pr-4 py-3 bg-cream border border-border-light rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent focus:bg-white transition-all placeholder:text-muted"
                  />
                </div>
              </div>
              {selectedCategory && (
                <button
                  onClick={() => { setSelectedCategory(""); fetchHotels(""); }}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-xl text-sm font-medium hover:bg-navy-light transition-colors shadow-luxury"
                >
                  {activeCategoryName}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="border-b border-border bg-white/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
            <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-hide">
              <div className="relative min-w-[200px]">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition-all placeholder:text-muted"
                />
              </div>

              <div className="h-6 w-px bg-border shrink-0" />

              {filteredCategories.map((cat) => (
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

              {filteredCategories.length === 0 && categorySearch && (
                <p className="text-sm text-muted py-2">No categories found</p>
              )}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-5">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm text-muted">
              {isLoading ? "Loading..." : `${filtered.length} stays${activeCategoryName ? ` in ${activeCategoryName}` : ""}`}
            </p>
            {urlCheckIn && urlCheckOut && (
              <span className="text-xs px-2.5 py-1 bg-cream-dark rounded-lg text-primary-soft">
                {new Date(urlCheckIn).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(urlCheckOut).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
            {urlGuests && (
              <span className="text-xs px-2.5 py-1 bg-cream-dark rounded-lg text-primary-soft">
                {urlGuests} guest{Number(urlGuests) !== 1 ? "s" : ""}
              </span>
            )}
          </div>
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

        {/* Hotels Grid */}
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
              {filtered.map((hotel) => {
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

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-28">
              <div className="w-20 h-20 mx-auto bg-cream-dark rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-muted-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-serif font-medium text-navy">No stays found</h3>
              <p className="mt-2 text-sm text-muted">Try adjusting your search or filters</p>
              <button
                onClick={() => { setSearchQuery(""); setSelectedCategory(""); setCategorySearch(""); fetchHotels(""); }}
                className="mt-6 px-6 py-3 bg-navy text-white rounded-xl font-medium hover:bg-navy-light transition-colors shadow-luxury"
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

export default function HotelsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-pulse text-muted">Loading...</div>
      </div>
    }>
      <HotelsContent />
    </Suspense>
  );
}
