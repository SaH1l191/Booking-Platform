import Link from "next/link";

interface EmptyBookingsProps {
  filterStatus: string;
}

export default function EmptyBookings({ filterStatus }: EmptyBookingsProps) {
  return (
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
  );
}
