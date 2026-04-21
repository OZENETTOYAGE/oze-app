import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { fmtDate, fmtEur } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

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

const MODE_LABEL: Record<string, string> = {
  virement: "Virement", chèque: "Chèque", espèces: "Espèces",
  carte: "Carte", prélèvement: "Prélèvement", autre: "Autre",
};

export default async function FactureDetailPage({
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

  if (!["admin", "administratif"].includes(profile?.role ?? "")) {
    redirect("/dashboard");
  }

  const { data: facture } = await supabase
    .from("factures")
    .select("*, client:clients!client_id(nom, entreprise, email, tel)")
    .eq("id", id)
    .single();

  if (!facture) notFound();

  const { data: paiementsRaw } = await supabase
    .from("paiements")
    .select("id, montant, mode, date_paiement, reference, note")
    .eq("facture_id", id)
    .order("date_paiement", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = facture as any;
  const paiements = (paiementsRaw ?? []) as {
    id: string; montant: number; mode: string;
    date_paiement: string; reference: string | null; note: string | null;
  }[];

  const sc = STATUT_STYLE[f.statut] ?? STATUT_STYLE.brouillon;
  const now = new Date().toISOString().slice(0, 10);
  const enRetard = f.date_echeance && f.date_echeance < now && !["payée", "annulée"].includes(f.statut);
  const progression = f.total_ttc > 0 ? Math.min(100, (f.montant_paye / f.total_ttc) * 100) : 0;

  const NEXT_STATUTS: Record<string, { value: string; label: string }[]> = {
    brouillon: [{ value: "émise", label: "Émettre" }],
    émise: [{ value: "envoyée", label: "Marquer envoyée" }],
    envoyée: [{ value: "relancée", label: "Marquer relancée" }],
    en_retard: [{ value: "relancée", label: "Marquer relancée" }, { value: "litige", label: "Mettre en litige" }],
  };

  const actions = NEXT_STATUTS[f.statut] ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/finance" className="text-sm font-semibold text-slate-400 hover:text-slate-600">
          ← Finance
        </Link>
        <div className="flex items-center gap-2">
          {actions.map((a) => (
            <Link
              key={a.value}
              href={`/finance/factures/${id}/statut/${a.value}`}
              className="rounded-xl bg-[#1A2B5F] px-3 py-2 text-xs font-bold text-[#F5C200]"
            >
              {a.label}
            </Link>
          ))}
          {!["payée", "annulée"].includes(f.statut) && (
            <Link
              href={`/finance/factures/${id}/paiement`}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
            >
              + Paiement
            </Link>
          )}
        </div>
      </div>

      {/* Alerte retard */}
      {enRetard && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-bold text-red-700">Facture en retard</p>
            <p className="text-sm text-red-600">Échéance dépassée le {fmtDate(f.date_echeance)}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="mb-5 overflow-hidden rounded-2xl shadow-sm"
        style={{ background: "linear-gradient(135deg,#1A2B5F,#243570)" }}
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 font-mono text-sm font-black" style={{ color: "#F5C200" }}>
                {f.numero}
              </p>
              <h1 className="text-xl font-black text-white">{f.objet}</h1>
              <p className="mt-1 text-sm text-white/60">
                {f.client?.nom}{f.client?.entreprise ? ` — ${f.client.entreprise}` : ""}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${sc.bg} ${sc.text}`}>
              {sc.label}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/60">
            <span>Émise le {fmtDate(f.date_emission)}</span>
            {f.date_echeance && (
              <span className={enRetard ? "font-bold text-red-300" : ""}>
                Échéance : {fmtDate(f.date_echeance)}
              </span>
            )}
          </div>
        </div>

        {/* Progression paiement */}
        <div className="border-t border-white/10 px-6 py-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-white/60">
              Payé : {fmtEur(f.montant_paye)}
            </span>
            <span className="font-bold text-white">
              Restant : {fmtEur(f.solde)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${progression}%` }}
            />
          </div>
        </div>
      </div>

      {/* Totaux */}
      <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-700">Montants</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Total HT</span><span>{fmtEur(f.total_ht)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>TVA</span><span>{fmtEur(f.total_tva)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-black text-[#1A2B5F]">
            <span>Total TTC</span><span>{fmtEur(f.total_ttc)}</span>
          </div>
          {f.penalites > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Pénalités de retard</span><span>+{fmtEur(f.penalites)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Paiements */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-50 px-5 py-4">
          <h2 className="font-semibold text-slate-700">
            Paiements ({paiements.length})
          </h2>
        </div>
        <div className="divide-y divide-slate-50">
          {paiements.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">Aucun paiement enregistré</p>
          )}
          {paiements.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{fmtEur(p.montant)}</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    {MODE_LABEL[p.mode] ?? p.mode}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {fmtDate(p.date_paiement)}
                  {p.reference ? ` · Réf: ${p.reference}` : ""}
                </p>
                {p.note && <p className="text-xs text-slate-400">{p.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conditions paiement */}
      {(f.conditions_paiement || f.iban) && (
        <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          {f.conditions_paiement && (
            <p className="mb-2 text-sm text-slate-600">{f.conditions_paiement}</p>
          )}
          {f.iban && (
            <p className="font-mono text-sm text-slate-700">
              IBAN : {f.iban}{f.bic ? ` — BIC : ${f.bic}` : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
