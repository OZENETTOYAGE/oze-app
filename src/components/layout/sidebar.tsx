"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Briefcase,
  ClipboardList,
  Clock,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database.types";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
};

const ALL_NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    roles: ["admin", "manager", "administratif", "agent"],
  },
  {
    href: "/chantiers",
    label: "Chantiers",
    icon: Building2,
    roles: ["admin", "manager", "administratif", "agent"],
  },
  {
    href: "/interventions",
    label: "Interventions",
    icon: ClipboardList,
    roles: ["admin", "manager", "agent"],
  },
  {
    href: "/pointage",
    label: "Pointage",
    icon: Clock,
    roles: ["admin", "manager", "agent"],
  },
  {
    href: "/clients",
    label: "Clients",
    icon: Users,
    roles: ["admin", "manager", "administratif"],
  },
  {
    href: "/finance",
    label: "Finance",
    icon: CreditCard,
    roles: ["admin", "administratif"],
  },
  {
    href: "/equipe",
    label: "Équipe",
    icon: Briefcase,
    roles: ["admin", "manager"],
  },
  {
    href: "/utilisateurs",
    label: "Utilisateurs",
    icon: Shield,
    roles: ["admin"],
  },
];

interface SidebarProps {
  role: UserRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = ALL_NAV.filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
      style={{
        background:
          "linear-gradient(180deg,#0a1228 0%,#1A2B5F 60%,#0f1e4a 100%)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "#F5C200" }}
        >
          <span
            className="text-lg font-black leading-none"
            style={{ fontFamily: "Georgia,serif", color: "#1A2B5F" }}
          >
            O
          </span>
        </div>
        {!collapsed && (
          <div>
            <p
              className="text-lg font-black leading-none"
              style={{ fontFamily: "Georgia,serif", color: "#F5C200" }}
            >
              OZÉ
            </p>
            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-white/25">
              Nettoyage & Services
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                collapsed ? "justify-center" : "",
                isActive
                  ? "text-[#F5C200]"
                  : "text-white/40 hover:text-white"
              )}
              style={
                isActive
                  ? { background: "rgba(245,194,0,0.1)" }
                  : undefined
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && isActive && (
                <span
                  className="ml-auto h-1.5 w-1.5 rounded-full"
                  style={{ background: "#F5C200" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="space-y-1 p-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-white/25 transition-all hover:bg-white/5 hover:text-white",
            collapsed ? "justify-center" : ""
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-semibold">Réduire</span>
            </>
          )}
        </button>
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-white/25 transition-all hover:bg-red-500/10 hover:text-red-300",
            collapsed ? "justify-center" : ""
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <span className="text-xs font-semibold">Déconnexion</span>
          )}
        </button>
      </div>
    </aside>
  );
}
