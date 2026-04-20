import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Mail, Phone, MapPin } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Clients — OZÉ" };

type ClientRow = {
  id: string;
  nom: string;
  entreprise: string | null;
  email: string | null;
  tel: string | null;
  ville: string | null;
  actif: boolean;
};

export default async function ClientsPage() {
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

  const canEdit = ["admin", "manager"].includes(profile?.role ?? "");

  const { data } = await supabase
    .from("clients")
    .select("id, nom, entreprise, email, tel, ville, actif")
    .eq("actif", true)
    .order("nom");

  const rows = (data ?? []) as ClientRow[];

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Portefeuille
          </p>
          <h1
            className="mt-1 text-3xl font-bold text-slate-900"
            style={{ fontFamily: "Georgia,serif" }}
          >
            Clients
          </h1>
        </div>
        {canEdit && (
          <Link
            href="/clients/nouveau"
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold"
            style={{ background: "#1A2B5F", color: "#F5C200" }}
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => (
          <Link
            key={c.id}
            href={`/clients/${c.id}`}
            className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div
              className="p-5"
              style={{
                background: "linear-gradient(135deg,#1A2B5F,#243570)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black"
                  style={{ background: "#F5C200", color: "#1A2B5F" }}
                >
                  {c.nom[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{c.nom}</p>
                  {c.entreprise && (
                    <p className="truncate text-xs text-white/50">
                      {c.entreprise}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 p-4">
              {c.email && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Mail className="h-3.5 w-3.5 text-slate-300" />
                  <span className="truncate">{c.email}</span>
                </div>
              )}
              {c.tel && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Phone className="h-3.5 w-3.5 text-slate-300" />
                  <span>{c.tel}</span>
                </div>
              )}
              {c.ville && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-slate-300" />
                  <span>{c.ville}</span>
                </div>
              )}
            </div>
          </Link>
        ))}

        {rows.length === 0 && (
          <div className="col-span-full flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
            <p className="font-semibold text-slate-400">Aucun client</p>
          </div>
        )}
      </div>
    </div>
  );
}
