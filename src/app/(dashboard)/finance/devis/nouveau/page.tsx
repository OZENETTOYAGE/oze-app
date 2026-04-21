"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { todayISO, addDays } from "@/lib/utils";

type ClientOption = { id: string; nom: string; entreprise: string | null };

export default function NouveauDevisPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    client_id: "",
    objet: "",
    date_emission: todayISO(),
    date_validite: addDays(30),
    taux_tva: "20",
    remise_pct: "0",
    total_ht: "",
    introduction: "",
    conditions: "Paiement à 30 jours à compter de la date de facture.",
    notes_internes: "",
  });

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("clients")
      .select("id, nom, entreprise")
      .eq("actif", true)
      .order("nom")
      .then(({ data }) => setClients((data ?? []) as ClientOption[]));
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const totalHT = parseFloat(form.total_ht) || 0;
  const remisePct = parseFloat(form.remise_pct) || 0;
  const remiseMontant = totalHT * (remisePct / 100);
  const htApresRemise = totalHT - remiseMontant;
  const tva = htApresRemise * (parseFloat(form.taux_tva) / 100);
  const ttc = htApresRemise + tva;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id) { setError("Veuillez sélectionner un client."); return; }
    if (!form.total_ht) { setError("Veuillez saisir un montant HT."); return; }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase.from("devis") as any)
      .insert({
        client_id: form.client_id,
        objet: form.objet,
        date_emission: form.date_emission,
        date_validite: form.date_validite || null,
        taux_tva_defaut: parseFloat(form.taux_tva),
        remise_pct: remisePct,
        remise_montant: remiseMontant,
        total_ht: htApresRemise,
        total_tva: tva,
        total_ttc: ttc,
        statut: "brouillon",
        introduction: form.introduction || null,
        conditions: form.conditions || null,
        notes_internes: form.notes_internes || null,
        created_by: user?.id ?? null,
        redacteur_id: user?.id ?? null,
      })
      .select("id")
      .single();

    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push(`/finance/devis/${data.id}`);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/finance" className="text-sm font-semibold text-slate-400 hover:text-slate-600">
          ← Finance
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Commercial</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900" style={{ fontFamily: "Georgia,serif" }}>
            Nouveau devis
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{error}</div>
        )}

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-semibold text-slate-700">Informations générales</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Client *</label>
              <select
                value={form.client_id}
                onChange={(e) => set("client_id", e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              >
                <option value="">Sélectionner un client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}{c.entreprise ? ` — ${c.entreprise}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Objet *</label>
              <input
                value={form.objet}
                onChange={(e) => set("objet", e.target.value)}
                required
                placeholder="Prestation de nettoyage…"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Date d'émission</label>
                <input
                  type="date"
                  value={form.date_emission}
                  onChange={(e) => set("date_emission", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Date de validité</label>
                <input
                  type="date"
                  value={form.date_validite}
                  onChange={(e) => set("date_validite", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-semibold text-slate-700">Montants</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Total HT (€) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.total_ht}
                onChange={(e) => set("total_ht", e.target.value)}
                required
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">TVA (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.taux_tva}
                onChange={(e) => set("taux_tva", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Remise (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.remise_pct}
                onChange={(e) => set("remise_pct", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              />
            </div>
          </div>
          {totalHT > 0 && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Sous-total HT</span>
                <span>{htApresRemise.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>TVA ({form.taux_tva}%)</span>
                <span>{tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-black text-[#1A2B5F]">
                <span>Total TTC</span>
                <span>{ttc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-semibold text-slate-700">Textes</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Introduction</label>
              <textarea
                value={form.introduction}
                onChange={(e) => set("introduction", e.target.value)}
                rows={2}
                placeholder="Suite à notre entretien…"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Conditions</label>
              <textarea
                value={form.conditions}
                onChange={(e) => set("conditions", e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Notes internes</label>
              <textarea
                value={form.notes_internes}
                onChange={(e) => set("notes_internes", e.target.value)}
                rows={2}
                placeholder="Visible uniquement en interne…"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/finance"
            className="flex-1 rounded-2xl border border-slate-200 py-4 text-center text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-2xl py-4 text-sm font-black transition-opacity disabled:opacity-60"
            style={{ background: "#1A2B5F", color: "#F5C200" }}
          >
            {loading ? "Création…" : "Créer le devis"}
          </button>
        </div>
      </form>
    </div>
  );
}
