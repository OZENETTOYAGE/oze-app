import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fmtDate } from "@/lib/utils";
import { Plus, ClipboardList } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Interventions — OZÉ" };

const STATUT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  brouillon: { bg: "bg-slate-100",  text: "text-slate-500",   label: "Brouillon" },
  en_cours:  { bg: "bg-amber-50",   text: "text-amber-700",   label: "En cours"  },
  en_attente:{ bg: "bg-blue-50",    text: "text-blue-700",    label: "En attente"},
  terminee:  { bg: "bg-emerald-50", text: "text-emerald-700", label: "Terminée"  },
  validee:   { bg: "bg-teal-50",    text: "text-teal-700",    label: "Validée"   },
  litige:    { bg: "bg-red-50",     text: "text-red-700",     label: "Litige"    },
};

type InterventionRow = {
  id: string;
  statut: string;
  date_prevue: string;
  commentaires: string | null;
  chantier: { nom: string; reference: string } | null;
  agent: { nom: string; prenom: string } | null;
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

  const isAgent = profile?.role === "agent";

  let query = supabase
    .from("interventions")
    .select("id, statut, date_prevue, commentaires, chantier:chantiers!chantier_id(nom, reference), agent:profiles!user_id(nom, prenom)")
    .order("date_prevue", { ascending: false })
    .limit(50);

  if (isAgent) {
    query = query.eq("user_id", user.id);
  }

  const { data } = await query;
  const rows = (data ?? []) as unknown as InterventionRow[];

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Terrain
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900" style={{ fontFamily: "Georgia,serif" }}>
            Interventions
          </h1>
        </div>
        {!isAgent && (
          <Link
            href="/interventions/nouveau"
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold"
            style={{ background: "#1A2B5F", color: "#F5C200" }}
          >
            <Plus className="h-4 w-4" />
            Nouvelle
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="divide-y divide-slate-50">
          {rows.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <ClipboardList className="mb-3 h-10 w-10 text-slate-200" />
              <p className="font-semibold text-slate-400">Aucune intervention</p>
            </div>
          )}
          {rows.map((i) => {
            const sc = STATUT_STYLE[i.statut] ?? STATUT_STYLE.brouillon;
            return (
              <Link
                key={i.id}
                href={`/interventions/${i.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-800">
                      {i.chantier?.nom ?? "Sans chantier"}
                    </p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                      {sc.label}
                    </span>
                  </div>
                  <div className="mt-0.5 flex gap-3 text-xs text-slate-400">
                    {i.chantier?.reference && <span>{i.chantier.reference}</span>}
                    {i.agent && <span>{i.agent.prenom} {i.agent.nom}</span>}
                    {i.commentaires && <span className="truncate max-w-xs">{i.commentaires}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#1A2B5F]">{fmtDate(i.date_prevue)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
