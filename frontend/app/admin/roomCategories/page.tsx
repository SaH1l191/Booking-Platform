"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRoomCategoriesStore, useHotelsStore } from "@/stores";
import type { RoomCategory, RoomType } from "@/stores/types";

const ROOM_TYPES: RoomType[] = ["SINGLE", "DOUBLE", "FAMILY", "DELUXE", "SUITE"];

export default function AdminRoomCategoriesPage() {
  const { roomCategories, isLoading, fetchRoomCategories, createRoomCategory, updateRoomCategory, deleteRoomCategory } = useRoomCategoriesStore();
  const { hotels, fetchHotels } = useHotelsStore();
  const [editing, setEditing] = useState<RoomCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ roomType: "SINGLE" as RoomType, price: 0, hotelId: 1, roomCount: 1 });

  useEffect(() => { fetchRoomCategories(); fetchHotels(); }, [fetchRoomCategories, fetchHotels]);

  const openCreate = () => { setEditing(null); setForm({ roomType: "SINGLE", price: 0, hotelId: hotels[0]?.id ?? 1, roomCount: 1 }); setShowForm(true); };
  const openEdit = (rc: RoomCategory) => { setEditing(rc); setForm({ roomType: rc.roomType, price: rc.price, hotelId: rc.hotelId, roomCount: rc.roomCount }); setShowForm(true); };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await updateRoomCategory(editing.id, form);
        toast.success("Room category updated");
      } else {
        await createRoomCategory(form);
        toast.success("Room category created");
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save room category");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this room category? Rooms using it may be affected.")) return;
    try {
      await deleteRoomCategory(id);
      toast.success("Room category deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete room category");
    }
  };

  const formatPrice = (p: number) => `$${p.toLocaleString()}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-navy">Room Categories</h1>
          <p className="text-muted mt-1">Manage room types, pricing, and inventory per hotel.</p>
        </div>
        <button onClick={openCreate} className="px-5 py-2.5 bg-navy text-white rounded-xl text-sm font-semibold hover:bg-navy-light transition-colors shadow-luxury">
          + Add Room Category
        </button>
      </div>

      {isLoading ? (
        <div className="text-muted">Loading...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-border-light shadow-luxury overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light bg-cream-dark/50">
                <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Room Type</th>
                <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Price</th>
                <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Hotel ID</th>
                <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Rooms</th>
                <th className="text-right px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {roomCategories.map((rc) => (
                <tr key={rc.id} className="hover:bg-cream-dark/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-navy">{rc.roomType}</td>
                  <td className="px-6 py-4 text-primary-soft">{formatPrice(rc.price)}</td>
                  <td className="px-6 py-4 text-primary-soft">#{rc.hotelId}</td>
                  <td className="px-6 py-4 text-primary-soft">{rc.roomCount}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(rc)} className="text-sm font-medium text-navy hover:underline mr-4">Edit</button>
                    <button onClick={() => handleDelete(rc.id)} className="text-sm font-medium text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-navy mb-4">{editing ? "Edit" : "Add"} Room Category</h2>
            <div className="space-y-3">
              <select className="w-full border border-border-light rounded-lg px-3 py-2" value={form.roomType}
                onChange={(e) => setForm({ ...form, roomType: e.target.value as RoomType })}>
                {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="w-full border border-border-light rounded-lg px-3 py-2" placeholder="Price" type="number" min={0}
                value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              <select className="w-full border border-border-light rounded-lg px-3 py-2" value={form.hotelId}
                onChange={(e) => setForm({ ...form, hotelId: Number(e.target.value) })}>
                {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <input className="w-full border border-border-light rounded-lg px-3 py-2" placeholder="Room count" type="number" min={1}
                value={form.roomCount} onChange={(e) => setForm({ ...form, roomCount: Number(e.target.value) })} />
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted">Cancel</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-navy text-white rounded-lg text-sm font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
