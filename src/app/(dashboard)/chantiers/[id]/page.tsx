import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { fmtDate, fmtEurSans, fmtDuree } from "@/lib/utils";
import { ArrowLeft, MapPin, Calendar, Clock, Users, Euro } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Chantier — OZÉ" };

const STATUT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  planifie:  { bg: "bg-blue-50",    text: "text-blue-700",    label: "Planifié"  },
  en_cours:  { bg: "bg-amber-50",   text: "text-amber-700",   label: "En cours"  },
  termine:   { bg: "bg-slate-100",  text: "text-slate-500",   label: "Terminé"   },
  suspendu:  { bg: "bg-orange-50",  text: "text-orange-700",  label: "Suspendu"  },
  litige:    { bg: "bg-red-50",     text: "text-red-700",     label: "Litige"    },
  planifié:  { bg: "bg-blue-50",    text: "text-blue-700",    label: "Planifié"  },
  terminé:   { bg: "bg-slate-100",  text: "text-slate-500",   label: "Terminé"   },
};

type ChantierDetail = {
  id: string;
  nom: string;
  reference: string;
  statut: string;
  type: string;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  prix_ht: number | null;
  taux_tva: number;
  frequence: string;
  date_debut: string | null;
  date_fin: string | null;
  budget_heures: number | null;
  notes: string | null;
  client: { nom: string; entreprise: string | null; email: string | null; tel: string | null } | null;
  manager: { nom: string; prenom: string } | null;
};

type AssignmentRow = {
  id: string;
  role: string;
  agent: { nom: string; prenom: string } | null;
};

type PointageRow = {
  id: string;
  heure_debut: string;
  heure_fin: string | null;
  duree_minutes: number | null;
  statut: string;
  agent: { nom: string; prenom: string } | null;
};

