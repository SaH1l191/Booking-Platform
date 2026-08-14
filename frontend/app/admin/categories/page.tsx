"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCategoriesStore } from "@/stores";
import type { Category } from "@/stores/types";

export default function AdminCategoriesPage() {
  const { categories, isLoading, fetchCategories, createCategory, updateCategory, deleteCategory } = useCategoriesStore();
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", icon: "" });

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openCreate = () => { setEditing(null); setForm({ name: "", slug: "", icon: "" }); setShowForm(true); };
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, slug: c.slug, icon: c.icon || "" }); setShowForm(true); };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await updateCategory(editing.id, form);
        toast.success("Category updated");
      } else {
        await createCategory(form);
        toast.success("Category created");
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save category");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this category? Hotels using it will lose the tag.")) return;
    try {
      await deleteCategory(id);
      toast.success("Category deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete category");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-navy">Categories</h1>
          <p className="text-muted mt-1">Manage hotel category tags (e.g. Beachfront, Business, Family).</p>
        </div>
        <button onClick={openCreate} className="px-5 py-2.5 bg-navy text-white rounded-xl text-sm font-semibold hover:bg-navy-light transition-colors shadow-luxury">
          + Add Category
        </button>
      </div>

      {isLoading ? (
        <div className="text-muted">Loading...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-border-light shadow-luxury overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light bg-cream-dark/50">
                <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Name</th>
                <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Slug</th>
                <th className="text-right px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-cream-dark/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-navy">{cat.name}</td>
                  <td className="px-6 py-4 text-primary-soft">{cat.slug}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(cat)} className="text-sm font-medium text-navy hover:underline mr-4">Edit</button>
                    <button onClick={() => handleDelete(cat.id)} className="text-sm font-medium text-red-600 hover:underline">Delete</button>
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
            <h2 className="text-lg font-semibold text-navy mb-4">{editing ? "Edit" : "Add"} Category</h2>
            <div className="space-y-3">
              <input className="w-full border border-border-light rounded-lg px-3 py-2" placeholder="Name"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="w-full border border-border-light rounded-lg px-3 py-2" placeholder="Slug (lowercase-hyphens)"
                value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              <input className="w-full border border-border-light rounded-lg px-3 py-2" placeholder="Icon (optional)"
                value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
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