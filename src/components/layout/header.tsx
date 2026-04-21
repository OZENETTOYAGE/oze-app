"use client";

import { useState } from "react";
import { Bell, Search } from "lucide-react";
import { initiales } from "@/lib/utils";

interface HeaderProps {
  profile: {
    id: string;
    nom: string;
    prenom: string;
    role: string;
    avatar_url: string | null;
  };
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  manager: "Manager",
  administratif: "Administratif",
  agent: "Agent",
};

export function Header({ profile }: HeaderProps) {
  const [search, setSearch] = useState("");
  const fullName = `${profile.prenom} ${profile.nom}`.trim();

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-100 bg-white px-6">
      <div className="relative max-w-sm flex-1">
        <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm placeholder:text-slate-400 focus:border-[#1A2B5F] focus:outline-none"
        />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-50">
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black"
            style={{ background: "#1A2B5F", color: "#F5C200" }}
          >
            {initiales(fullName)}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-bold text-slate-800">{fullName}</p>
            <p className="text-[10px] text-slate-400">
              {ROLE_LABELS[profile.role] ?? profile.role}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
