import type { BookingStatus } from "@/stores/types";

const FILTERS: (BookingStatus | "ALL")[] = ["ALL", "CONFIRMED", "PENDING", "CANCELLED", "EXPIRED"];

interface BookingFiltersProps {
  active: BookingStatus | "ALL";
  onChange: (status: BookingStatus | "ALL") => void;
}

export default function BookingFilters({ active, onChange }: BookingFiltersProps) {
  return (
    <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
      {FILTERS.map((status) => (
        <button
          key={status}
          onClick={() => onChange(status)}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            active === status
              ? "bg-navy text-white shadow-luxury"
              : "bg-white text-primary-soft border border-border-light hover:border-border"
          }`}
        >
          {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
        </button>
      ))}
    </div>
  );
}
