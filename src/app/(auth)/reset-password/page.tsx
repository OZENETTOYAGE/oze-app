"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg,#0a1228,#1A2B5F)" }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
            style={{ background: "#F5C200" }}
          >
            <span
              className="text-3xl font-black"
              style={{ fontFamily: "Georgia,serif", color: "#1A2B5F" }}
            >
              O
            </span>
          </div>
          <h1
            className="text-2xl font-black text-white"
            style={{ fontFamily: "Georgia,serif" }}
          >
            Nouveau mot de passe
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Choisissez un mot de passe sécurisé
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl bg-white shadow-xl"
        >
          <div className="space-y-4 p-6">
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              />
            </div>
          </div>
          <div className="border-t border-slate-100 p-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-black transition-opacity disabled:opacity-60"
              style={{ background: "#1A2B5F", color: "#F5C200" }}
            >
              {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
