import Link from "next/link";
import type { Booking } from "@/stores/types";

const fallbackImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop";

const statusConfig: Record<string, { label: string; color: string }> = {
  CONFIRMED: { label: "Confirmed", color: "bg-success-light text-success" },
  PENDING: { label: "Pending", color: "bg-warning-light text-warning" },
  CANCELLED: { label: "Cancelled", color: "bg-danger-light text-danger" },
  EXPIRED: { label: "Expired", color: "bg-muted text-muted-foreground" },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function calculateNights(checkIn: string, checkOut: string) {
  return Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
}

function isBookingExpired(checkOut: string) {
  return new Date(checkOut) < new Date();
}

interface BookingCardProps {
  booking: Booking;
  hotelName: string;
  onPayNow: (booking: { id: number; bookingAmount: number }) => void;
  onCancel: (id: number) => void;
  onLeaveReview: (bookingId: number, hotelId: number) => void;
  paymentLoading: boolean;
}

export default function BookingCard({ booking, hotelName, onPayNow, onCancel, onLeaveReview, paymentLoading }: BookingCardProps) {
  const config = statusConfig[booking.status];
  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const stayExpired = isBookingExpired(booking.checkOut);

  return (
    <div className="bg-white border border-border-light rounded-2xl overflow-hidden hover:shadow-luxury-lg transition-all">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-48 h-40 sm:h-auto overflow-hidden">
          <img src={fallbackImage} alt="Hotel" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-4">
            <div>
              <h3 className="font-serif font-semibold text-navy">Booking #{booking.id}</h3>
              <p className="text-sm text-muted">{hotelName}</p>
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
                  onClick={() => onPayNow(booking)}
                  disabled={paymentLoading}
                  className="px-4 py-2 bg-success text-white text-sm font-medium rounded-xl hover:bg-success/90 transition-colors disabled:opacity-50"
                >
                  {paymentLoading ? "Processing..." : "Pay Now"}
                </button>
              )}
              {booking.status === "CONFIRMED" && stayExpired && (
                <button
                  onClick={() => onLeaveReview(booking.id, booking.hotelId)}
                  className="px-4 py-2 bg-gold text-white text-sm font-medium rounded-xl hover:bg-gold/90 transition-colors"
                >
                  Leave Review
                </button>
              )}
              {booking.status !== "CANCELLED" && booking.status !== "EXPIRED" && !stayExpired && (
                <button
                  onClick={() => onCancel(booking.id)}
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
}
