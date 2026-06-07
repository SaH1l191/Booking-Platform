"use client";

import Link from "next/link";
import { useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useBookingsStore } from "@/stores";
import type { BookingStatus } from "@/stores/types";

const fallbackImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop";

const statusConfig: Record<BookingStatus, { label: string; color: string }> = {
  CONFIRMED: { label: "Confirmed", color: "text-green-700 bg-green-50" },
  PENDING: { label: "Pending", color: "text-amber-700 bg-amber-50" },
  CANCELLED: { label: "Cancelled", color: "text-red-700 bg-red-50" },
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
    clearError,idempotencyKey
  } = useBookingsStore();

  useEffect(() => {
    fetchMyBookings();
  }, [fetchMyBookings]);

  const filtered = bookings.filter((b) => filterStatus === "ALL" || b.status === filterStatus);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-gray-100 border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-6 md:px-10 py-12 md:py-16">
            <h1 className="text-[32px] font-semibold text-gray-900">
              My bookings
            </h1>
            <p className="mt-1 text-gray-600">
              {isLoading ? "Loading..." : `${bookings.length} reservations`}
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 md:px-10 py-6">
          {/* Filters */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            {(["ALL", "CONFIRMED", "PENDING", "CANCELLED"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filterStatus === status
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
              {error}
              <button onClick={clearError} className="ml-2 underline">dismiss</button>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-xl overflow-hidden animate-pulse">
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-48 h-40 bg-gray-200" />
                    <div className="flex-1 p-5 space-y-3">
                      <div className="h-5 bg-gray-200 rounded w-48" />
                      <div className="h-4 bg-gray-200 rounded w-32" />
                      <div className="grid grid-cols-4 gap-3">
                        {Array.from({ length: 4 }).map((_, j) => (
                          <div key={j} className="h-10 bg-gray-200 rounded" />
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
                    className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-48 h-40 sm:h-auto overflow-hidden">
                        <img
                          src={fallbackImage}
                          alt="Hotel"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">Booking #{booking.id}</h3>
                            <p className="text-sm text-gray-500">Hotel #{booking.hotelId}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                              {config.label}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                          <div>
                            <p className="text-gray-500 text-xs">Check-in</p>
                            <p className="font-medium text-gray-900">{formatDate(booking.checkIn)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Check-out</p>
                            <p className="font-medium text-gray-900">{formatDate(booking.checkOut)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Guests</p>
                            <p className="font-medium text-gray-900">{booking.totalGuests}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Amount</p>
                            <p className="font-medium text-gray-900">${booking.bookingAmount.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="text-sm text-gray-500">
                            {nights} nights · ${Math.round(booking.bookingAmount / nights)}/night
                          </div>
                          <div className="flex items-center gap-3">
                            {booking.status === "CONFIRMED" && (
                              <Link
                                href={`/hotels/${booking.hotelId}`}
                                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                              >
                                View hotel
                              </Link>
                            )}
                            {booking.status === "PENDING" && (
                              <button
                                onClick={() => confirmBooking(String(idempotencyKey))}
                                className="px-4 py-2 bg-pink-500 text-white text-sm font-medium rounded-lg hover:bg-pink-600 transition-colors"
                              >
                                Confirm
                              </button>
                            )}
                            {(booking.status === "CONFIRMED" || booking.status === "PENDING") && (
                              <button
                                onClick={() => cancelBooking(booking.id)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
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
              <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">No bookings found</h3>
              <p className="mt-2 text-sm text-gray-500 mb-6">
                {filterStatus === "ALL" ? "You haven&apos;t made any reservations yet" : `No ${filterStatus.toLowerCase()} bookings`}
              </p>
              <Link
                href="/hotels"
                className="inline-flex items-center px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
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
