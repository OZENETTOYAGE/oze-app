import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { fmtDate, fmtEur } from "@/lib/utils";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Facture — OZÉ" };

const STATUT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  brouillon:           { bg: "bg-slate-100", text: "text-slate-500",   label: "Brouillon"  },
  émise:               { bg: "bg-blue-50",   text: "text-blue-700",    label: "Émise"      },
  envoyée:             { bg: "bg-indigo-50", text: "text-indigo-700",  label: "Envoyée"    },
  partiellement_payée: { bg: "bg-amber-50",  text: "text-amber-700",   label: "Partiel"    },
  payée:               { bg: "bg-emerald-50",text: "text-emerald-700", label: "Payée"      },
  en_retard:           { bg: "bg-red-50",    text: "text-red-700",     label: "En retard"  },
  relancée:            { bg: "bg-orange-50", text: "text-orange-700",  label: "Relancée"   },
  litige:              { bg: "bg-rose-50",   text: "text-rose-700",    label: "Litige"     },
  annulée:             { bg: "bg-slate-100", text: "text-slate-400",   label: "Annulée"    },
};

type FactureDetail = {
  id: string; numero: string; statut: string; objet: string;
  date_emission: string; date_echeance: string | null;
  total_ht: number; total_tva: number; total_ttc: number;
  montant_paye: number; solde: number; taux_penalite: number; penalites: number;
  conditions_paiement: string | null; iban: string | null; bic: string | null;
  ref_virement: string | null; notes_internes: string | null;
  client: { nom: string; entreprise: string | null; email: string | null; adresse: string | null; ville: string | null } | null;
  chantier: { nom: string; reference: string } | null;
};

type PaiementRow = { id: string; montant: number; mode: string; date_paiement: string; reference: string | null };

export default async function FactureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("factures")
    .select("id, numero, statut, objet, date_emission, date_echeance, total_ht, total_tva, total_ttc, montant_paye, solde, taux_penalite, penalites, conditions_paiement, iban, bic, ref_virement, notes_internes, client:clients!client_id(nom, entreprise, email, adresse, ville), chantier:chantiers!chantier_id(nom, reference)")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const facture = data as unknown as FactureDetail;

  const { data: paiementsRaw } = await supabase
    .from("paiements")
    .select("id, montant, mode, date_paiement, reference")
    .eq("facture_id", id)
    .order("date_paiement", { ascending: false });
  const paiements = (paiementsRaw ?? []) as PaiementRow[];

  const sc = STATUT_STYLE[facture.statut] ?? STATUT_STYLE.brouillon;
  const now = new Date().toISOString().slice(0, 10);
  const enRetard = facture.date_echeance && facture.date_echeance < now && !["payée", "annulée"].includes(facture.statut);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start gap-4">
        <Link href="/finance" className="mt-1 rounded-xl p-2 text-slate-400 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-black text-[#1A2B5F]">{facture.numero}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${sc.bg} ${sc.text}`}>{sc.label}</span>
            {enRetard && <AlertTriangle className="h-4 w-4 text-red-500" />}
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900" style={{ fontFamily: "Georgia,serif" }}>
            {facture.objet}
          </h1>
          <p className="text-sm text-slate-400">{facture.client?.nom}</p>
        </div>
      </div>

      {enRetard && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <p className="text-sm font-bold text-red-700">
            Facture en retard — échéance {fmtDate(facture.date_echeance)}
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {/* Montants */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Total HT</span><span className="font-semibold">{fmtEur(facture.total_ht)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">TVA</span><span className="font-semibold">{fmtEur(facture.total_tva)}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base"><span className="font-bold">Total TTC</span><span className="font-black text-[#1A2B5F]">{fmtEur(facture.total_ttc)}</span></div>
              {facture.montant_paye > 0 && (
                <div className="flex justify-between text-emerald-600"><span>Payé</span><span className="font-bold">- {fmtEur(facture.montant_paye)}</span></div>
              )}
              {facture.solde > 0 && (
                <div className="flex justify-between border-t border-slate-100 pt-2 text-base">
                  <span className="font-bold text-red-700">Solde restant</span>
                  <span className="font-black text-red-700">{fmtEur(facture.solde)}</span>
                </div>
              )}
            </div>

            {facture.iban && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-bold uppercase text-slate-400">Coordonnées bancaires</p>
                <p className="mt-1 font-mono text-sm text-slate-700">{facture.iban}</p>
                {facture.bic && <p className="font-mono text-sm text-slate-500">BIC : {facture.bic}</p>}
                {facture.ref_virement && <p className="text-sm text-slate-500">Réf : {facture.ref_virement}</p>}
              </div>
            )}
          </div>

          {/* Paiements */}
          {paiements.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-50 px-5 py-4">
                <h2 className="font-bold text-slate-700">Paiements reçus</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {paiements.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-700 capitalize">{p.mode}</p>
                      {p.reference && <p className="text-xs text-slate-400">Réf : {p.reference}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-700">{fmtEur(p.montant)}</p>
                      <p className="text-xs text-slate-400">{fmtDate(p.date_paiement)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-slate-700">Informations</h2>
            <div className="space-y-2 text-sm">
              <div><p className="text-xs font-bold uppercase text-slate-400">Émise le</p><p className="font-semibold text-slate-700">{fmtDate(facture.date_emission)}</p></div>
              {facture.date_echeance && <div><p className="text-xs font-bold uppercase text-slate-400">Échéance</p><p className={`font-semibold ${enRetard ? "text-red-700" : "text-slate-700"}`}>{fmtDate(facture.date_echeance)}</p></div>}
              {facture.conditions_paiement && <div><p className="text-xs font-bold uppercase text-slate-400">Conditions</p><p className="text-slate-600">{facture.conditions_paiement}</p></div>}
              {facture.chantier && <div><p className="text-xs font-bold uppercase text-slate-400">Chantier</p><p className="font-semibold text-slate-700">{facture.chantier.nom}</p></div>}
            </div>
          </div>
          {facture.client && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-bold text-slate-700">Client</h2>
              <p className="font-bold text-slate-800">{facture.client.nom}</p>
              {facture.client.entreprise && <p className="text-sm text-slate-400">{facture.client.entreprise}</p>}
              {facture.client.email && <p className="mt-1 text-sm text-slate-500">{facture.client.email}</p>}
            </div>
          )}
          {facture.notes_internes && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase text-amber-600">Notes internes</p>
              <p className="mt-1 text-sm text-amber-800">{facture.notes_internes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
