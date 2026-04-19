import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { fmtEurSans, fmtDuree } from "@/lib/utils";
import { TrendingUp, TrendingDown, Building2, Clock, CreditCard, AlertTriangle, Users, BarChart3 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tableau de bord" };
export const revalidate = 300;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("nom,prenom,role").eq("id", user.id).single();

  const now = new Date();
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const debutMoisPrec = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const finMoisPrec = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  const [chantiersRes, facturesRes, pointagesMoisRes, pointagesJourRes, enRetardRes, caRes, caPrecRes] = await Promise.all([
    supabase.from("chantiers").select("statut"),
    supabase.from("factures").select("statut,total_ttc,solde,date_echeance").not("statut","in",'("payée","annulée")'),
    supabase.from("pointages").select("duree_minutes,cout_mo").gte("heure_debut", debutMois).not("statut","eq","litige"),
    supabase.from("pointages").select("id,statut").gte("heure_debut", now.toISOString().slice(0,10)),
    supabase.from("factures").select("id").not("statut","in",'("payée","annulée")').lt("date_echeance", now.toISOString().slice(0,10)),
    supabase.from("factures").select("total_ttc").eq("statut","payée").gte("date_emission", debutMois),
    supabase.from("factures").select("total_ttc").eq("statut","payée").gte("date_emission", debutMoisPrec).lte("date_emission", finMoisPrec),
  ]);

  const chantiers = chantiersRes.data ?? [];
  const factures = facturesRes.data ?? [];
  const ptMois = pointagesMoisRes.data ?? [];
  const ptJour = pointagesJourRes.data ?? [];

  const caMois = (caRes.data ?? []).reduce((s, f) => s + f.total_ttc, 0);
  const caPrec = (caPrecRes.data ?? []).reduce((s, f) => s + f.total_ttc, 0);
  const varCA = caPrec > 0 ? Math.round(((caMois - caPrec) / caPrec) * 100) : null;
  const minutesMois = ptMois.reduce((s, p) => s + (p.duree_minutes ?? 0), 0);
  const coutMO = ptMois.reduce((s, p) => s + (p.cout_mo ?? 0), 0);
  const montantImpaye = factures.reduce((s, f) => s + f.solde, 0);
  const agentsSurSite = ptJour.filter(p => p.statut === "en_cours").length;
  const nbEnRetard = (enRetardRes.data ?? []).length;
  const marge = caMois > 0 ? Math.round((1 - coutMO / caMois) * 100) : null;
  const chantiersEnCours = chantiers.filter(c => c.statut === "en_cours").length;
  const chantiersPlannifies = chantiers.filter(c => c.statut === "planifié").length;
  const chantiersSuspendus = chantiers.filter(c => c.statut === "suspendu").length;

  const isAgent = profile?.role === "agent";
  const prenom = profile?.prenom || profile?.nom?.split(" ")[0] || "vous";
  const h = new Date().getHours();
  const salut = h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          {new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900" style={{ fontFamily:"Georgia,serif" }}>
          {salut}, {prenom} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {agentsSurSite > 0 ? `${agentsSurSite} agent${agentsSurSite > 1 ? "s" : ""} sur site en ce moment` : "Aucun agent sur site actuellement"}
        </p>
      </div>

      {nbEnRetard > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="font-bold text-red-700">{nbEnRetard} facture{nbEnRetard > 1 ? "s" : ""} en retard</p>
            <p className="text-sm text-red-600">{fmtEurSans(montantImpaye)} d&apos;impayés au total</p>
          </div>
          <a href="/finance" className="rounded-xl bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200">Voir</a>
        </div>
      )}

      {!isAgent && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label:"CA du mois",         value:fmtEurSans(caMois),   icon:BarChart3,   bg:"bg-[#EEF1FA]", color:"text-[#1A2B5F]",  variation:varCA },
            { label:"Chantiers actifs",   value:chantiersEnCours,      icon:Building2,   bg:"bg-teal-50",   color:"text-teal-700",   sous:`${chantiersPlannifies} planifiés${chantiersSuspendus > 0 ? ` · ${chantiersSuspendus} susp.` : ""}` },
            { label:"Factures impayées",  value:fmtEurSans(montantImpaye), icon:CreditCard, bg:nbEnRetard > 0 ? "bg-red-50" : "bg-amber-50", color:nbEnRetard > 0 ? "text-red-700" : "text-amber-700", alerte:nbEnRetard > 0 },
            { label:"Rentabilité mois",   value:marge != null ? `${marge}%` : "—", icon:TrendingUp, bg:marge == null ? "bg-slate-50" : marge >= 40 ? "bg-emerald-50" : marge >= 20 ? "bg-amber-50" : "bg-red-50", color:marge == null ? "text-slate-400" : marge >= 40 ? "text-emerald-700" : marge >= 20 ? "text-amber-700" : "text-red-700" },
          ].map(k => (
            <div key={k.label} className={`rounded-2xl border bg-white p-5 shadow-sm ${(k as any).alerte ? "border-red-200" : "border-slate-100"}`}>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${k.bg}`}>
                <k.icon className={`h-5 w-5 ${k.color}`} />
              </div>
              <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
              <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-slate-400">{k.label}</p>
              {(k as any).sous && <p className="mt-1 text-xs text-slate-400">{(k as any).sous}</p>}
              {(k as any).variation != null && (
                <div className={`mt-2 flex items-center gap-1 text-xs font-bold ${(k as any).variation >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {(k as any).variation >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {(k as any).variation > 0 ? "+" : ""}{(k as any).variation}% vs mois dernier
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50"><Clock className="h-5 w-5 text-purple-600" /></div>
          <p className="text-2xl font-black text-purple-700">{fmtDuree(minutesMois)}</p>
          <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-slate-400">Temps travaillé ce mois</p>
        </div>
        <div className={`rounded-2xl border bg-white p-5 shadow-sm ${agentsSurSite > 0 ? "border-emerald-200" : "border-slate-100"}`}>
          <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${agentsSurSite > 0 ? "bg-emerald-50" : "bg-slate-50"}`}>
            <Users className={`h-5 w-5 ${agentsSurSite > 0 ? "text-emerald-600" : "text-slate-400"}`} />
          </div>
          <p className={`text-2xl font-black ${agentsSurSite > 0 ? "text-emerald-700" : "text-slate-400"}`}>{agentsSurSite}</p>
          <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-slate-400">Sur site maintenant</p>
        </div>
      </div>
    </div>
  );
}
