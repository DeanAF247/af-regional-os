"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0E1A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#7C3AED] flex items-center justify-center mb-4">
            <span className="text-white font-extrabold text-2xl">AF</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F1F5F9]">Regional OS</h1>
          <p className="text-[#64748B] text-sm mt-1">Anytime Fitness · Fitness Group Holdings</p>
        </div>

        {/* Card */}
        <div className="bg-[#131729] border border-[#252B45] rounded-2xl p-8">
          <h2 className="text-lg font-bold text-[#F1F5F9] mb-1">Sign in</h2>
          <p className="text-sm text-[#64748B] mb-6">Regional Office Access</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 bg-[#0B0E1A] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm placeholder-[#64748B] focus:outline-none focus:border-[#7C3AED] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-[#0B0E1A] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm placeholder-[#64748B] focus:outline-none focus:border-[#7C3AED] transition-colors"
              />
            </div>

            {error && (
              <div className="bg-[#7F1D1D]/40 border border-[#EF4444]/30 rounded-lg px-3.5 py-2.5 text-[#EF4444] text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-[#64748B] text-xs mt-6">
          Confidential · Regional Office use only
        </p>
      </div>
    </div>
  );
}
