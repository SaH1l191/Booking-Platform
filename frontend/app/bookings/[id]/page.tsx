"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import AuthGuard from "../../../components/AuthGuard";
import { useBookingsStore, useHotelsStore, usePaymentStore, useAuthStore, openRazorpayCheckout } from "@/stores";
import { toast } from "sonner";

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = Number(params.id);
  const { bookings, fetchMyBookings, cancelBooking, isLoading } = useBookingsStore();
  const { hotels, fetchHotels, setLimit } = useHotelsStore();
  const { verifyPayment, getPaymentByBookingId, isLoading: paymentLoading } = usePaymentStore();
  const { user } = useAuthStore();

  useEffect(() => {
    setLimit(100);
    fetchMyBookings();
    fetchHotels();
  }, [setLimit, fetchMyBookings, fetchHotels]);

  const booking = bookings.find((b) => b.id === bookingId);
  const hotel = hotels.find((h) => h.id === booking?.hotelId);

  const statusConfig: Record<string, { label: string; color: string }> = {
    CONFIRMED: { label: "Confirmed", color: "bg-success-light text-success" },
    PENDING: { label: "Pending", color: "bg-warning-light text-warning" },
    CANCELLED: { label: "Cancelled", color: "bg-danger-light text-danger" },
    EXPIRED: { label: "Expired", color: "bg-warning-light text-warning" },
  };

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }

  const handlePayNow = async () => {
    if (!booking) return;
    try {
      const existingPayment = await getPaymentByBookingId(booking.id);
      if (!existingPayment?.razorpayOrderId || existingPayment.status !== "CREATED") {
        toast.error("No pending payment found for this booking.");
        return;
      }
      const paymentResponse = await openRazorpayCheckout({
        orderId: existingPayment.razorpayOrderId,
        amount: existingPayment.amount,
        keyId: existingPayment.keyId,
        bookingId: booking.id,
        userName: user?.username,
        userEmail: user?.email,
      });
      await verifyPayment({
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        bookingId: booking.id,
      });
      toast.success("Payment successful! Booking confirmed.");
      fetchMyBookings();
    } catch (err) {
      toast.error(err instanceof Error && err.message === "Payment cancelled" ? "Payment cancelled." : "Payment failed.");
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <Navbar />
        <main className="min-h-screen bg-cream flex items-center justify-center">
          <div className="animate-pulse text-muted">Loading...</div>
        </main>
        <Footer />
      </AuthGuard>
    );
  }

  if (!booking) {
    return (
      <AuthGuard>
        <Navbar />
        <main className="min-h-screen bg-cream flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-serif font-semibold text-navy mb-2">Booking not found</h1>
            <Link href="/bookings" className="text-sm text-navy underline hover:text-muted transition-colors">
              Back to my bookings
            </Link>
          </div>
        </main>
        <Footer />
      </AuthGuard>
    );
  }

  const config = statusConfig[booking.status] || { label: booking.status, color: "bg-cream-dark text-primary-soft" };
  const nights = Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24));
  const stayExpired = new Date(booking.checkOut) < new Date();

  return (
    <AuthGuard>
      <>
        <Navbar />
        <main className="min-h-screen bg-cream">
          <div className="max-w-3xl mx-auto px-6 md:px-10 py-12">
            <Link href="/bookings" className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy transition-colors mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to bookings
            </Link>

            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-serif font-semibold text-navy">Booking #{booking.id}</h1>
                <p className="text-muted mt-1">{formatDate(booking.createdAt)}</p>
              </div>
              <span className={`px-4 py-1.5 rounded-xl text-sm font-semibold ${config.color}`}>{config.label}</span>
            </div>

            <div className="bg-white rounded-2xl border border-border-light shadow-luxury overflow-hidden mb-6">
              {hotel && (
                <div className="h-48 overflow-hidden">
                  <img
                    src={hotel.images?.[0]?.url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=400&fit=crop"}
                    alt={hotel.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6 md:p-8 space-y-6">
                {hotel && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted mb-1">Hotel</p>
                    <Link href={`/hotels/${hotel.id}`} className="text-lg font-semibold text-navy hover:text-muted transition-colors">
                      {hotel.name}
                    </Link>
                    <p className="text-sm text-muted">{hotel.location}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted mb-1">Check-in</p>
                    <p className="font-medium text-navy">{formatDate(booking.checkIn)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted mb-1">Check-out</p>
                    <p className="font-medium text-navy">{formatDate(booking.checkOut)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted mb-1">Guests</p>
                    <p className="font-medium text-navy">{booking.totalGuests}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted mb-1">Amount</p>
                    <p className="font-medium text-navy">${booking.bookingAmount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-border-light">
                  <p className="text-sm text-muted">
                    {nights} night{nights !== 1 ? "s" : ""} &middot; ${Math.round(booking.bookingAmount / nights)}/night
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {booking.status === "PENDING" && (
                <button
                  onClick={handlePayNow}
                  disabled={paymentLoading}
                  className="px-6 py-3 bg-success text-white font-semibold rounded-xl hover:bg-success/90 transition-colors disabled:opacity-50 shadow-luxury"
                >
                  {paymentLoading ? "Processing..." : "Pay Now"}
                </button>
              )}
              {booking.status !== "CANCELLED" && booking.status !== "EXPIRED" && !stayExpired && (
                <button
                  onClick={() => { cancelBooking(booking.id); fetchMyBookings(); }}
                  className="px-6 py-3 border border-border text-primary-soft font-medium rounded-xl hover:bg-cream-dark transition-colors"
                >
                  Cancel booking
                </button>
              )}
              {hotel && (
                <Link
                  href={`/hotels/${hotel.id}`}
                  className="px-6 py-3 bg-navy text-white font-semibold rounded-xl hover:bg-navy-light transition-colors shadow-luxury"
                >
                  View hotel
                </Link>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </>
    </AuthGuard>
  );
}
