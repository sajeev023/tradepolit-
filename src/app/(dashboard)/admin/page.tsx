"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserMinus, UserCheck, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { toast } from "sonner";

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Fetch admin stats metrics
  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/metrics");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load admin stats");
      return body.data;
    },
  });

  // 2. Fetch users list
  const { data: users, isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["admin-users", searchQuery],
    queryFn: async () => {
      let url = "/api/v1/admin/users";
      if (searchQuery) url += `?q=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load users");
      return body.data;
    },
  });

  // 3. Toggle suspension mutation
  const toggleUserMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/v1/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to update user status");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("User active state modified");
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // 4. Fetch real database feature flags
  const { data: featureFlags, isLoading: flagsLoading } = useQuery<any[]>({
    queryKey: ["admin-feature-flags"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/feature-flags");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load feature flags");
      return body.data;
    },
  });

  // 5. Toggle feature flag mutation
  const toggleFlagMutation = useMutation({
    mutationFn: async ({ key, isActive }: { key: string; isActive: boolean }) => {
      const res = await fetch("/api/v1/admin/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, isActive }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to update feature flag");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feature-flags"] });
      toast.success("Feature flag state updated");
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <p className="tp-eyebrow mb-2">ADMIN · OPERATIONS</p>
        <h1 className="tp-display-sm flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
          Admin Operations Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Monitor user registrations, suspend accounts, audit API rates, and manage system parameters.
        </p>
      </div>

      {/* KPI Stats Panel */}
      {statsLoading ? (
        <div className="flex justify-center py-6">
          <RefreshCw className="animate-spin text-cyan-400" size={24} />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Accounts", value: stats.totalUsers, sub: "Registered users in system" },
            {
              label: "New This Week",
              value: (stats.signupTrend || []).reduce((sum: number, d: { count: number }) => sum + d.count, 0),
              sub: "Signups in last 7 days",
            },
          ].map((stat, idx) => (
            <div key={idx} className="card p-5">
              <span className="text-[10px] uppercase font-bold tracking-wider mb-1 block" style={{ color: "var(--color-text-tertiary)" }}>
                {stat.label}
              </span>
              <p className="text-2xl font-bold font-mono text-cyan-400">{stat.value}</p>
              <p className="text-[10px] mt-2" style={{ color: "var(--color-text-tertiary)" }}>
                {stat.sub}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Users table list */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
                Registered Accounts
              </h2>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search email, name..."
                className="px-3 py-1.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] outline-none text-xs text-white max-w-[200px]"
              />
            </div>

            {usersLoading ? (
              <div className="flex justify-center py-6">
                <RefreshCw className="animate-spin text-cyan-400" size={18} />
              </div>
            ) : !users || users.length === 0 ? (
              <div className="text-xs text-center py-10" style={{ color: "var(--color-text-tertiary)" }}>
                No accounts match query filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b uppercase font-semibold tracking-wider" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-tertiary)" }}>
                      <th className="pb-3">User</th>
                      <th className="pb-3">Role</th>
                      <th className="pb-3 text-center">Active</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-800/10">
                        <td className="py-3">
                          <div className="font-bold text-white">{u.displayName || "No Name"}</div>
                          <div style={{ color: "var(--color-text-tertiary)" }}>{u.email}</div>
                        </td>
                        <td className="py-3 font-mono font-semibold">{u.role}</td>
                        <td className="py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${u.isActive ? "bg-emerald-950/30 text-emerald-400 border border-emerald-500/20" : "bg-rose-950/30 text-rose-400 border border-rose-500/20"}`}>
                            {u.isActive ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => toggleUserMutation.mutate({ id: u.id, isActive: !u.isActive })}
                            disabled={toggleUserMutation.isPending}
                            className={`px-2 py-1 rounded text-[10px] font-semibold transition-all inline-flex items-center gap-1 ${u.isActive ? "text-rose-400 border border-rose-500/20 bg-rose-950/10" : "text-emerald-400 border border-emerald-500/20 bg-emerald-950/10"}`}
                          >
                            {u.isActive ? <UserMinus size={10} /> : <UserCheck size={10} />}
                            {u.isActive ? "Suspend" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Charts and flags */}
        <div className="lg:col-span-2 space-y-4">
          {/* Signup trend bar chart */}
          {stats?.signupTrend && (
            <div className="card p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--color-text-tertiary)" }}>
                Signups Trend (Daily)
              </h3>
              <div className="w-full h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.signupTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--color-text-tertiary)" fontSize={8} tickLine={false} />
                    <YAxis stroke="var(--color-text-tertiary)" fontSize={8} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-bg-secondary)",
                        borderColor: "var(--color-border-default)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                    <Bar dataKey="count" fill="var(--color-accent-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Feature flags manager */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
              System Feature Flags
            </h3>
            {flagsLoading ? (
              <div className="flex justify-center py-4">
                <RefreshCw className="animate-spin text-cyan-400" size={16} />
              </div>
            ) : featureFlags && featureFlags.length > 0 ? (
              featureFlags.map((flag) => (
                <div key={flag.id} className="flex items-center justify-between border-b pb-2 last:border-b-0" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <div>
                    <span className="text-xs font-bold text-white block">{flag.name}</span>
                    <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>{flag.description}</span>
                  </div>
                  <button
                    onClick={() => toggleFlagMutation.mutate({ key: flag.key, isActive: !flag.isActive })}
                    disabled={toggleFlagMutation.isPending}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer ${
                      flag.isActive
                        ? "bg-emerald-950/30 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-900/20"
                        : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                    }`}
                  >
                    {flag.isActive ? "Enabled" : "Disabled"}
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-rose-400">No feature flags registered.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
