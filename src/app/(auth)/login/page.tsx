"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (authError) {
      const msgs: Record<string, string> = {
        "Invalid login credentials": "Email ou mot de passe incorrect.",
        "Too many requests": "Trop de tentatives. Réessayez dans quelques minutes.",
      };
      setError(msgs[authError.message] ?? "Erreur de connexion.");
      setLoading(false); return;
    }
    const redirect = searchParams.get("redirect");
    router.push(redirect && redirect !== "/login" ? redirect : "/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: "#0a1228" }}>
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "#F5C200" }}>
            <span className="text-3xl font-black" style={{ fontFamily: "Georgia,serif", color: "#1A2B5F" }}>O</span>
          </div>
          <h1 className="text-3xl font-black" style={{ fontFamily: "Georgia,serif", color: "#F5C200" }}>OZÉ</h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/30">Nettoyage & Services</p>
        </div>

        <div className="rounded-2xl p-7" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="mb-1 text-xl font-bold text-white" style={{ fontFamily: "Georgia,serif" }}>Connexion</h2>
          <p className="mb-6 text-sm text-white/40">Accédez à votre espace de gestion</p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-white/40">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.fr" disabled={loading}
                className="w-full rounded-xl border px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.10)" }} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-white/40">Mot de passe</label>
              <div className="relative">
                <input type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" disabled={loading}
                  className="w-full rounded-xl border py-3 pl-4 pr-12 text-sm text-white placeholder:text-white/25 focus:outline-none disabled:opacity-50"
                  style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.10)" }} />
                <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border px-4 py-3" style={{ background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.2)" }}>
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-xs font-semibold text-red-300">{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading || !email || !password}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-50"
              style={{ background: "#F5C200", color: "#1A2B5F" }}>
              {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A2B5F] border-t-transparent" /> Connexion…</> : "Se connecter"}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-white/15">© {new Date().getFullYear()} OZÉ Nettoyage</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" style={{ background: "#0a1228" }}><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F5C200] border-t-transparent" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
