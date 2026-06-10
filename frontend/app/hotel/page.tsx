"use client";

import { useEffect, useState } from "react";
import { useHotelsStore, useBookingsStore } from "@/stores";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
}

function StatCard({ label, value, change, icon, trend = "neutral" }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-border-light shadow-luxury">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted font-medium">{label}</p>
          <p className="text-3xl font-serif font-semibold text-navy mt-1">{value}</p>
          {change && (
            <p className={`text-xs font-medium mt-2 ${
              trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-muted"
            }`}>
              {trend === "up" && "↑ "}
              {trend === "down" && "↓ "}
              {change}
            </p>
          )}
        </div>
        <div className="w-12 h-12 bg-gold-light rounded-xl flex items-center justify-center text-gold-dark">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function HotelDashboard() {
  const { hotels, fetchHotels } = useHotelsStore();
  const { bookings, fetchMyBookings } = useBookingsStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchHotels();
    fetchMyBookings();
  }, [fetchHotels, fetchMyBookings]);

  const confirmedBookings = bookings.filter((b) => b.status === "CONFIRMED").length;
  const pendingBookings = bookings.filter((b) => b.status === "PENDING").length;
  const totalRevenue = bookings
    .filter((b) => b.status === "CONFIRMED")
    .reduce((sum, b) => sum + b.bookingAmount, 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-semibold text-navy">Hotel Dashboard</h1>
        <p className="text-muted mt-1">Overview of your properties and recent activity.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          label="My Hotels"
          value={mounted ? hotels.length : "—"}
          change="Your properties"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatCard
          label="Confirmed"
          value={mounted ? confirmedBookings : "—"}
          change="Active bookings"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          trend="up"
        />
        <StatCard
          label="Revenue"
          value={mounted ? `$${totalRevenue.toLocaleString()}` : "—"}
          change="Total earned"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          trend="up"
        />
        <StatCard
          label="Pending"
          value={mounted ? pendingBookings : "—"}
          change="Needs attention"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          trend={pendingBookings > 0 ? "down" : "neutral"}
        />
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-2xl border border-border-light shadow-luxury overflow-hidden">
        <div className="px-6 py-5 border-b border-border-light">
          <h2 className="text-lg font-serif font-semibold text-navy">Recent Bookings</h2>
        </div>
        <div className="divide-y divide-border-light">
          {mounted && bookings.slice(0, 5).map((booking) => (
            <div key={booking.id} className="px-6 py-4 flex items-center justify-between hover:bg-cream-dark/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gold-light rounded-xl flex items-center justify-center">
                  <span className="text-sm font-semibold text-gold-dark">#{booking.id}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-navy">Booking #{booking.id}</p>
                  <p className="text-xs text-muted">{booking.totalGuests} guests · {new Date(booking.checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-navy">${booking.bookingAmount.toLocaleString()}</p>
                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md ${
                  booking.status === "CONFIRMED" ? "bg-success-light text-success" :
                  booking.status === "PENDING" ? "bg-warning-light text-warning" :
                  "bg-danger-light text-danger"
                }`}>
                  {booking.status}
                </span>
              </div>
            </div>
          ))}
          {(!mounted || bookings.length === 0) && (
            <div className="px-6 py-12 text-center">
              <p className="text-muted text-sm">No bookings yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
