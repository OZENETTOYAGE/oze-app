import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { fmtDate, fmtEur } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Devis — OZÉ" };

const STATUT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  brouillon: { bg: "bg-slate-100", text: "text-slate-500",   label: "Brouillon" },
  envoyé:    { bg: "bg-blue-50",   text: "text-blue-700",    label: "Envoyé"    },
  accepté:   { bg: "bg-emerald-50",text: "text-emerald-700", label: "Accepté"   },
  refusé:    { bg: "bg-red-50",    text: "text-red-700",     label: "Refusé"    },
  expiré:    { bg: "bg-orange-50", text: "text-orange-700",  label: "Expiré"    },
  converti:  { bg: "bg-purple-50", text: "text-purple-700",  label: "Converti"  },
};

type DevisDetail = {
  id: string; numero: string; statut: string; objet: string;
  date_emission: string; date_validite: string | null;
  total_ht: number; total_tva: number; total_ttc: number;
  remise_pct: number; remise_montant: number; taux_tva_defaut: number;
  introduction: string | null; conditions: string | null; notes_internes: string | null;
  signe_le: string | null; signe_par: string | null;
  client: { nom: string; entreprise: string | null; email: string | null; adresse: string | null; ville: string | null } | null;
  chantier: { nom: string; reference: string } | null;
};

export default async function DevisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("devis")
    .select("id, numero, statut, objet, date_emission, date_validite, total_ht, total_tva, total_ttc, remise_pct, remise_montant, taux_tva_defaut, introduction, conditions, notes_internes, signe_le, signe_par, client:clients!client_id(nom, entreprise, email, adresse, ville), chantier:chantiers!chantier_id(nom, reference)")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const devis = data as unknown as DevisDetail;
  const sc = STATUT_STYLE[devis.statut] ?? STATUT_STYLE.brouillon;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start gap-4">
        <Link href="/finance" className="mt-1 rounded-xl p-2 text-slate-400 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-black text-[#1A2B5F]">{devis.numero}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${sc.bg} ${sc.text}`}>{sc.label}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900" style={{ fontFamily: "Georgia,serif" }}>
            {devis.objet}
          </h1>
          <p className="text-sm text-slate-400">{devis.client?.nom}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            {devis.introduction && <p className="mb-4 text-sm text-slate-600">{devis.introduction}</p>}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Sous-total HT</span>
                <span className="font-semibold">{fmtEur(devis.total_ht)}</span>
              </div>
              {devis.remise_montant > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Remise {devis.remise_pct > 0 ? `(${devis.remise_pct}%)` : ""}</span>
                  <span>- {fmtEur(devis.remise_montant)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">TVA {devis.taux_tva_defaut}%</span>
                <span className="font-semibold">{fmtEur(devis.total_tva)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base">
                <span className="font-bold">Total TTC</span>
                <span className="font-black text-[#1A2B5F]">{fmtEur(devis.total_ttc)}</span>
              </div>
            </div>
            {devis.conditions && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-bold uppercase text-slate-400">Conditions</p>
                <p className="mt-1 text-sm text-slate-600">{devis.conditions}</p>
              </div>
            )}
            {devis.signe_le && (
              <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3">
                <p className="text-sm font-bold text-emerald-700">
                  Signé le {fmtDate(devis.signe_le)}{devis.signe_par ? ` par ${devis.signe_par}` : ""}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-slate-700">Informations</h2>
            <div className="space-y-2 text-sm">
              <div><p className="text-xs font-bold uppercase text-slate-400">Émis le</p><p className="font-semibold text-slate-700">{fmtDate(devis.date_emission)}</p></div>
              {devis.date_validite && <div><p className="text-xs font-bold uppercase text-slate-400">Valide jusqu&apos;au</p><p className="font-semibold text-slate-700">{fmtDate(devis.date_validite)}</p></div>}
              {devis.chantier && <div><p className="text-xs font-bold uppercase text-slate-400">Chantier</p><p className="font-semibold text-slate-700">{devis.chantier.nom}</p></div>}
            </div>
          </div>
          {devis.client && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-bold text-slate-700">Client</h2>
              <p className="font-bold text-slate-800">{devis.client.nom}</p>
              {devis.client.entreprise && <p className="text-sm text-slate-400">{devis.client.entreprise}</p>}
              {devis.client.email && <p className="mt-1 text-sm text-slate-500">{devis.client.email}</p>}
            </div>
          )}
          {devis.notes_internes && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase text-amber-600">Notes internes</p>
              <p className="mt-1 text-sm text-amber-800">{devis.notes_internes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
