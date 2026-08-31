"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useHotelsStore } from "@/stores";

const fallbackImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop";

const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest First" },
  { value: "price", label: "Price: Low to High" },
  { value: "-price", label: "Price: High to Low" },
  { value: "-rating", label: "Rating: High to Low" },
];

const RATING_OPTIONS = [0, 3, 4, 5];

function HotelsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlLocation = searchParams.get("location") || "";
  const urlCategory = searchParams.get("category") || "";
  const urlLatitude = searchParams.get("latitude") || "";
  const urlLongitude = searchParams.get("longitude") || "";
  const urlRadius = searchParams.get("radius") || "";
  const urlMinPrice = searchParams.get("minPrice") || "";
  const urlMaxPrice = searchParams.get("maxPrice") || "";

  const [categorySearch, setCategorySearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    hotels,
    categories,
    selectedCategory,
    sortBy,
    minRating,
    minPrice,
    maxPrice,
    latitude,
    longitude,
    radius,
    page,
    total,
    totalPages,
    isLoading,
    error,
    fetchHotels,
    fetchCategories,
    setSearchQuery,
    setSelectedCategory,
    setSortBy,
    setMinRating,
    setMinPrice,
    setMaxPrice,
    setCoordinates,
    setPage,
    clearError,
  } = useHotelsStore();

  useEffect(() => {
    fetchCategories();
    if (urlLatitude && urlLongitude) {
      setCoordinates(parseFloat(urlLatitude), parseFloat(urlLongitude), parseFloat(urlRadius) || 10);
    } else if (urlLocation) {
      setSearchInput(urlLocation);
    }
    if (urlCategory) {
      setSelectedCategory(urlCategory);
    }
    if (urlMinPrice) setMinPrice(parseFloat(urlMinPrice));
    if (urlMaxPrice) setMaxPrice(parseFloat(urlMaxPrice));
  }, [urlLatitude, urlLongitude, urlRadius, urlLocation, urlCategory, urlMinPrice, urlMaxPrice, setCoordinates, setSelectedCategory, fetchCategories, setMinPrice, setMaxPrice]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setCoordinates(null, null);
      setPage(1);
      fetchHotels();
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput, setSearchQuery, setCoordinates, setPage, fetchHotels]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchInput) params.set("search", searchInput);
    if (selectedCategory) params.set("category", selectedCategory);
    if (sortBy && sortBy !== "-createdAt") params.set("sortBy", sortBy);
    if (minRating > 0) params.set("minRating", String(minRating));
    if (minPrice != null) params.set("minPrice", String(minPrice));
    if (maxPrice != null) params.set("maxPrice", String(maxPrice));
    if (latitude != null && longitude != null) {
      params.set("latitude", String(latitude));
      params.set("longitude", String(longitude));
      params.set("radius", String(radius));
    }
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchInput, selectedCategory, sortBy, minRating, minPrice, maxPrice, latitude, longitude, radius, page, pathname, router]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  const handleCategoryClick = (slug: string) => {
    const newCategory = selectedCategory === slug ? "" : slug;
    setSelectedCategory(newCategory);
    setPage(1);
    fetchHotels();
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1);
    fetchHotels();
  };

  const handleRatingClick = (rating: number) => {
    const next = minRating === rating ? 0 : rating;
    setMinRating(next);
    setPage(1);
    fetchHotels();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    fetchHotels();
  };

  const clearAll = () => {
    setSearchInput("");
    setSearchQuery("");
    setSelectedCategory("");
    setCategorySearch("");
    setMinRating(0);
    setMinPrice(null);
    setMaxPrice(null);
    setSortBy("-createdAt");
    setCoordinates(null, null);
    setPage(1);
    fetchHotels();
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );
  const activeCategoryName = categories.find((c) => c.slug === selectedCategory)?.name || "";

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream">
        {/* Search + Sort + Filter Bar */}
        <div className="sticky top-[72px] z-40 glass border-b border-border-light">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
            <div className="flex items-center gap-3 h-16 md:h-20">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={handleSearchChange}
                    placeholder="Search destinations, hotels"
                    className="w-full pl-12 pr-4 py-3 bg-cream border border-border-light rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent focus:bg-white transition-all placeholder:text-muted"
                  />
                </div>
              </div>

              <div className="h-6 w-px bg-border shrink-0" />

              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-3 py-3 bg-cream border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <div className="h-6 w-px bg-border shrink-0" />

              <div className="flex items-center gap-1">
                {RATING_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRatingClick(r)}
                    className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                      minRating === r && r > 0
                        ? "bg-gold text-navy shadow-sm"
                        : "bg-cream text-muted border border-border-light hover:bg-cream-dark"
                    }`}
                  >
                    {r === 0 ? "All" : `${r}+`}
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                ))}
              </div>

              <div className="h-6 w-px bg-border shrink-0" />

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Min $"
                  value={minPrice ?? ""}
                  onChange={(e) => {
                    setMinPrice(e.target.value ? parseFloat(e.target.value) : null);
                    setPage(1);
                    fetchHotels();
                  }}
                  className="w-20 px-2.5 py-2 bg-cream border border-border-light rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gold placeholder:text-muted"
                />
                <span className="text-muted text-xs">-</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max $"
                  value={maxPrice ?? ""}
                  onChange={(e) => {
                    setMaxPrice(e.target.value ? parseFloat(e.target.value) : null);
                    setPage(1);
                    fetchHotels();
                  }}
                  className="w-20 px-2.5 py-2 bg-cream border border-border-light rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gold placeholder:text-muted"
                />
              </div>

              {selectedCategory && (
                <button
                  onClick={() => { setSelectedCategory(""); setPage(1); fetchHotels(); }}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-xl text-sm font-medium hover:bg-navy-light transition-colors shadow-luxury shrink-0"
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
              {isLoading ? "Loading..." : `${total} stay${total !== 1 ? "s" : ""}${activeCategoryName ? ` in ${activeCategoryName}` : ""}`}
            </p>

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
              <h3 className="text-2xl font-serif font-medium text-navy">No stays found</h3>
              <p className="mt-2 text-sm text-muted">Try adjusting your search or filters</p>
              <button
                onClick={clearAll}
                className="mt-6 px-6 py-3 bg-navy text-white rounded-xl font-medium hover:bg-navy-light transition-colors shadow-luxury"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border-light bg-white hover:bg-cream-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {(() => {
                const pages: (number | "...")[] = [];
                const maxVisible = 7;
                if (totalPages <= maxVisible) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  let start = Math.max(2, page - 2);
                  let end = Math.min(totalPages - 1, page + 2);
                  if (start > 2) pages.push("...");
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (end < totalPages - 1) pages.push("...");
                  pages.push(totalPages);
                }
                return pages.map((p, idx) =>
                  p === "..." ? (
                    <span key={`e-${idx}`} className="w-10 h-10 flex items-center justify-center text-muted text-sm">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${
                        p === page
                          ? "bg-navy text-white shadow-luxury"
                          : "bg-white border border-border-light hover:bg-cream-dark"
                      }`}
                    >
                      {p}
                    </button>
                  )
                );
              })()}
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border-light bg-white hover:bg-cream-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
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
