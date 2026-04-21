import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { fmtDate, fmtEurSans, fmtDuree } from "@/lib/utils";
import { MapPin, Calendar, Euro, Clock, Users } from "lucide-react";
import type { Metadata } from "next";

const STATUT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  planifié: { bg: "bg-blue-50",   text: "text-blue-700",   label: "Planifié" },
  en_cours: { bg: "bg-amber-50",  text: "text-amber-700",  label: "En cours" },
  terminé:  { bg: "bg-slate-100", text: "text-slate-500",  label: "Terminé"  },
  suspendu: { bg: "bg-orange-50", text: "text-orange-700", label: "Suspendu" },
  litige:   { bg: "bg-red-50",    text: "text-red-700",    label: "Litige"   },
};

const ASSIGN_ROLE: Record<string, string> = {
  agent: "Agent",
  chef_equipe: "Chef d'équipe",
  remplacant: "Remplaçant",
};

const INTERV_STATUT: Record<string, { bg: string; text: string; label: string }> = {
  brouillon:  { bg: "bg-slate-100", text: "text-slate-500",   label: "Brouillon" },
  en_cours:   { bg: "bg-amber-50",  text: "text-amber-700",   label: "En cours"  },
  en_attente: { bg: "bg-blue-50",   text: "text-blue-700",    label: "En attente"},
  terminée:   { bg: "bg-slate-100", text: "text-slate-600",   label: "Terminée"  },
  validée:    { bg: "bg-emerald-50",text: "text-emerald-700", label: "Validée"   },
  litige:     { bg: "bg-red-50",    text: "text-red-700",     label: "Litige"    },
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const canEdit = ["admin", "manager"].includes(profile?.role ?? "");

  const { data: chantier } = await supabase
    .from("chantiers")
    .select("*, client:clients!client_id(id, nom, entreprise)")
    .eq("id", id)
    .single();

  if (!chantier) notFound();

  const [assignRes, intervRes, ptRes] = await Promise.all([
    supabase
      .from("chantier_assignments")
      .select("id, role, heure_debut, heure_fin, jours, user:profiles!user_id(nom, prenom, role)")
      .eq("chantier_id", id),
    supabase
      .from("interventions")
      .select("id, statut, date_prevue, started_at, finished_at, user:profiles!user_id(nom, prenom)")
      .eq("chantier_id", id)
      .order("date_prevue", { ascending: false })
      .limit(10),
    supabase
      .from("pointages")
      .select("duree_minutes")
      .eq("chantier_id", id)
      .not("statut", "eq", "litige"),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assignments = (assignRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const interventions = (intervRes.data ?? []) as any[];
  const totalMinutes = (ptRes.data ?? []).reduce(
    (s: number, p: { duree_minutes: number | null }) => s + (p.duree_minutes ?? 0),
    0
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = chantier as any;
  const sc = STATUT_STYLE[c.statut] ?? STATUT_STYLE.planifié;

  const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/chantiers" className="text-sm font-semibold text-slate-400 hover:text-slate-600">
            ← Chantiers
          </Link>
        </div>
        {canEdit && (
          <Link
            href={`/chantiers/${id}/modifier`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Modifier
          </Link>
        )}
      </div>

      {/* Header */}
      <div
        className="mb-5 overflow-hidden rounded-2xl shadow-sm"
        style={{ background: "linear-gradient(135deg,#1A2B5F,#243570)" }}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-black tracking-widest" style={{ color: "#F5C200" }}>
                {c.reference}
              </p>
              <h1 className="text-2xl font-black text-white">{c.nom}</h1>
              <p className="mt-1 text-sm text-white/60">
                {c.client?.nom}{c.client?.entreprise ? ` — ${c.client.entreprise}` : ""}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${sc.bg} ${sc.text}`}>
              {sc.label}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/70">
            {(c.adresse || c.ville) && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {[c.adresse, c.ville].filter(Boolean).join(", ")}
              </div>
            )}
            {c.date_debut && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {fmtDate(c.date_debut)}
                {c.date_fin ? ` → ${fmtDate(c.date_fin)}` : ""}
              </div>
            )}
            {c.prix_ht != null && (
              <div className="flex items-center gap-1.5">
                <Euro className="h-4 w-4" />
                {fmtEurSans(c.prix_ht)} HT
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
          <div className="px-5 py-3 text-center">
            <p className="text-lg font-black text-white">{c.type}</p>
            <p className="text-xs text-white/40">Type</p>
          </div>
          <div className="px-5 py-3 text-center">
            <p className="text-lg font-black text-white capitalize">{c.frequence}</p>
            <p className="text-xs text-white/40">Fréquence</p>
          </div>
          <div className="px-5 py-3 text-center">
            <p className="text-lg font-black text-white">{fmtDuree(totalMinutes) || "0h00"}</p>
            <p className="text-xs text-white/40">Temps total</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Équipe assignée */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-50 px-5 py-4">
            <h2 className="font-semibold text-slate-700">
              <Users className="mr-2 inline h-4 w-4 text-slate-400" />
              Équipe assignée
            </h2>
          </div>
          <div className="divide-y divide-slate-50">
            {assignments.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">Aucune assignation</p>
            )}
            {assignments.map((a) => {
              const fullName = `${a.user?.prenom ?? ""} ${a.user?.nom ?? ""}`.trim();
              const joursActifs = (a.jours as boolean[])
                .map((v: boolean, i: number) => (v ? JOURS[i] : null))
                .filter(Boolean)
                .join(", ");
              return (
                <div key={a.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{fullName}</span>
                    <span className="rounded-full bg-[#EEF1FA] px-2.5 py-0.5 text-xs font-bold text-[#1A2B5F]">
                      {ASSIGN_ROLE[a.role] ?? a.role}
                    </span>
                  </div>
                  {joursActifs && (
                    <p className="mt-0.5 text-xs text-slate-400">{joursActifs}</p>
                  )}
                  {(a.heure_debut || a.heure_fin) && (
                    <p className="text-xs text-slate-400">
                      {a.heure_debut ?? "?"} — {a.heure_fin ?? "?"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats + notes */}
        <div className="space-y-4">
          {c.budget_heures != null && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xl font-black text-purple-700">
                    {fmtDuree(totalMinutes)} / {c.budget_heures}h
                  </p>
                  <p className="text-xs font-semibold text-slate-400">Budget heures</p>
                </div>
              </div>
              {c.budget_heures > 0 && (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all"
                    style={{ width: `${Math.min(100, (totalMinutes / 60 / c.budget_heures) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {c.description && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Description</p>
              <p className="text-sm text-slate-600">{c.description}</p>
            </div>
          )}

          {c.acces_notes && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-600">Accès / Notes terrain</p>
              <p className="text-sm text-amber-800">{c.acces_notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Interventions récentes */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-50 px-5 py-4">
          <h2 className="font-semibold text-slate-700">
            Interventions récentes ({interventions.length})
          </h2>
        </div>
        <div className="divide-y divide-slate-50">
          {interventions.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">Aucune intervention</p>
          )}
          {interventions.map((i) => {
            const is = INTERV_STATUT[i.statut] ?? INTERV_STATUT.brouillon;
            const fullName = `${i.user?.prenom ?? ""} ${i.user?.nom ?? ""}`.trim();
            return (
              <div key={i.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{fullName || "—"}</p>
                  <p className="text-xs text-slate-400">{fmtDate(i.date_prevue)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${is.bg} ${is.text}`}>
                  {is.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
