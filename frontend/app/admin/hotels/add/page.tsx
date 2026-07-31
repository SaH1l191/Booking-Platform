"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import api from "@/lib/api";

interface ImageEntry {
  url: string;
  altText: string;
  displayOrder: number;
}

export default function AddHotelPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", address: "", location: "", latitude: "", longitude: "",
    rating: "0", ratingCount: "0",
  });
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  function addImageUrl() {
    const url = newImageUrl.trim();
    if (!url) return;
    setImages((prev) => [...prev, { url, altText: "", displayOrder: prev.length }]);
    setNewImageUrl("");
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index).map((img, i) => ({ ...img, displayOrder: i })));
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newImages: ImageEntry[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newImages.push({ url: dataUrl, altText: file.name, displayOrder: images.length + newImages.length });
    }
    setImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.address || !form.location) {
      toast.error("Name, address, and location are required");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/v1/hotels/", {
        name: form.name,
        address: form.address,
        location: form.location,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        rating: parseFloat(form.rating) || 0,
        ratingCount: parseInt(form.ratingCount) || 0,
        images: images.length > 0 ? images.map((img) => ({ url: img.url, altText: img.altText || undefined, displayOrder: img.displayOrder })) : undefined,
      });
      toast.success("Hotel created");
      router.push("/admin/hotels");
    } catch {
      toast.error("Failed to create hotel");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Link href="/admin/hotels" className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy transition-colors mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to hotels
      </Link>

      <h1 className="text-3xl font-serif font-semibold text-navy mb-8">Add Hotel</h1>

      <form onSubmit={handleSubmit} className="max-w-xl bg-white rounded-2xl border border-border-light shadow-luxury p-8 space-y-5">
        <div>
          <label className="block text-sm font-medium text-navy mb-1">Name *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold bg-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">Address *</label>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold bg-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">Location *</label>
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold bg-white" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Latitude</label>
            <input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="40.7128" className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Longitude</label>
            <input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="-74.0060" className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold bg-white" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Rating</label>
            <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Rating count</label>
            <input type="number" min="0" value={form.ratingCount} onChange={(e) => setForm({ ...form, ratingCount: e.target.value })} className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold bg-white" />
          </div>
        </div>
        <div className="pt-4 border-t border-border-light">
          <label className="block text-sm font-medium text-navy mb-3">Images</label>

          <div className="flex items-center gap-2 mb-3">
            <input
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="Paste image URL..."
              className="flex-1 px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold bg-white"
            />
            <button type="button" onClick={addImageUrl} className="px-4 py-3 bg-navy text-white text-sm font-medium rounded-xl hover:bg-navy-light transition-colors shrink-0">
              Add
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-cream-dark file:text-navy hover:file:bg-border-light mb-3"
          />

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative group aspect-[4/3] rounded-xl overflow-hidden bg-cream-dark border border-border-light">
                  <img src={img.url} alt={img.altText || ""} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-danger text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button type="submit" disabled={saving} className="px-6 py-3 bg-navy text-white font-semibold rounded-xl hover:bg-navy-light transition-colors disabled:opacity-50 shadow-luxury">
            {saving ? "Saving..." : "Create Hotel"}
          </button>
          <Link href="/admin/hotels" className="px-6 py-3 border border-border text-primary-soft font-medium rounded-xl hover:bg-cream-dark transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
