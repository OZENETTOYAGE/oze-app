import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { initiales } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Utilisateurs — OZÉ" };

const ROLE_CFG: Record<string, { label: string; bg: string; text: string }> = {
  admin:         { label: "Admin",         bg: "bg-[#EEF1FA]", text: "text-[#1A2B5F]"   },
  manager:       { label: "Manager",       bg: "bg-purple-50", text: "text-purple-700"  },
  administratif: { label: "Administratif", bg: "bg-amber-50",  text: "text-amber-700"   },
  agent:         { label: "Agent",         bg: "bg-emerald-50",text: "text-emerald-700" },
};

type UserRow = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  poste: string | null;
  tel: string | null;
  actif: boolean;
  taux_horaire: number | null;
};

export default async function UtilisateursPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  const { data } = await supabase
    .from("profiles")
    .select("id, nom, prenom, email, role, poste, tel, actif, taux_horaire")
    .order("nom");

  const users = (data ?? []) as UserRow[];
  const actifs = users.filter((u) => u.actif);
  const inactifs = users.filter((u) => !u.actif);

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Administration</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900" style={{ fontFamily: "Georgia,serif" }}>
            Utilisateurs
          </h1>
        </div>
        <div className="flex gap-2 text-sm text-slate-400">
          <span className="rounded-xl bg-white border border-slate-100 px-3 py-1.5 font-semibold">
            {actifs.length} actifs
          </span>
          {inactifs.length > 0 && (
            <span className="rounded-xl bg-white border border-slate-100 px-3 py-1.5 font-semibold">
              {inactifs.length} inactifs
            </span>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-50 bg-slate-50/50">
              <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400">Utilisateur</th>
              <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400">Rôle</th>
              <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400">Contact</th>
              <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400">Taux/h</th>
              <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map((u) => {
              const rc = ROLE_CFG[u.role] ?? ROLE_CFG.agent;
              const fullName = `${u.prenom} ${u.nom}`.trim();
              return (
                <tr key={u.id} className={`hover:bg-slate-50 ${!u.actif ? "opacity-50" : ""}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black"
                        style={{ background: "#1A2B5F", color: "#F5C200" }}
                      >
                        {initiales(fullName)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{fullName}</p>
                        {u.poste && <p className="text-xs text-slate-400">{u.poste}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${rc.bg} ${rc.text}`}>
                      {rc.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    <p>{u.email}</p>
                    {u.tel && <p className="text-xs">{u.tel}</p>}
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-700">
                    {u.taux_horaire != null ? `${u.taux_horaire} €/h` : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${u.actif ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                      {u.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">Aucun utilisateur</p>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Pour ajouter un utilisateur, créez-le dans Supabase Authentication puis insérez son profil dans la table <code>profiles</code>.
      </p>
    </div>
  );
}
