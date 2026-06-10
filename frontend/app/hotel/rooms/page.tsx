"use client";

import { useEffect } from "react";
import { useRoomsStore, useRoomCategoriesStore, useHotelsStore } from "@/stores";

const roomIcons: Record<string, string> = {
  SINGLE: "🛏️",
  DOUBLE: "🛏️🛏️",
  FAMILY: "👨‍👩‍👧‍👦",
  DELUXE: "⭐",
  SUITE: "👑",
};

export default function HotelRoomsPage() {
  const { rooms, isLoading: roomsLoading, fetchRoomsByHotel } = useRoomsStore();
  const { roomCategories, fetchRoomCategories } = useRoomCategoriesStore();
  const { hotels, fetchHotels } = useHotelsStore();

  useEffect(() => {
    fetchHotels();
    fetchRoomCategories();
  }, [fetchHotels, fetchRoomCategories]);

  const hotelId = hotels.length > 0 ? hotels[0].id : null;

  useEffect(() => {
    if (hotelId) {
      fetchRoomsByHotel(hotelId);
    }
  }, [hotelId, fetchRoomsByHotel]);

  const roomsByCategory = roomCategories.map((rc) => ({
    ...rc,
    totalRooms: rooms.filter((r) => r.roomCategoryId === rc.id).length,
    availableRooms: rooms.filter((r) => r.roomCategoryId === rc.id && !r.bookingId).length,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-navy">Rooms</h1>
          <p className="text-muted mt-1">Manage room types and availability.</p>
        </div>
        <button className="px-5 py-2.5 bg-navy text-white rounded-xl text-sm font-semibold hover:bg-navy-light transition-colors shadow-luxury">
          + Add Room Type
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {roomsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border-light p-6 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-border-light rounded-xl" />
                <div className="space-y-2">
                  <div className="h-4 bg-border-light rounded w-28" />
                  <div className="h-3 bg-border-light rounded w-20" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-3 bg-border-light rounded" />
                <div className="h-3 bg-border-light rounded w-3/4" />
              </div>
            </div>
          ))
        ) : roomsByCategory.length > 0 ? (
          roomsByCategory.map((rc) => (
            <div key={rc.id} className="bg-white rounded-2xl border border-border-light shadow-luxury p-6 hover:shadow-luxury-lg transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gold-light rounded-xl flex items-center justify-center">
                  <span className="text-2xl">{roomIcons[rc.roomType] || "🏠"}</span>
                </div>
                <div>
                  <h3 className="font-serif font-semibold text-navy text-lg">
                    {rc.roomType.charAt(0) + rc.roomType.slice(1).toLowerCase()}
                  </h3>
                  <p className="text-sm text-muted">${rc.price} /night</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted">Total Rooms</span>
                  <span className="font-semibold text-navy">{rc.totalRooms}</span>
                </div>
                <div className="w-full bg-cream-dark rounded-full h-2">
                  <div
                    className="bg-gold h-2 rounded-full transition-all"
                    style={{ width: `${rc.totalRooms > 0 ? (rc.availableRooms / rc.totalRooms) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted">Available</span>
                  <span className={`font-semibold ${rc.availableRooms > 0 ? "text-success" : "text-danger"}`}>
                    {rc.availableRooms} of {rc.totalRooms}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border-light flex gap-2">
                <button className="flex-1 px-3 py-2 text-xs font-medium text-navy bg-cream-dark rounded-lg hover:bg-border-light transition-colors">
                  Edit
                </button>
                <button className="flex-1 px-3 py-2 text-xs font-medium text-danger bg-danger-light rounded-lg hover:bg-danger/10 transition-colors">
                  Remove
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center">
            <div className="w-16 h-16 mx-auto bg-cream-dark rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-muted-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="font-serif font-medium text-navy text-lg">No room types</h3>
            <p className="text-sm text-muted mt-1">Add your first room type to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
