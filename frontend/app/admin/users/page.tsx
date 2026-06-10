"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface UserData {
  id: number;
  username: string;
  email: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        const { data } = await api.get("/users");
        setUsers(Array.isArray(data) ? data : data.users || []);
      } catch {
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadUsers();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-semibold text-navy">Users</h1>
        <p className="text-muted mt-1">Manage platform users and their accounts.</p>
      </div>

      <div className="bg-white rounded-2xl border border-border-light shadow-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light bg-cream-dark/50">
                <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">User</th>
                <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Email</th>
                <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Joined</th>
                <th className="text-right px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-4 bg-border-light rounded w-32 animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-border-light rounded w-48 animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-border-light rounded w-24 animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-8 bg-border-light rounded w-16 ml-auto animate-pulse" /></td>
                  </tr>
                ))
              ) : users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-cream-dark/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-navy rounded-xl flex items-center justify-center">
                          <span className="text-xs font-semibold text-gold">{user.username?.charAt(0)?.toUpperCase() || "?"}</span>
                        </div>
                        <div>
                          <p className="font-medium text-navy">{user.username}</p>
                          <p className="text-xs text-muted">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-primary-soft">{user.email}</td>
                    <td className="px-6 py-4 text-muted">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="px-3 py-1.5 text-xs font-medium text-danger bg-danger-light rounded-lg hover:bg-danger/10 transition-colors">
                        Suspend
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-muted">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
