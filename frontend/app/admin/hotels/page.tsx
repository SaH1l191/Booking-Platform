"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useHotelsStore } from "@/stores";
import api from "@/lib/api";

export default function AdminHotelsPage() {
  const router = useRouter();
  const { hotels, isLoading, fetchHotels, setLimit } = useHotelsStore();

  useEffect(() => {
    setLimit(100);
    fetchHotels();
  }, [setLimit, fetchHotels]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-navy">Hotels</h1>
          <p className="text-muted mt-1">Manage all hotel listings on the platform.</p>
        </div>
        <Link href="/admin/hotels/add" className="px-5 py-2.5 bg-navy text-white rounded-xl text-sm font-semibold hover:bg-navy-light transition-colors shadow-luxury inline-block">
          + Add Hotel
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border-light p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-border-light rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-border-light rounded w-48" />
                  <div className="h-3 bg-border-light rounded w-32" />
                </div>
                <div className="h-8 bg-border-light rounded-lg w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border-light shadow-luxury overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light bg-cream-dark/50">
                  <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Hotel</th>
                  <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Location</th>
                  <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Rating</th>
                  <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Rooms</th>
                  <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Categories</th>
                  <th className="text-right px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {hotels.map((hotel) => (
                  <tr key={hotel.id} className="hover:bg-cream-dark/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-border-light shrink-0">
                          <img
                            src={hotel.images?.[0]?.url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100&h=100&fit=crop"}
                            alt={hotel.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium text-navy">{hotel.name}</p>
                          <p className="text-xs text-muted">ID: {hotel.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-primary-soft">{hotel.location}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-gold" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span className="font-medium text-navy">{hotel.rating || "New"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-primary-soft">
                      {hotel.roomCategories?.length || 0} types
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {hotel.categories?.slice(0, 2).map((cat) => (
                          <span key={cat.id} className="px-2 py-0.5 bg-cream-dark rounded-md text-xs font-medium text-primary-soft">
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a href={`/hotels/${hotel.id}`} className="px-3 py-1.5 text-xs font-medium text-navy bg-cream-dark rounded-lg hover:bg-border-light transition-colors">
                          View
                        </a>
                        <Link href={`/admin/hotels/${hotel.id}/edit`} className="px-3 py-1.5 text-xs font-medium text-navy bg-cream-dark rounded-lg hover:bg-border-light transition-colors">
                          Edit
                        </Link>
                        <button
                          onClick={async () => {
                            if (!confirm("Delete this hotel permanently?")) return;
                            try {
                              await api.delete(`/api/v1/hotels/${hotel.id}`);
                              toast.success("Hotel deleted");
                              fetchHotels();
                            } catch {
                              toast.error("Failed to delete hotel");
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-danger bg-danger-light rounded-lg hover:bg-danger/10 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hotels.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-muted">No hotels found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
