"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NouveauClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nom: "",
    entreprise: "",
    email: "",
    tel: "",
    adresse: "",
    ville: "",
    code_postal: "",
    notes: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error: err } = await supabase
      .from("clients")
      .insert({
        nom: form.nom,
        entreprise: form.entreprise || null,
        email: form.email || null,
        tel: form.tel || null,
        adresse: form.adresse || null,
        ville: form.ville || null,
        code_postal: form.code_postal || null,
        notes: form.notes || null,
        actif: true,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push(`/clients/${data.id}`);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/clients" className="text-sm font-semibold text-slate-400 hover:text-slate-600">
          ← Clients
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Portefeuille</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900" style={{ fontFamily: "Georgia,serif" }}>
            Nouveau client
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{error}</div>
        )}

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-semibold text-slate-700">Identité</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Nom du contact *
              </label>
              <input
                value={form.nom}
                onChange={(e) => set("nom", e.target.value)}
                required
                placeholder="Jean Dupont"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Entreprise / Société
              </label>
              <input
                value={form.entreprise}
                onChange={(e) => set("entreprise", e.target.value)}
                placeholder="ACME Corp"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-semibold text-slate-700">Coordonnées</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="jean@acme.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Téléphone</label>
                <input
                  type="tel"
                  value={form.tel}
                  onChange={(e) => set("tel", e.target.value)}
                  placeholder="06 00 00 00 00"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
                />
              </div>
            </div>
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

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-700">Notes internes</h2>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            placeholder="Informations complémentaires, préférences…"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#1A2B5F] focus:outline-none"
          />
        </div>

        <div className="flex gap-3">
          <Link
            href="/clients"
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
            {loading ? "Création…" : "Créer le client"}
          </button>
        </div>
      </form>
    </div>
  );
}
