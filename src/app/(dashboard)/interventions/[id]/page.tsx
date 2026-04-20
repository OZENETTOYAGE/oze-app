import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Intervention — OZÉ" };

const STATUT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  brouillon:  { bg: "bg-slate-100",  text: "text-slate-500",   label: "Brouillon"  },
  en_cours:   { bg: "bg-amber-50",   text: "text-amber-700",   label: "En cours"   },
  en_attente: { bg: "bg-blue-50",    text: "text-blue-700",    label: "En attente" },
  terminee:   { bg: "bg-emerald-50", text: "text-emerald-700", label: "Terminée"   },
  validee:    { bg: "bg-teal-50",    text: "text-teal-700",    label: "Validée"    },
  litige:     { bg: "bg-red-50",     text: "text-red-700",     label: "Litige"     },
};

type InterventionDetail = {
  id: string; statut: string; date_prevue: string;
  started_at: string | null; finished_at: string | null;
  commentaires: string | null; commentaire_fin: string | null;
  anomalies: string | null; signature_nom: string | null;
  chantier: { nom: string; reference: string; adresse: string | null; ville: string | null } | null;
  agent: { nom: string; prenom: string } | null;
};

type ChecklistRow = { id: string; item: string; valide: boolean; obligatoire: boolean };

export default async function InterventionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("interventions")
    .select("id, statut, date_prevue, started_at, finished_at, commentaires, commentaire_fin, anomalies, signature_nom, chantier:chantiers!chantier_id(nom, reference, adresse, ville), agent:profiles!user_id(nom, prenom)")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const intervention = data as unknown as InterventionDetail;

  const { data: checklistRaw } = await supabase
    .from("intervention_checklist")
    .select("id, item, valide, obligatoire")
    .eq("intervention_id", id)
    .order("ordre");
  const checklist = (checklistRaw ?? []) as ChecklistRow[];

  const sc = STATUT_STYLE[intervention.statut] ?? STATUT_STYLE.brouillon;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-start gap-4">
        <Link href="/interventions" className="mt-1 rounded-xl p-2 text-slate-400 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${sc.bg} ${sc.text}`}>{sc.label}</span>
            <span className="text-sm text-slate-400">{fmtDate(intervention.date_prevue)}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900" style={{ fontFamily: "Georgia,serif" }}>
            {intervention.chantier?.nom ?? "Intervention"}
          </h1>
          <p className="text-sm text-slate-400">
            {intervention.agent?.prenom} {intervention.agent?.nom}
            {intervention.chantier?.reference ? ` · ${intervention.chantier.reference}` : ""}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-700">Détails</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {intervention.started_at && (
              <div><p className="text-xs font-bold uppercase text-slate-400">Début</p><p className="font-semibold text-slate-700">{fmtDateTime(intervention.started_at)}</p></div>
            )}
            {intervention.finished_at && (
              <div><p className="text-xs font-bold uppercase text-slate-400">Fin</p><p className="font-semibold text-slate-700">{fmtDateTime(intervention.finished_at)}</p></div>
            )}
            {intervention.chantier?.adresse && (
              <div className="col-span-2"><p className="text-xs font-bold uppercase text-slate-400">Adresse</p><p className="font-semibold text-slate-700">{[intervention.chantier.adresse, intervention.chantier.ville].filter(Boolean).join(", ")}</p></div>
            )}
            {intervention.commentaires && (
              <div className="col-span-2"><p className="text-xs font-bold uppercase text-slate-400">Commentaires</p><p className="text-slate-600">{intervention.commentaires}</p></div>
            )}
            {intervention.commentaire_fin && (
              <div className="col-span-2"><p className="text-xs font-bold uppercase text-slate-400">Rapport de fin</p><p className="text-slate-600">{intervention.commentaire_fin}</p></div>
            )}
            {intervention.anomalies && (
              <div className="col-span-2 rounded-xl bg-red-50 p-3"><p className="text-xs font-bold uppercase text-red-500">Anomalies</p><p className="text-sm text-red-700">{intervention.anomalies}</p></div>
            )}
            {intervention.signature_nom && (
              <div className="col-span-2"><p className="text-xs font-bold uppercase text-slate-400">Signé par</p><p className="font-semibold text-slate-700">{intervention.signature_nom}</p></div>
            )}
          </div>
        </div>

        {checklist.length > 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 px-5 py-4">
              <h2 className="font-bold text-slate-700">
                Checklist — {checklist.filter((c) => c.valide).length}/{checklist.length}
              </h2>
            </div>
            <div className="divide-y divide-slate-50 p-2">
              {checklist.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                  {c.valide
                    ? <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                    : <XCircle className="h-4 w-4 shrink-0 text-slate-300" />
                  }
                  <span className={`text-sm ${c.valide ? "text-slate-700" : "text-slate-400"}`}>{c.item}</span>
                  {c.obligatoire && !c.valide && (
                    <span className="ml-auto rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">Obligatoire</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
