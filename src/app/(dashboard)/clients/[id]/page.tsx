import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { fmtDate, fmtEurSans } from "@/lib/utils";
import { ArrowLeft, Mail, Phone, MapPin, Building2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Client — OZÉ" };

type ClientDetail = {
  id: string; nom: string; entreprise: string | null; email: string | null;
  tel: string | null; adresse: string | null; ville: string | null;
  code_postal: string | null; notes: string | null; actif: boolean;
  created_at: string;
};

type ChantierRow = {
  id: string; nom: string; reference: string; statut: string; prix_ht: number | null;
};

const STATUT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  planifie:  { bg: "bg-blue-50",    text: "text-blue-700",    label: "Planifié"  },
  en_cours:  { bg: "bg-amber-50",   text: "text-amber-700",   label: "En cours"  },
  termine:   { bg: "bg-slate-100",  text: "text-slate-500",   label: "Terminé"   },
  suspendu:  { bg: "bg-orange-50",  text: "text-orange-700",  label: "Suspendu"  },
  litige:    { bg: "bg-red-50",     text: "text-red-700",     label: "Litige"    },
  planifié:  { bg: "bg-blue-50",    text: "text-blue-700",    label: "Planifié"  },
  terminé:   { bg: "bg-slate-100",  text: "text-slate-500",   label: "Terminé"   },
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

  const { data } = await supabase
    .from("clients")
    .select("id, nom, entreprise, email, tel, adresse, ville, code_postal, notes, actif, created_at")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const client = data as ClientDetail;

  const { data: chantiersRaw } = await supabase
    .from("chantiers")
    .select("id, nom, reference, statut, prix_ht")
    .eq("client_id", id)
    .order("created_at", { ascending: false });
  const chantiers = (chantiersRaw ?? []) as ChantierRow[];

  const totalCA = chantiers.reduce((s, c) => s + (c.prix_ht ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-start gap-4">
        <Link href="/clients" className="mt-1 rounded-xl p-2 text-slate-400 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Georgia,serif" }}>
            {client.nom}
          </h1>
          {client.entreprise && <p className="text-sm text-slate-400">{client.entreprise}</p>}
        </div>
        {!client.actif && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-400">Inactif</span>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {/* Chantiers */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-50 px-5 py-4">
              <h2 className="font-bold text-slate-700">Chantiers ({chantiers.length})</h2>
              {totalCA > 0 && (
                <span className="text-sm font-black text-[#1A2B5F]">{fmtEurSans(totalCA)} HT</span>
              )}
            </div>
            <div className="divide-y divide-slate-50">
              {chantiers.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">Aucun chantier</p>
              )}
              {chantiers.map((c) => {
                const sc = STATUT_STYLE[c.statut] ?? { bg: "bg-slate-100", text: "text-slate-500", label: c.statut };
                return (
                  <Link key={c.id} href={`/chantiers/${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{c.nom}</p>
                      <p className="text-xs text-slate-400">{c.reference}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.prix_ht != null && <span className="text-sm font-bold text-[#1A2B5F]">{fmtEurSans(c.prix_ht)}</span>}
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-700">Contact</h2>
            <div className="space-y-3">
              {client.email && (
                <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#1A2B5F]">
                  <Mail className="h-4 w-4 text-slate-300" />
                  {client.email}
                </a>
              )}
              {client.tel && (
                <a href={`tel:${client.tel}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#1A2B5F]">
                  <Phone className="h-4 w-4 text-slate-300" />
                  {client.tel}
                </a>
              )}
              {(client.adresse || client.ville) && (
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                  <span>{[client.adresse, client.code_postal, client.ville].filter(Boolean).join(", ")}</span>
                </div>
              )}
              {client.entreprise && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Building2 className="h-4 w-4 text-slate-300" />
                  {client.entreprise}
                </div>
              )}
            </div>
            {client.notes && (
              <div className="mt-4 border-t border-slate-50 pt-4">
                <p className="text-xs font-bold uppercase text-slate-400">Notes</p>
                <p className="mt-1 text-sm text-slate-600">{client.notes}</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">Client depuis</p>
            <p className="mt-1 font-semibold text-slate-700">{fmtDate(client.created_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
