import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { fmtTime, fmtDate, fmtDuree } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pointage — OZÉ" };

const STATUT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  en_cours: { bg: "bg-amber-50",   text: "text-amber-700",   label: "En cours" },
  terminé:  { bg: "bg-slate-100",  text: "text-slate-500",   label: "Terminé"  },
  validé:   { bg: "bg-emerald-50", text: "text-emerald-700", label: "Validé"   },
  litige:   { bg: "bg-red-50",     text: "text-red-700",     label: "Litige"   },
};

type PointageActif = {
  id: string;
  heure_debut: string;
  chantier: { nom: string } | null;
};

type PointageRow = {
  id: string;
  heure_debut: string;
  heure_fin: string | null;
  duree_minutes: number | null;
  statut: string;
  chantier: { nom: string } | null;
};

export default async function PointagePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: actifRaw } = await supabase
    .from("pointages")
    .select("id, heure_debut, chantier:chantiers!chantier_id(nom)")
    .eq("user_id", user.id)
    .eq("statut", "en_cours")
    .maybeSingle();

  const actif = actifRaw as PointageActif | null;

  const { data: histRaw } = await supabase
    .from("pointages")
    .select(
      "id, heure_debut, heure_fin, duree_minutes, statut, chantier:chantiers!chantier_id(nom)"
    )
    .eq("user_id", user.id)
    .order("heure_debut", { ascending: false })
    .limit(20);

  const historique = (histRaw ?? []) as unknown as PointageRow[];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Terrain
        </p>
        <h1
          className="mt-1 text-3xl font-bold text-slate-900"
          style={{ fontFamily: "Georgia,serif" }}
        >
          Pointage
        </h1>
      </div>

      {actif ? (
        <div className="mb-6 overflow-hidden rounded-2xl border-2 border-amber-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-amber-50 px-5 py-3">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
            <span className="text-sm font-bold text-amber-800">
              Pointage en cours
            </span>
          </div>
          <div className="p-5 text-center">
            <p className="mb-1 text-2xl font-black text-[#1A2B5F]">
              {actif.chantier?.nom ?? "Sans chantier"}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Début : {fmtTime(actif.heure_debut)}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
          <p className="mb-4 text-sm text-slate-500">
            Aucun pointage en cours.
          </p>
          <a
            href="/pointage/demarrer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-black text-white"
            style={{
              background: "linear-gradient(135deg,#10b981,#059669)",
            }}
          >
            ▶ Pointer l&apos;arrivée
          </a>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-50 px-5 py-4">
          <h2 className="font-semibold text-slate-700">
            Mes pointages récents
          </h2>
        </div>
        <div className="divide-y divide-slate-50">
          {historique.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              Aucun pointage
            </p>
          )}
          {historique.map((p) => {
            const sc = STATUT_STYLE[p.statut] ?? STATUT_STYLE.terminé;
            return (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {p.chantier?.nom ?? "Sans chantier"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {fmtDate(p.heure_debut)} · {fmtTime(p.heure_debut)}
                    {p.heure_fin ? ` → ${fmtTime(p.heure_fin)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  {p.duree_minutes != null && (
                    <p className="text-sm font-bold text-[#1A2B5F]">
                      {fmtDuree(p.duree_minutes)}
                    </p>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sc.bg} ${sc.text}`}
                  >
                    {sc.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
