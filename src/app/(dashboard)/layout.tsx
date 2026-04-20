import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import type { UserRole } from "@/types/database.types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nom, prenom, role, avatar_url, actif")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (!profile.actif) redirect("/login?error=compte-desactive");

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar role={profile.role as UserRole} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          profile={{
            id: profile.id,
            nom: profile.nom,
            prenom: profile.prenom,
            role: profile.role,
            avatar_url: profile.avatar_url,
          }}
        />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
