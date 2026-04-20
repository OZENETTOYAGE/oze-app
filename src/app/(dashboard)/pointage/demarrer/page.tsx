"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Play } from "lucide-react";
import Link from "next/link";

type ChantierOption = { id: string; nom: string; reference: string };

export default function DemarrerPointagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chantiers, setChantiers] = useState<ChantierOption[]>([]);
  const [chantierSelected, setChantierSelected] = useState("");
  const [hasActif, setHasActif] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("pointages").select("id").eq("user_id", user.id).eq("statut", "en_cours").maybeSingle()
        .then(({ data }) => { if (data) setHasActif(true); });
    });

    supabase.from("chantiers").select("id, nom, reference").order("nom")
      .then(({ data }) => setChantiers((data ?? []) as ChantierOption[]));
  }, []);

  const handleStart = async () => {
    setLoading(true); setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("taux_horaire")
      .eq("id", user.id)
      .single();

    const { error: err } = await supabase.from("pointages").insert({
      user_id: user.id,
      heure_debut: new Date().toISOString(),
      statut: "en_cours",
      type: "normal",
      chantier_id: chantierSelected || null,
      taux_horaire: profile?.taux_horaire ?? null,
      intervention_id: null,
      heure_fin: null,
      lat_debut: null,
      lng_debut: null,
      lat_fin: null,
      lng_fin: null,
      note: null,
      anomalie: false,
      valide_par: null,
      valide_at: null,
    });

    if (err) { setError(err.message); setLoading(false); return; }
    router.push("/pointage");
  };

  if (hasActif) {
    return (
      <div className="mx-auto max-w-md pt-16 text-center">
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-8">
          <p className="text-lg font-bold text-amber-800">Pointage déjà en cours</p>
          <p className="mt-2 text-sm text-amber-600">
            Vous avez déjà un pointage actif. Terminez-le avant d&apos;en démarrer un nouveau.
          </p>
          <Link href="/pointage" className="mt-4 inline-block rounded-xl px-6 py-3 text-sm font-bold" style={{ background: "#1A2B5F", color: "#F5C200" }}>
            Voir mon pointage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/pointage" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Pointage</p>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Georgia,serif" }}>
            Pointer l&apos;arrivée
          </h1>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

        <div className="mb-6">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Chantier (optionnel)
          </label>
          <select
            value={chantierSelected}
            onChange={(e) => setChantierSelected(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1A2B5F] focus:outline-none"
          >
            <option value="">Sans chantier spécifique</option>
            {chantiers.map((c) => (
              <option key={c.id} value={c.id}>{c.nom} — {c.reference}</option>
            ))}
          </select>
        </div>

        <div className="mb-6 rounded-xl bg-slate-50 px-4 py-3 text-center">
          <p className="text-xs text-slate-400">Heure de démarrage</p>
          <p className="text-2xl font-black text-slate-700">
            {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        <button
          onClick={handleStart}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-base font-black disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "white" }}
        >
          <Play className="h-5 w-5" />
          {loading ? "Démarrage…" : "Démarrer le pointage"}
        </button>
      </div>
    </div>
  );
}
