import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fmtEurSans, fmtDate } from "@/lib/utils";
import { Plus, AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Finance — OZÉ" };

const DEVIS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  brouillon: { bg: "bg-slate-100", text: "text-slate-500",   label: "Brouillon" },
  envoyé:    { bg: "bg-blue-50",   text: "text-blue-700",    label: "Envoyé"    },
  accepté:   { bg: "bg-emerald-50",text: "text-emerald-700", label: "Accepté"   },
  refusé:    { bg: "bg-red-50",    text: "text-red-700",     label: "Refusé"    },
  expiré:    { bg: "bg-orange-50", text: "text-orange-700",  label: "Expiré"    },
  converti:  { bg: "bg-purple-50", text: "text-purple-700",  label: "Converti"  },
};

const FACTURE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
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

type DevisRow = {
  id: string;
  numero: string;
  statut: string;
  objet: string;
  total_ttc: number;
  date_emission: string;
  client: { nom: string } | null;
};

type FactureRow = {
  id: string;
  numero: string;
  statut: string;
  objet: string;
  total_ttc: number;
  solde: number;
  date_echeance: string | null;
  client: { nom: string } | null;
};

type StatRow = {
  statut: string;
  total_ttc: number;
  solde: number;
  date_echeance: string | null;
};

export default async function FinancePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["admin", "administratif"].includes(profile?.role ?? "")) {
    redirect("/dashboard");
  }

  const now = new Date().toISOString().slice(0, 10);

  const [devisRes, facturesRes, statsRes] = await Promise.all([
    supabase
      .from("devis")
      .select(
        "id, numero, statut, objet, total_ttc, date_emission, client:clients!client_id(nom)"
      )
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("factures")
      .select(
        "id, numero, statut, objet, total_ttc, solde, date_echeance, client:clients!client_id(nom)"
      )
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("factures").select("statut, total_ttc, solde, date_echeance"),
  ]);

  const devis = (devisRes.data ?? []) as unknown as DevisRow[];
  const factures = (facturesRes.data ?? []) as unknown as FactureRow[];
  const stats = (statsRes.data ?? []) as StatRow[];

  const caEncaisse = stats
    .filter((f) => f.statut === "payée")
    .reduce((s, f) => s + f.total_ttc, 0);

  const montantImpaye = stats
    .filter((f) => !["payée", "annulée"].includes(f.statut))
    .reduce((s, f) => s + f.solde, 0);

  const nbEnRetard = stats.filter(
    (f) =>
      f.date_echeance &&
      f.date_echeance < now &&
      !["payée", "annulée"].includes(f.statut)
  ).length;

  const devisAttente = devis.filter((d) => d.statut === "envoyé").length;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Commercial
          </p>
          <h1
            className="mt-1 text-3xl font-bold text-slate-900"
            style={{ fontFamily: "Georgia,serif" }}
          >
            Finance
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/finance/devis/nouveau"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" /> Devis
          </Link>
          <Link
            href="/finance/factures/nouveau"
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm"
            style={{ background: "#1A2B5F", color: "#F5C200" }}
          >
            <Plus className="h-4 w-4" /> Facture
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "CA encaissé",
            value: fmtEurSans(caEncaisse),
            color: "text-emerald-700",
            bg: "bg-emerald-50",
            alert: false,
          },
          {
            label: "Impayé",
            value: fmtEurSans(montantImpaye),
            color: "text-[#1A2B5F]",
            bg: "bg-[#EEF1FA]",
            alert: false,
          },
          {
            label: "En retard",
            value: nbEnRetard,
            color: "text-red-700",
            bg: "bg-red-50",
            alert: nbEnRetard > 0,
          },
          {
            label: "Devis en attente",
            value: devisAttente,
            color: "text-amber-700",
            bg: "bg-amber-50",
            alert: false,
          },
        ].map((k) => (
          <div
            key={k.label}
            className={`rounded-2xl border bg-white p-4 shadow-sm ${
              k.alert ? "border-red-200" : "border-slate-100"
            }`}
          >
            <div
              className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${k.bg}`}
            >
              {k.alert && (
                <AlertTriangle className={`h-4 w-4 ${k.color}`} />
              )}
            </div>
            <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-400">
              {k.label}
            </p>
          </div>
        ))}
      </div>

      {/* Devis */}
      <div className="mb-5 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-50 px-5 py-4">
          <h2 className="font-semibold text-slate-700">
            Devis récents ({devis.length})
          </h2>
        </div>
        <div className="divide-y divide-slate-50">
          {devis.map((d) => {
            const sc = DEVIS_STYLE[d.statut] ?? DEVIS_STYLE.brouillon;
            return (
              <Link
                key={d.id}
                href={`/finance/devis/${d.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#1A2B5F]">
                      {d.numero}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${sc.bg} ${sc.text}`}
                    >
                      {sc.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-slate-700">
                    {d.client?.nom ?? "—"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {fmtDate(d.date_emission)} · {d.objet}
                  </p>
                </div>
                <p className="text-sm font-black text-[#1A2B5F]">
                  {fmtEurSans(d.total_ttc)}
                </p>
              </Link>
            );
          })}
          {devis.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              Aucun devis
            </p>
          )}
        </div>
      </div>

      {/* Factures */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-50 px-5 py-4">
          <h2 className="font-semibold text-slate-700">
            Factures récentes ({factures.length})
          </h2>
        </div>
        <div className="divide-y divide-slate-50">
          {factures.map((f) => {
            const sc = FACTURE_STYLE[f.statut] ?? FACTURE_STYLE.brouillon;
            const enRetard =
              f.date_echeance &&
              f.date_echeance < now &&
              !["payée", "annulée"].includes(f.statut);
            return (
              <Link
                key={f.id}
                href={`/finance/factures/${f.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#1A2B5F]">
                      {f.numero}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${sc.bg} ${sc.text}`}
                    >
                      {sc.label}
                    </span>
                    {enRetard && (
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-slate-700">
                    {f.client?.nom ?? "—"}
                  </p>
                  {f.date_echeance && (
                    <p
                      className={`text-xs ${
                        enRetard ? "font-bold text-red-600" : "text-slate-400"
                      }`}
                    >
                      Échéance : {fmtDate(f.date_echeance)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-[#1A2B5F]">
                    {fmtEurSans(f.solde)}
                  </p>
                  <p className="text-xs text-slate-400">restant</p>
                </div>
              </Link>
            );
          })}
          {factures.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              Aucune facture
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
