import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fmtDate, fmtTime } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Interventions — OZÉ" };

const STATUT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  brouillon:  { bg: "bg-slate-100", text: "text-slate-500",   label: "Brouillon" },
  en_cours:   { bg: "bg-amber-50",  text: "text-amber-700",   label: "En cours"  },
  en_attente: { bg: "bg-blue-50",   text: "text-blue-700",    label: "En attente"},
  terminée:   { bg: "bg-slate-100", text: "text-slate-600",   label: "Terminée"  },
  validée:    { bg: "bg-emerald-50",text: "text-emerald-700", label: "Validée"   },
  litige:     { bg: "bg-red-50",    text: "text-red-700",     label: "Litige"    },
};

type IntervRow = {
  id: string;
  statut: string;
  date_prevue: string;
  started_at: string | null;
  finished_at: string | null;
  chantier: { nom: string; reference: string } | null;
  user: { nom: string; prenom: string | null } | null;
};

export default async function InterventionsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdminOrManager = ["admin", "manager"].includes(profile?.role ?? "");

  let query = supabase
    .from("interventions")
    .select(
      "id, statut, date_prevue, started_at, finished_at, chantier:chantiers!chantier_id(nom, reference), user:profiles!user_id(nom, prenom)"
    )
    .order("date_prevue", { ascending: false })
    .limit(50);

  if (!isAdminOrManager) {
    query = query.eq("user_id", user.id);
  }

  const { data } = await query;
  const rows = (data ?? []) as unknown as IntervRow[];

  const enCours = rows.filter((r) => r.statut === "en_cours").length;
  const enAttente = rows.filter((r) => r.statut === "en_attente").length;
  const terminees = rows.filter((r) => ["terminée", "validée"].includes(r.statut)).length;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Terrain</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900" style={{ fontFamily: "Georgia,serif" }}>
            Interventions
          </h1>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "En cours", value: enCours, color: "text-amber-700", bg: "bg-amber-50" },
          { label: "En attente", value: enAttente, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Terminées", value: terminees, color: "text-emerald-700", bg: "bg-emerald-50" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Liste */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-50 px-5 py-4">
          <h2 className="font-semibold text-slate-700">
            {isAdminOrManager ? `Toutes les interventions (${rows.length})` : `Mes interventions (${rows.length})`}
          </h2>
        </div>
        <div className="divide-y divide-slate-50">
          {rows.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">Aucune intervention</p>
          )}
          {rows.map((r) => {
            const sc = STATUT_STYLE[r.statut] ?? STATUT_STYLE.brouillon;
            const fullName = r.user ? `${r.user.prenom ?? ""} ${r.user.nom}`.trim() : "—";
            return (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {r.chantier && (
                      <span className="font-mono text-xs font-black text-[#1A2B5F]">
                        {r.chantier.reference}
                      </span>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                      {sc.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-slate-800">
                    {r.chantier?.nom ?? "Sans chantier"}
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-400">
                    <span>{fmtDate(r.date_prevue)}</span>
                    {r.started_at && <span>Démarré {fmtTime(r.started_at)}</span>}
                    {r.finished_at && <span>→ {fmtTime(r.finished_at)}</span>}
                    {isAdminOrManager && <span>· {fullName}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
