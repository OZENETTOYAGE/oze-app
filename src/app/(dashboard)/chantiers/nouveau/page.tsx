"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Metadata } from "next";

type ClientOption = { id: string; nom: string; entreprise: string | null };

const TYPES = [
  "Nettoyage de locaux",
  "Nettoyage industriel",
  "Nettoyage de vitres",
  "Remise en état",
  "Entretien espaces verts",
  "Désinfection",
  "Autre",
];

const FREQUENCES = [
  { value: "unique", label: "Unique" },
  { value: "quotidien", label: "Quotidien" },
  { value: "hebdomadaire", label: "Hebdomadaire" },
  { value: "bi-hebdomadaire", label: "Bi-hebdomadaire" },
  { value: "mensuel", label: "Mensuel" },
  { value: "trimestriel", label: "Trimestriel" },
  { value: "semestriel", label: "Semestriel" },
  { value: "annuel", label: "Annuel" },
];

export default function NouveauChantierPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nom: "",
    client_id: "",
    type: TYPES[0],
    frequence: "unique",
    adresse: "",
    ville: "",
    code_postal: "",
    prix_ht: "",
    taux_tva: "20",
    date_debut: "",
    date_fin: "",
    budget_heures: "",
    description: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id) { setError("Veuillez sélectionner un client."); return; }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error: err } = await supabase
      .from("chantiers")
      .insert({
        nom: form.nom,
        client_id: form.client_id,
        type: form.type,
        frequence: form.frequence,
        statut: "planifié",
        adresse: form.adresse || null,
        ville: form.ville || null,
        code_postal: form.code_postal || null,
        prix_ht: form.prix_ht ? parseFloat(form.prix_ht) : null,
        taux_tva: parseFloat(form.taux_tva),
        date_debut: form.date_debut || null,
        date_fin: form.date_fin || null,
        budget_heures: form.budget_heures ? parseFloat(form.budget_heures) : null,
        description: form.description || null,
        priorite: 1,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push(`/chantiers/${data.id}`);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/chantiers" className="text-sm font-semibold text-slate-400 hover:text-slate-600">
          ← Chantiers
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Opérations</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900" style={{ fontFamily: "Georgia,serif" }}>
            Nouveau chantier
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{error}</div>
        )}

        {/* Infos principales */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-semibold text-slate-700">Informations générales</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Nom du chantier *
              </label>
              <input
                value={form.nom}
                onChange={(e) => set("nom", e.target.value)}
                required
                placeholder="Ex: Nettoyage bureaux ACME"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Client *
              </label>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Type de prestation
                </label>
                <select
                  value={form.type}
                  onChange={(e) => set("type", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
                >
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Fréquence
                </label>
                <select
                  value={form.frequence}
                  onChange={(e) => set("frequence", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
                >
                  {FREQUENCES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Notes, instructions particulières…"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Localisation */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-semibold text-slate-700">Localisation</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Adresse</label>
              <input
                value={form.adresse}
                onChange={(e) => set("adresse", e.target.value)}
                placeholder="123 rue de la Paix"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Ville</label>
                <input
                  value={form.ville}
                  onChange={(e) => set("ville", e.target.value)}
                  placeholder="Paris"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Code postal</label>
                <input
                  value={form.code_postal}
                  onChange={(e) => set("code_postal", e.target.value)}
                  placeholder="75001"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Financier */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-semibold text-slate-700">Financier & Planning</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Prix HT (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.prix_ht}
                onChange={(e) => set("prix_ht", e.target.value)}
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
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Date de début</label>
              <input
                type="date"
                value={form.date_debut}
                onChange={(e) => set("date_debut", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Date de fin</label>
              <input
                type="date"
                value={form.date_fin}
                onChange={(e) => set("date_fin", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Budget heures</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.budget_heures}
                onChange={(e) => set("budget_heures", e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/chantiers"
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
            {loading ? "Création…" : "Créer le chantier"}
          </button>
        </div>
      </form>
    </div>
  );
}
