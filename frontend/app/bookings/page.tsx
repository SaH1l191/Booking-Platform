"use client";

import { useEffect, useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AuthGuard from "../../components/AuthGuard";
import { useBookingsStore, usePaymentStore, openRazorpayCheckout, useAuthStore, useHotelsStore } from "@/stores";
import { toast } from "sonner";
import BookingCard from "./components/BookingCard";
import BookingFilters from "./components/BookingFilters";
import BookingSkeleton from "./components/BookingSkeleton";
import ReviewModal from "./components/ReviewModal";
import EmptyBookings from "./components/EmptyBookings";
import { useBookingSSE } from "../../hooks/useBookingSSE";

export default function BookingsPage() {
  const {
    bookings,
    filterStatus,
    isLoading,
    error,
    fetchMyBookings,
    cancelBooking,
    setFilterStatus,
  } = useBookingsStore();

  const { verifyPayment, getPaymentByBookingId, isLoading: paymentLoading } = usePaymentStore();
  const { user } = useAuthStore();
  const { hotels, fetchHotels, setLimit } = useHotelsStore();
  useBookingSSE();

  const [reviewTarget, setReviewTarget] = useState<{ bookingId: number; hotelId: number } | null>(null);

  useEffect(() => {
    setLimit(100);
    fetchMyBookings();
    fetchHotels();
  }, [setLimit, fetchMyBookings, fetchHotels]);

  const hotelMap = useMemo(() => {
    const map: Record<number, (typeof hotels)[number]> = {};
    hotels.forEach((h) => { map[h.id] = h; });
    return map;
  }, [hotels]);

  const filtered = useMemo(
    () => bookings.filter((b) => filterStatus === "ALL" || b.status === filterStatus),
    [bookings, filterStatus]
  );

  const handlePayNow = async (booking: { id: number; bookingAmount: number }) => {
    try {
      const existingPayment = await getPaymentByBookingId(booking.id);
      if (!existingPayment || !existingPayment.razorpayOrderId || existingPayment.status !== "CREATED") {
        toast.error("No pending payment found for this booking. Please try again.");
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
      if (err instanceof Error && err.message === "Payment cancelled") {
        toast.error("Payment was cancelled.");
      } else {
        toast.error("Payment failed. Please try again.");
      }
    }
  };

  return (
    <AuthGuard>
      <>
        <Navbar />
        <main className="min-h-screen bg-cream">
          <div className="bg-navy">
            <div className="max-w-5xl mx-auto px-6 md:px-10 py-12 md:py-16">
              <h1 className="text-4xl font-serif font-semibold text-white">My bookings</h1>
              <p className="mt-2 text-white/60">
                {isLoading ? "Loading..." : `${bookings.length} reservations`}
              </p>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-6 md:px-10 py-8">
            <BookingFilters active={filterStatus} onChange={setFilterStatus} />

            {error && (
              <div className="p-4 bg-danger-light border border-danger/20 rounded-xl text-sm text-danger mb-4">
                {error}
              </div>
            )}

            {isLoading && <BookingSkeleton />}

            {!isLoading && filtered.length > 0 && (
              <div className="space-y-4">
                {filtered.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    hotelName={hotelMap[booking.hotelId]?.name || `Hotel #${booking.hotelId}`}
                    hotelImage={hotelMap[booking.hotelId]?.images?.[0]?.url}
                    onPayNow={handlePayNow}
                    onCancel={cancelBooking}
                    onLeaveReview={(bookingId, hotelId) => setReviewTarget({ bookingId, hotelId })}
                    paymentLoading={paymentLoading}
                  />
                ))}
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <EmptyBookings filterStatus={filterStatus} />
            )}
          </div>
        </main>

        {reviewTarget && (
          <ReviewModal
            bookingId={reviewTarget.bookingId}
            hotelId={reviewTarget.hotelId}
            onClose={() => setReviewTarget(null)}
          />
        )}

        <Footer />
      </>
    </AuthGuard>
  );
}
