import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { fmtDate, fmtEur } from "@/lib/utils";
import type { Metadata } from "next";

const STATUT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  brouillon: { bg: "bg-slate-100", text: "text-slate-500",   label: "Brouillon" },
  envoyé:    { bg: "bg-blue-50",   text: "text-blue-700",    label: "Envoyé"    },
  accepté:   { bg: "bg-emerald-50",text: "text-emerald-700", label: "Accepté"   },
  refusé:    { bg: "bg-red-50",    text: "text-red-700",     label: "Refusé"    },
  expiré:    { bg: "bg-orange-50", text: "text-orange-700",  label: "Expiré"    },
  converti:  { bg: "bg-purple-50", text: "text-purple-700",  label: "Converti"  },
};

export default async function DevisDetailPage({
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

  const { data: devis } = await supabase
    .from("devis")
    .select("*, client:clients!client_id(nom, entreprise, email, tel), redacteur:profiles!redacteur_id(nom, prenom)")
    .eq("id", id)
    .single();

  if (!devis) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = devis as any;
  const sc = STATUT_STYLE[d.statut] ?? STATUT_STYLE.brouillon;

  const NEXT_STATUTS: Record<string, { value: string; label: string; color: string }[]> = {
    brouillon: [{ value: "envoyé", label: "Marquer envoyé", color: "bg-blue-600" }],
    envoyé: [
      { value: "accepté", label: "Marquer accepté", color: "bg-emerald-600" },
      { value: "refusé", label: "Marquer refusé", color: "bg-red-600" },
      { value: "expiré", label: "Marquer expiré", color: "bg-orange-600" },
    ],
    accepté: [{ value: "converti", label: "Convertir en facture", color: "bg-purple-600" }],
  };

  const actions = NEXT_STATUTS[d.statut] ?? [];

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
              href={`/finance/devis/${id}/statut/${a.value}`}
              className={`rounded-xl px-3 py-2 text-xs font-bold text-white ${a.color}`}
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Header */}
      <div
        className="mb-5 overflow-hidden rounded-2xl shadow-sm"
        style={{ background: "linear-gradient(135deg,#1A2B5F,#243570)" }}
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 font-mono text-sm font-black" style={{ color: "#F5C200" }}>
                {d.numero}
              </p>
              <h1 className="text-xl font-black text-white">{d.objet}</h1>
              <p className="mt-1 text-sm text-white/60">
                {d.client?.nom}{d.client?.entreprise ? ` — ${d.client.entreprise}` : ""}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${sc.bg} ${sc.text}`}>
              {sc.label}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/60">
            <span>Émis le {fmtDate(d.date_emission)}</span>
            {d.date_validite && <span>Valide jusqu'au {fmtDate(d.date_validite)}</span>}
            {d.redacteur && (
              <span>
                Par {d.redacteur.prenom ?? ""} {d.redacteur.nom}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Totaux */}
      <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-700">Montants</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Total HT</span>
            <span>{fmtEur(d.total_ht)}</span>
          </div>
          {d.remise_montant > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Remise ({d.remise_pct}%)</span>
              <span>−{fmtEur(d.remise_montant)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-500">
            <span>TVA ({d.taux_tva_defaut}%)</span>
            <span>{fmtEur(d.total_tva)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-2 text-lg font-black text-[#1A2B5F]">
            <span>Total TTC</span>
            <span>{fmtEur(d.total_ttc)}</span>
          </div>
        </div>
      </div>

      {/* Textes */}
      {(d.introduction || d.conditions) && (
        <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          {d.introduction && (
            <div className="mb-4">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">Introduction</p>
              <p className="text-sm text-slate-600">{d.introduction}</p>
            </div>
          )}
          {d.conditions && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">Conditions</p>
              <p className="text-sm text-slate-600">{d.conditions}</p>
            </div>
          )}
        </div>
      )}

      {/* Contact */}
      {(d.client?.email || d.client?.tel) && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-700">Contact client</h2>
          <div className="space-y-2 text-sm text-slate-600">
            {d.client.email && (
              <a href={`mailto:${d.client.email}`} className="block hover:text-[#1A2B5F]">
                {d.client.email}
              </a>
            )}
            {d.client.tel && (
              <a href={`tel:${d.client.tel}`} className="block hover:text-[#1A2B5F]">
                {d.client.tel}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