export default async function ChantierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("chantiers")
    .select("id, nom, reference, statut, type, adresse, ville, code_postal, prix_ht, taux_tva, frequence, date_debut, date_fin, budget_heures, notes, client:clients!client_id(nom, entreprise, email, tel), manager:profiles!manager_id(nom, prenom)")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const chantier = data as unknown as ChantierDetail;

  const { data: assignmentsRaw } = await supabase
    .from("chantier_assignments")
    .select("id, role, agent:profiles!user_id(nom, prenom)")
    .eq("chantier_id", id);
  const assignments = (assignmentsRaw ?? []) as unknown as AssignmentRow[];

  const { data: pointagesRaw } = await supabase
    .from("pointages")
    .select("id, heure_debut, heure_fin, duree_minutes, statut, agent:profiles!user_id(nom, prenom)")
    .eq("chantier_id", id)
    .order("heure_debut", { ascending: false })
    .limit(10);
  const pointages = (pointagesRaw ?? []) as unknown as PointageRow[];

  const totalMinutes = pointages.reduce((s, p) => s + (p.duree_minutes ?? 0), 0);
  const sc = STATUT_STYLE[chantier.statut] ?? { bg: "bg-slate-100", text: "text-slate-500", label: chantier.statut };
  const prixTTC = chantier.prix_ht ? chantier.prix_ht * (1 + chantier.taux_tva / 100) : null;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <Link href="/chantiers" className="mt-1 rounded-xl p-2 text-slate-400 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <p className="text-xs font-black tracking-widest" style={{ color: "#F5C200" }}>
              {chantier.reference || "—"}
            </p>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${sc.bg} ${sc.text}`}>
              {sc.label}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900" style={{ fontFamily: "Georgia,serif" }}>
            {chantier.nom}
          </h1>
          <p className="text-sm text-slate-400">{chantier.client?.nom}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Infos principales */}
        <div className="lg:col-span-2 space-y-5">

          {/* Carte infos */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-700">Informations</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">Type</p>
                <p className="mt-0.5 font-semibold text-slate-700">{chantier.type}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">Fréquence</p>
                <p className="mt-0.5 font-semibold text-slate-700 capitalize">{chantier.frequence}</p>
              </div>
              {chantier.date_debut && (
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Date début</p>
                  <p className="mt-0.5 font-semibold text-slate-700">{fmtDate(chantier.date_debut)}</p>
                </div>
              )}
              {chantier.date_fin && (
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Date fin</p>
                  <p className="mt-0.5 font-semibold text-slate-700">{fmtDate(chantier.date_fin)}</p>
                </div>
              )}
              {(chantier.adresse || chantier.ville) && (
                <div className="col-span-2">
                  <p className="text-xs font-bold uppercase text-slate-400">Adresse</p>
                  <p className="mt-0.5 flex items-center gap-1 font-semibold text-slate-700">
                    <MapPin className="h-3.5 w-3.5 text-slate-300" />
                    {[chantier.adresse, chantier.code_postal, chantier.ville].filter(Boolean).join(", ")}
                  </p>
                </div>
              )}
              {chantier.notes && (
                <div className="col-span-2">
                  <p className="text-xs font-bold uppercase text-slate-400">Notes</p>
                  <p className="mt-0.5 text-slate-600">{chantier.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pointages récents */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-50 px-5 py-4">
              <h2 className="font-bold text-slate-700">Pointages récents</h2>
              <span className="text-xs font-bold text-slate-400">
                Total : {fmtDuree(totalMinutes)}
              </span>
            </div>
            <div className="divide-y divide-slate-50">
              {pointages.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">Aucun pointage</p>
              )}
              {pointages.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">
                      {p.agent ? `${p.agent.prenom} ${p.agent.nom}` : "—"}
                    </p>
                    <p className="text-xs text-slate-400">{fmtDate(p.heure_debut)}</p>
                  </div>
                  {p.duree_minutes != null && (
                    <p className="text-sm font-bold text-[#1A2B5F]">{fmtDuree(p.duree_minutes)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne droite */}
        <div className="space-y-5">
          {/* Financier */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-700">Financier</h2>
            <div className="space-y-3">
              {chantier.prix_ht != null && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Prix HT</span>
                    <span className="font-bold text-slate-700">{fmtEurSans(chantier.prix_ht)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">TVA {chantier.taux_tva}%</span>
                    <span className="font-bold text-slate-700">{fmtEurSans(chantier.prix_ht * chantier.taux_tva / 100)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2 text-sm">
                    <span className="font-bold text-slate-700">Prix TTC</span>
                    <span className="font-black text-[#1A2B5F]">{fmtEurSans(prixTTC)}</span>
                  </div>
                </>
              )}
              {chantier.budget_heures != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Budget heures</span>
                  <span className="font-bold text-slate-700">{chantier.budget_heures}h</span>
                </div>
              )}
            </div>
          </div>

          {/* Client */}
          {chantier.client && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-bold text-slate-700">Client</h2>
              <p className="font-bold text-slate-800">{chantier.client.nom}</p>
              {chantier.client.entreprise && <p className="text-sm text-slate-400">{chantier.client.entreprise}</p>}
              {chantier.client.email && <p className="mt-2 text-sm text-slate-500">{chantier.client.email}</p>}
              {chantier.client.tel && <p className="text-sm text-slate-500">{chantier.client.tel}</p>}
            </div>
          )}

          {/* Équipe */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-slate-700">Équipe</h2>
            {chantier.manager && (
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">Manager</span>
                <span className="text-sm font-semibold text-slate-700">{chantier.manager.prenom} {chantier.manager.nom}</span>
              </div>
            )}
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center gap-2 py-1">
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 capitalize">{a.role}</span>
                <span className="text-sm text-slate-600">{a.agent?.prenom} {a.agent?.nom}</span>
              </div>
            ))}
            {!chantier.manager && assignments.length === 0 && (
              <p className="text-sm text-slate-400">Aucun membre assigné</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
