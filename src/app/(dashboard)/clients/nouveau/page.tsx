"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NouveauClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nom: "", entreprise: "", email: "", tel: "",
    adresse: "", ville: "", code_postal: "", notes: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const supabase = createClient();
    const { data, error: err } = await supabase.from("clients").insert({
      nom: form.nom,
      entreprise: form.entreprise || null,
      email: form.email || null,
      tel: form.tel || null,
      adresse: form.adresse || null,
      ville: form.ville || null,
      code_postal: form.code_postal || null,
      notes: form.notes || null,
      actif: true,
      created_by: null,
    }).select("id").single();
    if (err) { setError(err.message); setLoading(false); return; }
    router.push(`/clients/${(data as { id: string }).id}`);
  };

  const inputCls = "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1A2B5F] focus:outline-none";
  const labelCls = "mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500";

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/clients" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Nouveau</p>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Georgia,serif" }}>
            Ajouter un client
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

        <div>
          <label className={labelCls}>Nom *</label>
          <input name="nom" value={form.nom} onChange={handleChange} required className={inputCls} placeholder="Nom du contact" />
        </div>
        <div>
          <label className={labelCls}>Entreprise</label>
          <input name="entreprise" value={form.entreprise} onChange={handleChange} className={inputCls} placeholder="Raison sociale" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Email</label>
            <input name="email" value={form.email} onChange={handleChange} type="email" className={inputCls} placeholder="email@exemple.com" />
          </div>
          <div>
            <label className={labelCls}>Téléphone</label>
            <input name="tel" value={form.tel} onChange={handleChange} className={inputCls} placeholder="06 00 00 00 00" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Adresse</label>
          <input name="adresse" value={form.adresse} onChange={handleChange} className={inputCls} placeholder="123 rue de la Paix" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Ville</label>
            <input name="ville" value={form.ville} onChange={handleChange} className={inputCls} placeholder="Lyon" />
          </div>
          <div>
            <label className={labelCls}>Code postal</label>
            <input name="code_postal" value={form.code_postal} onChange={handleChange} className={inputCls} placeholder="69001" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className={inputCls} placeholder="Informations complémentaires…" />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/clients" className="flex-1 rounded-xl border border-slate-200 py-3 text-center text-sm font-bold text-slate-600 hover:bg-slate-50">
            Annuler
          </Link>
          <button type="submit" disabled={loading} className="flex-1 rounded-xl py-3 text-sm font-black disabled:opacity-60" style={{ background: "#1A2B5F", color: "#F5C200" }}>
            {loading ? "Création…" : "Créer le client"}
          </button>
        </div>
      </form>
    </div>
  );
}
