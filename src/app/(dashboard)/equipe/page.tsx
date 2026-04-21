import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { initiales } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Équipe — OZÉ" };

const ROLE_CFG: Record<string, { label: string; bg: string; text: string }> = {
  admin:         { label: "Admin",         bg: "bg-[#EEF1FA]", text: "text-[#1A2B5F]"   },
  manager:       { label: "Manager",       bg: "bg-purple-50", text: "text-purple-700"  },
  administratif: { label: "Administratif", bg: "bg-amber-50",  text: "text-amber-700"   },
  agent:         { label: "Agent",         bg: "bg-emerald-50",text: "text-emerald-700" },
};

type MembreRow = {
  id: string;
  nom: string;
  prenom: string | null;
  role: string;
  poste: string | null;
  tel: string | null;
  actif: boolean;
};

export default async function EquipePage() {
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

  if (!["admin", "manager"].includes(profile?.role ?? "")) {
    redirect("/dashboard");
  }

  const { data: membresRaw } = await supabase
    .from("profiles")
    .select("id, nom, prenom, role, poste, tel, actif")
    .order("nom");

  const membres = (membresRaw ?? []) as MembreRow[];

  const { data: enCoursRaw } = await supabase
    .from("pointages")
    .select("user_id")
    .eq("statut", "en_cours");

  const surSite = new Set(
    (enCoursRaw ?? []).map((p: { user_id: string }) => p.user_id)
  );

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Ressources humaines
        </p>
        <h1
          className="mt-1 text-3xl font-bold text-slate-900"
          style={{ fontFamily: "Georgia,serif" }}
        >
          Équipe
        </h1>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          {
            label: "Total",
            value: membres.filter((m) => m.actif).length,
            color: "text-[#1A2B5F]",
          },
          {
            label: "Sur site",
            value: membres.filter((m) => surSite.has(m.id)).length,
            color: "text-amber-700",
          },
          {
            label: "Agents",
            value: membres.filter((m) => m.role === "agent" && m.actif).length,
            color: "text-emerald-700",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-400">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {membres.map((m) => {
          const rc = ROLE_CFG[m.role] ?? ROLE_CFG.agent;
          const estSurSite = surSite.has(m.id);
          const fullName = `${m.prenom ?? ""} ${m.nom}`.trim();
          return (
            <div
              key={m.id}
              className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              style={{ opacity: m.actif ? 1 : 0.55 }}
            >
              <div className="relative">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black"
                  style={{ background: "#1A2B5F", color: "#F5C200" }}
                >
                  {initiales(fullName)}
                </div>
                {estSurSite && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900">{fullName}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${rc.bg} ${rc.text}`}
                  >
                    {rc.label}
                  </span>
                  {estSurSite && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                      Sur site
                    </span>
                  )}
                  {!m.actif && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-400">
                      Inactif
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex gap-3 text-xs text-slate-400">
                  {m.poste && <span>{m.poste}</span>}
                  {m.tel && <span>{m.tel}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
