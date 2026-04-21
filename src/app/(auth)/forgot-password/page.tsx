"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` }
    );
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      setSent(true);
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
            Mot de passe oublié
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Un lien de réinitialisation vous sera envoyé
          </p>
        </div>

        {sent ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <span className="text-2xl">✓</span>
            </div>
            <p className="font-bold text-slate-900">Email envoyé !</p>
            <p className="mt-1 text-sm text-slate-500">
              Vérifiez votre boîte mail et cliquez sur le lien.
            </p>
            <Link
              href="/login"
              className="mt-5 block text-sm font-bold text-[#1A2B5F] hover:underline"
            >
              ← Retour à la connexion
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div className="p-6">
              {error && (
                <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Adresse email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-3 border-t border-slate-100 p-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-black transition-opacity disabled:opacity-60"
                style={{ background: "#1A2B5F", color: "#F5C200" }}
              >
                {loading ? "Envoi en cours…" : "Envoyer le lien"}
              </button>
              <Link
                href="/login"
                className="block text-center text-sm font-semibold text-slate-400 hover:text-slate-600"
              >
                ← Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
