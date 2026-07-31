"use client";

import { useEffect, useState } from "react";
import { useRoomsStore, useRoomCategoriesStore, useHotelsStore } from "@/stores";
import type { CreateRoomCategoryPayload } from "@/stores/roomCategories";
import type { RoomCategory, RoomType } from "@/stores/types";
import { toast } from "sonner";

const roomIcons: Record<string, string> = {
  SINGLE: "\u{1F6F0}\uFE0F",
  DOUBLE: "\u{1F6F0}\uFE0F\u{1F6F0}\uFE0F",
  FAMILY: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}",
  DELUXE: "\u2B50",
  SUITE: "\u{1F451}",
};

const roomTypeOptions: RoomType[] = ["SINGLE", "DOUBLE", "FAMILY", "DELUXE", "SUITE"];

interface RoomCategoryModalProps {
  mode: "create" | "edit";
  category?: RoomCategory | null;
  hotelId: number;
  onClose: () => void;
}

function RoomCategoryModal({ mode, category, hotelId, onClose }: RoomCategoryModalProps) {
  const { createRoomCategory, updateRoomCategory } = useRoomCategoriesStore();
  const [roomType, setRoomType] = useState<RoomType>(category?.roomType || "SINGLE");
  const [price, setPrice] = useState(category?.price.toString() || "");
  const [roomCount, setRoomCount] = useState(category?.roomCount.toString() || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price || !roomCount) {
      toast.error("Please fill all fields");
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateRoomCategoryPayload = {
        roomType,
        price: Number(price),
        hotelId,
        roomCount: Number(roomCount),
      };
      if (mode === "create") {
        await createRoomCategory(payload);
        toast.success("Room type added");
      } else {
        await updateRoomCategory(category!.id, payload);
        toast.success("Room type updated");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-luxury-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-serif font-semibold text-navy mb-4">
          {mode === "create" ? "Add Room Type" : "Edit Room Type"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Room Type</label>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value as RoomType)}
              className="w-full px-4 py-2.5 bg-white border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            >
              {roomTypeOptions.map((t) => (
                <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Price per Night ($)</label>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="e.g. 200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Number of Rooms</label>
            <input
              type="number"
              min={1}
              value={roomCount}
              onChange={(e) => setRoomCount(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="e.g. 10"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-navy bg-cream-dark rounded-xl hover:bg-border-light transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-navy rounded-xl hover:bg-navy-light transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : mode === "create" ? "Add" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ category, onClose }: { category: RoomCategory; onClose: () => void }) {
  const { deleteRoomCategory } = useRoomCategoriesStore();
  const [submitting, setSubmitting] = useState(false);

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await deleteRoomCategory(category.id);
      toast.success("Room type removed");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-luxury-lg p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-serif font-semibold text-navy mb-2">Remove Room Type</h2>
        <p className="text-sm text-muted mb-6">
          Are you sure you want to remove <strong>{category.roomType}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-navy bg-cream-dark rounded-xl hover:bg-border-light transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-danger rounded-xl hover:bg-danger/80 transition-colors disabled:opacity-50"
          >
            {submitting ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HotelRoomsPage() {
  const { rooms, isLoading: roomsLoading, fetchRoomsByHotel } = useRoomsStore();
  const { roomCategories, fetchRoomCategories } = useRoomCategoriesStore();
  const { hotels, fetchHotels } = useHotelsStore();
  const [selectedHotelId, setSelectedHotelId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState<"create" | "edit" | null>(null);
  const [editingCategory, setEditingCategory] = useState<RoomCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<RoomCategory | null>(null);

  useEffect(() => {
    fetchHotels();
    fetchRoomCategories();
  }, [fetchHotels, fetchRoomCategories]);

  useEffect(() => {
    if (hotels.length > 0 && !selectedHotelId) {
      setSelectedHotelId(hotels[0].id);
    }
  }, [hotels, selectedHotelId]);

  useEffect(() => {
    if (selectedHotelId) {
      fetchRoomsByHotel(selectedHotelId);
    }
  }, [selectedHotelId, fetchRoomsByHotel]);

  const filteredCategories = roomCategories.filter((rc) => rc.hotelId === selectedHotelId);

  const roomsByCategory = filteredCategories.map((rc) => ({
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
        <div className="flex items-center gap-3">
          {hotels.length > 1 && (
            <select
              value={selectedHotelId || ''}
              onChange={(e) => setSelectedHotelId(Number(e.target.value))}
              className="px-4 py-2.5 bg-white border border-border-light rounded-xl text-sm font-medium text-navy focus:outline-none focus:ring-2 focus:ring-gold"
            >
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => { setEditingCategory(null); setShowModal("create"); }}
            className="px-5 py-2.5 bg-navy text-white rounded-xl text-sm font-semibold hover:bg-navy-light transition-colors shadow-luxury"
          >
            + Add Room Type
          </button>
        </div>
      </div>

      {showModal === "create" && selectedHotelId && (
        <RoomCategoryModal mode="create" hotelId={selectedHotelId} onClose={() => setShowModal(null)} />
      )}
      {showModal === "edit" && editingCategory && (
        <RoomCategoryModal mode="edit" category={editingCategory} hotelId={selectedHotelId!} onClose={() => { setShowModal(null); setEditingCategory(null); }} />
      )}
      {deletingCategory && (
        <DeleteConfirmModal category={deletingCategory} onClose={() => setDeletingCategory(null)} />
      )}

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
                  <span className="text-2xl">{roomIcons[rc.roomType] || "\u{1F3E0}"}</span>
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

              <div className="flex gap-2 mt-5 pt-4 border-t border-border-light">
                <button
                  onClick={() => { setEditingCategory(rc); setShowModal("edit"); }}
                  className="flex-1 px-3 py-2 text-xs font-medium text-navy bg-cream-dark rounded-lg hover:bg-border-light transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeletingCategory(rc)}
                  className="flex-1 px-3 py-2 text-xs font-medium text-danger bg-danger-light rounded-lg hover:bg-danger/10 transition-colors"
                >
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
