import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fmtEurSans } from "@/lib/utils";
import { Plus, MapPin } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Chantiers — OZÉ" };

const STATUT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  planifié: { bg: "bg-blue-50",   text: "text-blue-700",   label: "Planifié" },
  en_cours: { bg: "bg-amber-50",  text: "text-amber-700",  label: "En cours" },
  terminé:  { bg: "bg-slate-100", text: "text-slate-500",  label: "Terminé"  },
  suspendu: { bg: "bg-orange-50", text: "text-orange-700", label: "Suspendu" },
  litige:   { bg: "bg-red-50",    text: "text-red-700",    label: "Litige"   },
};

type ChantierRow = {
  id: string;
  nom: string;
  reference: string;
  statut: string;
  type: string;
  adresse: string | null;
  ville: string | null;
  prix_ht: number | null;
  client: { nom: string } | null;
};

export default async function ChantiersPage() {
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

  const isAdmin = profile?.role === "admin";

  const { data } = await supabase
    .from("chantiers")
    .select(
      "id, nom, reference, statut, type, adresse, ville, prix_ht, client:clients!client_id(nom)"
    )
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as ChantierRow[];

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Opérations
          </p>
          <h1
            className="mt-1 text-3xl font-bold text-slate-900"
            style={{ fontFamily: "Georgia,serif" }}
          >
            Chantiers
          </h1>
        </div>
        {isAdmin && (
          <Link
            href="/chantiers/nouveau"
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold"
            style={{ background: "#1A2B5F", color: "#F5C200" }}
          >
            <Plus className="h-4 w-4" />
            Nouveau chantier
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => {
          const sc = STATUT_STYLE[c.statut] ?? STATUT_STYLE.planifié;
          return (
            <Link
              key={c.id}
              href={`/chantiers/${c.id}`}
              className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className="px-5 py-4"
                style={{
                  background:
                    "linear-gradient(135deg,#1A2B5F,#243570)",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p
                      className="mb-0.5 text-[10px] font-black tracking-widest"
                      style={{ color: "#F5C200" }}
                    >
                      {c.reference}
                    </p>
                    <p className="truncate font-bold text-white">{c.nom}</p>
                    <p className="text-xs text-white/50">
                      {c.client?.nom ?? ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${sc.bg} ${sc.text}`}
                  >
                    {sc.label}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 p-4">
                <span className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  {c.type}
                </span>
                {(c.adresse || c.ville) && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-slate-300" />
                    <span className="truncate">
                      {[c.adresse, c.ville].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                {c.prix_ht != null && (
                  <p className="text-right text-sm font-black text-[#1A2B5F]">
                    {fmtEurSans(c.prix_ht)}
                  </p>
                )}
              </div>
            </Link>
          );
        })}

        {rows.length === 0 && (
          <div className="col-span-full flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
            <p className="font-semibold text-slate-400">Aucun chantier</p>
          </div>
        )}
      </div>
    </div>
  );
}
