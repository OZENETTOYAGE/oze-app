"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { initiales } from "@/lib/utils";

type UserRole = "admin" | "manager" | "administratif" | "agent";

type Profile = {
  id: string;
  nom: string;
  prenom: string | null;
  email: string;
  role: UserRole;
  poste: string | null;
  tel: string | null;
  actif: boolean;
  taux_horaire: number | null;
};

const ROLE_CFG: Record<UserRole, { label: string; bg: string; text: string }> = {
  admin:         { label: "Admin",         bg: "bg-[#EEF1FA]", text: "text-[#1A2B5F]"   },
  manager:       { label: "Manager",       bg: "bg-purple-50", text: "text-purple-700"  },
  administratif: { label: "Administratif", bg: "bg-amber-50",  text: "text-amber-700"   },
  agent:         { label: "Agent",         bg: "bg-emerald-50",text: "text-emerald-700" },
};

const ROLES: UserRole[] = ["admin", "manager", "administratif", "agent"];

export default function UtilisateursPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
        .then(({ data: p }) => {
          if (p?.role !== "admin") { router.push("/dashboard"); return; }
          supabase
            .from("profiles")
            .select("id, nom, prenom, email, role, poste, tel, actif, taux_horaire")
            .order("nom")
            .then(({ data }) => {
              setProfiles((data ?? []) as Profile[]);
              setLoading(false);
            });
        });
    });
  }, [router]);

  const toggleActif = async (id: string, actif: boolean) => {
    setUpdating(id);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase
      .from("profiles")
      .update({ actif: !actif })
      .eq("id", id);
    if (err) {
      setError(err.message);
    } else {
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, actif: !actif } : p))
      );
    }
    setUpdating(null);
  };

  const changeRole = async (id: string, role: UserRole) => {
    setUpdating(id);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", id);
    if (err) {
      setError(err.message);
    } else {
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, role } : p))
      );
    }
    setUpdating(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A2B5F] border-t-transparent" />
      </div>
    );
  }

  const actifs = profiles.filter((p) => p.actif).length;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Administration</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900" style={{ fontFamily: "Georgia,serif" }}>
            Utilisateurs
          </h1>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-2xl font-black text-[#1A2B5F]">{actifs}</p>
          <p className="text-xs font-semibold text-slate-400">Actifs</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{error}</div>
      )}

      <div className="space-y-2">
        {profiles.map((p) => {
          const rc = ROLE_CFG[p.role];
          const fullName = `${p.prenom ?? ""} ${p.nom}`.trim();
          const isUpdating = updating === p.id;

          return (
            <div
              key={p.id}
              className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
              style={{ opacity: p.actif ? 1 : 0.65 }}
            >
              <div className="flex items-center gap-4 p-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black"
                  style={{ background: "#1A2B5F", color: "#F5C200" }}
                >
                  {initiales(fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">{fullName}</span>
                    {!p.actif && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-400">
                        Inactif
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-400">
                    {p.email}{p.poste ? ` · ${p.poste}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-slate-50 px-4 py-3">
                {/* Sélecteur de rôle */}
                <select
                  value={p.role}
                  onChange={(e) => changeRole(p.id, e.target.value as UserRole)}
                  disabled={isUpdating}
                  className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold focus:outline-none disabled:opacity-50 ${rc.bg} ${rc.text} border-transparent`}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_CFG[r].label}</option>
                  ))}
                </select>

                {/* Toggle actif */}
                <button
                  onClick={() => toggleActif(p.id, p.actif)}
                  disabled={isUpdating}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
                    p.actif
                      ? "bg-red-50 text-red-600 hover:bg-red-100"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {isUpdating ? "…" : p.actif ? "Désactiver" : "Activer"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
