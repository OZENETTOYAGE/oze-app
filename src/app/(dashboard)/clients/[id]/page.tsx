import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { fmtDate, fmtEurSans } from "@/lib/utils";
import { Mail, Phone, MapPin, Building2 } from "lucide-react";
import type { Metadata } from "next";

const STATUT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  planifié: { bg: "bg-blue-50",   text: "text-blue-700",   label: "Planifié" },
  en_cours: { bg: "bg-amber-50",  text: "text-amber-700",  label: "En cours" },
  terminé:  { bg: "bg-slate-100", text: "text-slate-500",  label: "Terminé"  },
  suspendu: { bg: "bg-orange-50", text: "text-orange-700", label: "Suspendu" },
  litige:   { bg: "bg-red-50",    text: "text-red-700",    label: "Litige"   },
};

export default async function ClientDetailPage({
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

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (!client) notFound();

  const { data: chantiersRaw } = await supabase
    .from("chantiers")
    .select("id, reference, nom, statut, type, prix_ht, date_debut")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chantiers = (chantiersRaw ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = client as any;

  const caTotal = chantiers.reduce(
    (s: number, ch: { prix_ht: number | null }) => s + (ch.prix_ht ?? 0),
    0
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/clients" className="text-sm font-semibold text-slate-400 hover:text-slate-600">
          ← Clients
        </Link>
        {canEdit && (
          <Link
            href={`/clients/${id}/modifier`}
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
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black"
              style={{ background: "#F5C200", color: "#1A2B5F" }}
            >
              {c.nom[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{c.nom}</h1>
              {c.entreprise && (
                <p className="text-sm text-white/60">{c.entreprise}</p>
              )}
              {!c.actif && (
                <span className="mt-1 inline-block rounded-full bg-slate-600 px-2.5 py-0.5 text-xs font-bold text-slate-200">
                  Inactif
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Mail, value: c.email, href: c.email ? `mailto:${c.email}` : undefined },
              { icon: Phone, value: c.tel, href: c.tel ? `tel:${c.tel}` : undefined },
              { icon: MapPin, value: [c.ville, c.code_postal].filter(Boolean).join(" ") || null },
              { icon: Building2, value: `${chantiers.length} chantier${chantiers.length !== 1 ? "s" : ""}` },
            ].map((item, i) => item.value ? (
              <div key={i} className="flex items-center gap-2 text-sm text-white/70">
                <item.icon className="h-4 w-4 shrink-0 text-white/40" />
                {item.href ? (
                  <a href={item.href} className="truncate hover:text-white">{item.value}</a>
                ) : (
                  <span className="truncate">{item.value}</span>
                )}
              </div>
            ) : null)}
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10">
          <div className="px-5 py-3 text-center">
            <p className="text-lg font-black text-white">{chantiers.length}</p>
            <p className="text-xs text-white/40">Chantiers</p>
          </div>
          <div className="px-5 py-3 text-center">
            <p className="text-lg font-black text-white">{fmtEurSans(caTotal)}</p>
            <p className="text-xs text-white/40">CA total HT</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {c.notes && (
        <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Notes internes</p>
          <p className="text-sm text-slate-600">{c.notes}</p>
        </div>
      )}

      {/* Chantiers */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-50 px-5 py-4">
          <h2 className="font-semibold text-slate-700">Chantiers ({chantiers.length})</h2>
          {canEdit && (
            <Link
              href={`/chantiers/nouveau?client=${id}`}
              className="rounded-xl px-3 py-1.5 text-xs font-bold"
              style={{ background: "#1A2B5F", color: "#F5C200" }}
            >
              + Nouveau
            </Link>
          )}
        </div>
        <div className="divide-y divide-slate-50">
          {chantiers.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">Aucun chantier</p>
          )}
          {chantiers.map((ch) => {
            const sc = STATUT_STYLE[ch.statut] ?? STATUT_STYLE.planifié;
            return (
              <Link
                key={ch.id}
                href={`/chantiers/${ch.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#1A2B5F]">{ch.reference}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                      {sc.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-slate-700">{ch.nom}</p>
                  <p className="text-xs text-slate-400">
                    {ch.type}{ch.date_debut ? ` · ${fmtDate(ch.date_debut)}` : ""}
                  </p>
                </div>
                {ch.prix_ht != null && (
                  <p className="text-sm font-black text-[#1A2B5F]">{fmtEurSans(ch.prix_ht)}</p>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
