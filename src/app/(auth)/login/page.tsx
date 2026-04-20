"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Metadata } from "next";

// Note: metadata export doesn't work in client components
// Use a parent server component or metadata in layout if needed

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    const redirect = searchParams.get("redirect");
    router.push(redirect && redirect !== "/login" ? redirect : "/dashboard");
    router.refresh();
  };

  const errorParam = searchParams.get("error");

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg,#0a1228,#1A2B5F)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
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
            OZÉ Nettoyage
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Connectez-vous à votre espace
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl bg-white shadow-xl"
        >
          <div className="p-6">
            {(error || errorParam) && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error ||
                  (errorParam === "compte-desactive"
                    ? "Votre compte est désactivé."
                    : "Une erreur est survenue.")}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Email
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

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 p-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-black transition-opacity disabled:opacity-60"
              style={{ background: "#1A2B5F", color: "#F5C200" }}
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
