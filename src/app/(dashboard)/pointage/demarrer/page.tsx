"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ChantierOption = { id: string; nom: string; reference: string };
type PointageActif = {
  id: string;
  heure_debut: string;
  chantier: { nom: string } | null;
};

function dureeLabel(debut: string): string {
  const diff = Math.floor((Date.now() - new Date(debut).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DemarrerPointagePage() {
  const router = useRouter();
  const [chantiers, setChantiers] = useState<ChantierOption[]>([]);
  const [actif, setActif] = useState<PointageActif | null | undefined>(undefined);
  const [chantier_id, setChantier_id] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    Promise.all([
      supabase.auth.getUser().then(({ data: { user } }) =>
        user
          ? supabase
              .from("pointages")
              .select("id, heure_debut, chantier:chantiers!chantier_id(nom)")
              .eq("user_id", user.id)
              .eq("statut", "en_cours")
              .maybeSingle()
          : { data: null }
      ),
      supabase
        .from("chantiers")
        .select("id, nom, reference")
        .eq("statut", "en_cours")
        .order("nom"),
    ]).then(([ptRes, chRes]) => {
      setActif((ptRes.data ?? null) as PointageActif | null);
      setChantiers((chRes.data ?? []) as ChantierOption[]);
    });

    intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleDemarrer = async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Non authentifié"); setLoading(false); return; }

    const { data, error: err } = await supabase
      .from("pointages")
      .insert({
        user_id: user.id,
        chantier_id: chantier_id || null,
        heure_debut: new Date().toISOString(),
        statut: "en_cours",
        type: "normal",
        anomalie: false,
        note: note || null,
      })
      .select("id, heure_debut, chantier:chantiers!chantier_id(nom)")
      .single();

    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      setActif(data as unknown as PointageActif);
      setLoading(false);
    }
  };

  const handleTerminer = async () => {
    if (!actif) return;
    setLoading(true);
    setError("");
    const supabase = createClient();
    const now = new Date();
    const duree = Math.floor((now.getTime() - new Date(actif.heure_debut).getTime()) / 60000);

    const { error: err } = await supabase
      .from("pointages")
      .update({
        heure_fin: now.toISOString(),
        duree_minutes: duree,
        statut: "terminé",
      })
      .eq("id", actif.id);

    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push("/pointage");
    }
  };

  if (actif === undefined) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A2B5F] border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/pointage" className="text-sm font-semibold text-slate-400 hover:text-slate-600">
          ← Pointage
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Terrain</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900" style={{ fontFamily: "Georgia,serif" }}>
            {actif ? "Pointage en cours" : "Démarrer un pointage"}
          </h1>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{error}</div>
      )}

      {actif ? (
        /* Pointage actif — afficher timer + bouton stop */
        <div className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-amber-50 px-5 py-3">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
            <span className="text-sm font-bold text-amber-800">En cours</span>
          </div>
          <div className="p-6 text-center">
            <p className="mb-1 text-2xl font-black text-[#1A2B5F]">
              {actif.chantier?.nom ?? "Sans chantier"}
            </p>
            <p className="text-4xl font-black tracking-widest text-amber-600 tabular-nums">
              {dureeLabel(actif.heure_debut)}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Démarré à {new Date(actif.heure_debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="border-t border-slate-100 p-5">
            <button
              onClick={handleTerminer}
              disabled={loading}
              className="w-full rounded-2xl py-4 text-base font-black transition-opacity disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "white" }}
            >
              {loading ? "Arrêt en cours…" : "■ Terminer le pointage"}
            </button>
          </div>
        </div>
      ) : (
        /* Pas de pointage — formulaire de démarrage */
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Chantier (optionnel)
                </label>
                <select
                  value={chantier_id}
                  onChange={(e) => setChantier_id(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
                >
                  <option value="">Sans chantier spécifique</option>
                  {chantiers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.reference} — {c.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Note (optionnel)
                </label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Précisions sur l'intervention…"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleDemarrer}
            disabled={loading}
            className="w-full rounded-2xl py-5 text-base font-black transition-opacity disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "white" }}
          >
            {loading ? "Démarrage…" : "▶ Pointer l'arrivée"}
          </button>
        </div>
      )}
    </div>
  );
}
