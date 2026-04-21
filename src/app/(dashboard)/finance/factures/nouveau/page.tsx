"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { todayISO, addDays } from "@/lib/utils";

type ClientOption = { id: string; nom: string; entreprise: string | null };

export default function NouvelleFacturePage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    client_id: "",
    objet: "",
    date_emission: todayISO(),
    date_echeance: addDays(30),
    total_ht: "",
    taux_tva: "20",
    conditions_paiement: "Virement bancaire à 30 jours.",
    notes_internes: "",
    iban: "",
    bic: "",
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
  const tva = totalHT * (parseFloat(form.taux_tva) / 100);
  const ttc = totalHT + tva;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id) { setError("Veuillez sélectionner un client."); return; }
    if (!form.total_ht) { setError("Veuillez saisir un montant HT."); return; }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase.from("factures") as any)
      .insert({
        client_id: form.client_id,
        objet: form.objet,
        date_emission: form.date_emission,
        date_echeance: form.date_echeance || null,
        total_ht: totalHT,
        total_tva: tva,
        total_ttc: ttc,
        montant_paye: 0,
        solde: ttc,
        statut: "brouillon",
        taux_penalite: 0,
        penalites: 0,
        conditions_paiement: form.conditions_paiement || null,
        iban: form.iban || null,
        bic: form.bic || null,
        notes_internes: form.notes_internes || null,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push(`/finance/factures/${data.id}`);
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
            Nouvelle facture
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
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Date d'échéance</label>
                <input
                  type="date"
                  value={form.date_echeance}
                  onChange={(e) => set("date_echeance", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-semibold text-slate-700">Montants</h2>
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          {totalHT > 0 && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Total HT</span>
                <span>{totalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
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
          <h2 className="mb-5 font-semibold text-slate-700">Paiement</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Conditions de paiement</label>
              <textarea
                value={form.conditions_paiement}
                onChange={(e) => set("conditions_paiement", e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">IBAN</label>
                <input
                  value={form.iban}
                  onChange={(e) => set("iban", e.target.value)}
                  placeholder="FR76…"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">BIC</label>
                <input
                  value={form.bic}
                  onChange={(e) => set("bic", e.target.value)}
                  placeholder="BNPAFRPP"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
                />
              </div>
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
            {loading ? "Création…" : "Créer la facture"}
          </button>
        </div>
      </form>
    </div>
  );
}
