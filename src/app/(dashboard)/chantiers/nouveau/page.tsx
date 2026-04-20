"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ChantierStatut } from "@/types/database.types";

type ClientOption = { id: string; nom: string; entreprise: string | null };
type ProfileOption = { id: string; nom: string; prenom: string };

export default function NouveauChantierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [managers, setManagers] = useState<ProfileOption[]>([]);

  const [form, setForm] = useState({
    nom: "", client_id: "", manager_id: "", type: "Nettoyage",
    statut: "planifié" as ChantierStatut,
    adresse: "", ville: "", code_postal: "",
    prix_ht: "", taux_tva: "20", frequence: "ponctuel",
    date_debut: "", date_fin: "", budget_heures: "", notes: "",
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.from("clients").select("id, nom, entreprise").eq("actif", true).order("nom")
      .then(({ data }) => setClients((data ?? []) as ClientOption[]));
    supabase.from("profiles").select("id, nom, prenom").in("role", ["admin", "manager"]).eq("actif", true).order("nom")
      .then(({ data }) => setManagers((data ?? []) as ProfileOption[]));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id) { setError("Veuillez sélectionner un client."); return; }
    setLoading(true); setError("");

    const supabase = createClient();
    const { data, error: err } = await supabase.from("chantiers").insert({
      nom: form.nom,
      client_id: form.client_id,
      manager_id: form.manager_id || null,
      type: form.type,
      statut: form.statut,
      adresse: form.adresse || null,
      ville: form.ville || null,
      code_postal: form.code_postal || null,
      acces_notes: null,
      surface: null,
      prix_ht: form.prix_ht ? parseFloat(form.prix_ht) : null,
      taux_tva: parseFloat(form.taux_tva),
      frequence: form.frequence,
      date_debut: form.date_debut || null,
      date_fin: form.date_fin || null,
      budget_heures: form.budget_heures ? parseFloat(form.budget_heures) : null,
      priorite: 1,
      notes: form.notes || null,
      description: null,
      created_by: null,
    }).select("id").single();

    if (err) { setError(err.message); setLoading(false); return; }
    router.push(`/chantiers/${(data as { id: string }).id}`);
  };

  const inputCls = "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1A2B5F] focus:outline-none";
  const labelCls = "mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/chantiers" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Nouveau</p>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Georgia,serif" }}>
            Créer un chantier
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

        <div>
          <label className={labelCls}>Nom du chantier *</label>
          <input name="nom" value={form.nom} onChange={handleChange} required className={inputCls} placeholder="Ex: Nettoyage bureaux Lyon 2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Client *</label>
            <select name="client_id" value={form.client_id} onChange={handleChange} required className={inputCls}>
              <option value="">Sélectionner…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}{c.entreprise ? ` — ${c.entreprise}` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Responsable</label>
            <select name="manager_id" value={form.manager_id} onChange={handleChange} className={inputCls}>
              <option value="">Aucun</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Type</label>
            <select name="type" value={form.type} onChange={handleChange} className={inputCls}>
              <option>Nettoyage</option>
              <option>Vitrerie</option>
              <option>Remise en état</option>
              <option>Désinfection</option>
              <option>Espaces verts</option>
              <option>Autre</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Statut</label>
            <select name="statut" value={form.statut} onChange={handleChange} className={inputCls}>
              <option value="planifié">Planifié</option>
              <option value="en_cours">En cours</option>
              <option value="suspendu">Suspendu</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Adresse</label>
            <input name="adresse" value={form.adresse} onChange={handleChange} className={inputCls} placeholder="123 rue de la Paix" />
          </div>
          <div>
            <label className={labelCls}>Code postal</label>
            <input name="code_postal" value={form.code_postal} onChange={handleChange} className={inputCls} placeholder="69001" />
          </div>
        </div>

        <div>
          <label className={labelCls}>Ville</label>
          <input name="ville" value={form.ville} onChange={handleChange} className={inputCls} placeholder="Lyon" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Prix HT (€)</label>
            <input name="prix_ht" value={form.prix_ht} onChange={handleChange} type="number" step="0.01" className={inputCls} placeholder="0.00" />
          </div>
          <div>
            <label className={labelCls}>TVA (%)</label>
            <select name="taux_tva" value={form.taux_tva} onChange={handleChange} className={inputCls}>
              <option value="0">0%</option>
              <option value="5.5">5.5%</option>
              <option value="10">10%</option>
              <option value="20">20%</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Budget heures</label>
            <input name="budget_heures" value={form.budget_heures} onChange={handleChange} type="number" step="0.5" className={inputCls} placeholder="0" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Date début</label>
            <input name="date_debut" value={form.date_debut} onChange={handleChange} type="date" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Date fin</label>
            <input name="date_fin" value={form.date_fin} onChange={handleChange} type="date" className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Fréquence</label>
          <select name="frequence" value={form.frequence} onChange={handleChange} className={inputCls}>
            <option value="ponctuel">Ponctuel</option>
            <option value="quotidien">Quotidien</option>
            <option value="hebdomadaire">Hebdomadaire</option>
            <option value="bimensuel">Bimensuel</option>
            <option value="mensuel">Mensuel</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className={inputCls} placeholder="Informations complémentaires…" />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/chantiers" className="flex-1 rounded-xl border border-slate-200 py-3 text-center text-sm font-bold text-slate-600 hover:bg-slate-50">
            Annuler
          </Link>
          <button type="submit" disabled={loading} className="flex-1 rounded-xl py-3 text-sm font-black disabled:opacity-60" style={{ background: "#1A2B5F", color: "#F5C200" }}>
            {loading ? "Création…" : "Créer le chantier"}
          </button>
        </div>
      </form>
    </div>
  );
}
