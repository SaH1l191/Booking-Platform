"use client";

import { useEffect, useState } from "react";
import { useBookingsStore, useHotelsStore } from "@/stores";
import type { BookingStatus } from "@/stores/types";

const statusConfig: Record<BookingStatus, { label: string; color: string }> = {
  CONFIRMED: { label: "Confirmed", color: "bg-success-light text-success" },
  PENDING: { label: "Pending", color: "bg-warning-light text-warning" },
  CANCELLED: { label: "Cancelled", color: "bg-danger-light text-danger" },
  EXPIRED: { label: "Expired", color: "bg-warning-light text-warning" },
};

export default function AdminBookingsPage() {
  const { bookings, isLoading, fetchAllBookings, cancelBooking } = useBookingsStore();
  const { hotels, fetchHotels } = useHotelsStore();
  const [filter, setFilter] = useState<"ALL" | BookingStatus>("ALL");

  useEffect(() => {
    fetchAllBookings();
    fetchHotels();
  }, [fetchAllBookings, fetchHotels]);

  const filtered = bookings.filter((b) => filter === "ALL" || b.status === filter);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-semibold text-navy">Bookings</h1>
        <p className="text-muted mt-1">View and manage all platform bookings.</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {(["ALL", "CONFIRMED", "PENDING", "CANCELLED", "EXPIRED"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filter === status
                ? "bg-navy text-white shadow-luxury"
                : "bg-white text-primary-soft border border-border-light hover:border-border"
            }`}
          >
            {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
            {status !== "ALL" && (
              <span className="ml-1.5 text-xs opacity-70">
                ({bookings.filter((b) => b.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-border-light shadow-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light bg-cream-dark/50">
                <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Booking</th>
                <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Hotel</th>
                <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Dates</th>
                <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Guests</th>
                <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Amount</th>
                <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Status</th>
                <th className="text-right px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-6 py-4"><div className="h-4 bg-border-light rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.map((booking) => {
                const config = statusConfig[booking.status];
                return (
                  <tr key={booking.id} className="hover:bg-cream-dark/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-navy">#{booking.id}</span>
                    </td>
                    <td className="px-6 py-4 text-primary-soft">{hotels.find((h) => h.id === booking.hotelId)?.name || `Hotel #${booking.hotelId}`}</td>
                    <td className="px-6 py-4">
                      <div className="text-primary-soft">
                        <p>{new Date(booking.checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                        <p className="text-xs text-muted">to {new Date(booking.checkOut).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-primary-soft">{booking.totalGuests}</td>
                    <td className="px-6 py-4 font-semibold text-navy">${booking.bookingAmount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${config.color}`}>
                        {config.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {booking.status !== "CANCELLED" && (
                          <button
                            onClick={() => cancelBooking(booking.id)}
                            className="px-3 py-1.5 text-xs font-medium text-danger bg-danger-light rounded-lg hover:bg-danger/10 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-muted">No bookings found</p>
          </div>
        )}
      </div>
    </div>
  );
}
