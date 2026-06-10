"use client";

import Link from "next/link";
import { useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useBookingsStore } from "@/stores";
import type { BookingStatus } from "@/stores/types";

const fallbackImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop";

const statusConfig: Record<BookingStatus, { label: string; color: string }> = {
  CONFIRMED: { label: "Confirmed", color: "bg-success-light text-success" },
  PENDING: { label: "Pending", color: "bg-warning-light text-warning" },
  CANCELLED: { label: "Cancelled", color: "bg-danger-light text-danger" },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function calculateNights(checkIn: string, checkOut: string) {
  return Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
}

export default function BookingsPage() {
  const {
    bookings,
    filterStatus,
    isLoading,
    error,
    fetchMyBookings,
    confirmBooking,
    cancelBooking,
    setFilterStatus,
    clearError, idempotencyKey
  } = useBookingsStore();

  useEffect(() => {
    fetchMyBookings();
  }, [fetchMyBookings]);

  const filtered = bookings.filter((b) => filterStatus === "ALL" || b.status === filterStatus);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream">
        {/* Header */}
        <div className="bg-navy">
          <div className="max-w-5xl mx-auto px-6 md:px-10 py-12 md:py-16">
            <h1 className="text-4xl font-serif font-semibold text-white">
              My bookings
            </h1>
            <p className="mt-2 text-white/60">
              {isLoading ? "Loading..." : `${bookings.length} reservations`}
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8">
          {/* Filters */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            {(["ALL", "CONFIRMED", "PENDING", "CANCELLED"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  filterStatus === status
                    ? "bg-navy text-white shadow-luxury"
                    : "bg-white text-primary-soft border border-border-light hover:border-border"
                }`}
              >
                {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-danger-light border border-danger/20 rounded-xl text-sm text-danger mb-4">
              {error}
              <button onClick={clearError} className="ml-2 underline font-medium">dismiss</button>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white border border-border-light rounded-2xl overflow-hidden animate-pulse">
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-48 h-40 bg-border-light" />
                    <div className="flex-1 p-5 space-y-3">
                      <div className="h-5 bg-border-light rounded w-48" />
                      <div className="h-4 bg-border-light rounded w-32" />
                      <div className="grid grid-cols-4 gap-3">
                        {Array.from({ length: 4 }).map((_, j) => (
                          <div key={j} className="h-10 bg-border-light rounded-xl" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bookings List */}
          {!isLoading && (
            <div className="space-y-4">
              {filtered.map((booking) => {
                const config = statusConfig[booking.status];
                const nights = calculateNights(booking.checkIn, booking.checkOut);
                return (
                  <div
                    key={booking.id}
                    className="bg-white border border-border-light rounded-2xl overflow-hidden hover:shadow-luxury-lg transition-all"
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-48 h-40 sm:h-auto overflow-hidden">
                        <img
                          src={fallbackImage}
                          alt="Hotel"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-4">
                          <div>
                            <h3 className="font-serif font-semibold text-navy">Booking #{booking.id}</h3>
                            <p className="text-sm text-muted">Hotel #{booking.hotelId}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${config.color}`}>
                            {config.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-muted text-xs mb-0.5">Check-in</p>
                            <p className="font-medium text-navy">{formatDate(booking.checkIn)}</p>
                          </div>
                          <div>
                            <p className="text-muted text-xs mb-0.5">Check-out</p>
                            <p className="font-medium text-navy">{formatDate(booking.checkOut)}</p>
                          </div>
                          <div>
                            <p className="text-muted text-xs mb-0.5">Guests</p>
                            <p className="font-medium text-navy">{booking.totalGuests}</p>
                          </div>
                          <div>
                            <p className="text-muted text-xs mb-0.5">Amount</p>
                            <p className="font-medium text-navy">${booking.bookingAmount.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-border-light">
                          <div className="text-sm text-muted">
                            {nights} nights · ${Math.round(booking.bookingAmount / nights)}/night
                          </div>
                          <div className="flex items-center gap-3">
                            {booking.status === "CONFIRMED" && (
                              <Link
                                href={`/hotels/${booking.hotelId}`}
                                className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-xl hover:bg-navy-light transition-colors shadow-luxury"
                              >
                                View hotel
                              </Link>
                            )}
                            {booking.status === "PENDING" && (
                              <button
                                onClick={() => confirmBooking(String(idempotencyKey))}
                                className="px-4 py-2 bg-success text-white text-sm font-medium rounded-xl hover:bg-success/90 transition-colors"
                              >
                                Confirm
                              </button>
                            )}
                            {(booking.status === "CONFIRMED" || booking.status === "PENDING") && (
                              <button
                                onClick={() => cancelBooking(booking.id)}
                                className="px-4 py-2 border border-border text-primary-soft text-sm font-medium rounded-xl hover:bg-cream-dark transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-24">
              <div className="w-20 h-20 mx-auto bg-cream-dark rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-muted-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-2xl font-serif font-medium text-navy">No bookings found</h3>
              <p className="mt-2 text-sm text-muted mb-6">
                {filterStatus === "ALL" ? "You haven't made any reservations yet" : `No ${filterStatus.toLowerCase()} bookings`}
              </p>
              <Link
                href="/hotels"
                className="inline-flex items-center px-6 py-3 bg-navy text-white text-sm font-medium rounded-xl hover:bg-navy-light transition-colors shadow-luxury"
              >
                Browse stays
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
