import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://wjskijzgvmwhhaecsper.supabase.co",
  "sb_publishable_WYuzThpt_8qYh3SjHD-Vdg_s1lYeivc"
);

/* ═══════════════════════════════════════════════════════════════════
   OZÉ NETTOYAGE — APPLICATION COMPLÈTE v3
   ✦ Connexion PIN multi-rôles
   ✦ Chantiers + Cahier des charges multilingue
   ✦ Pointage QR (caméra réelle) + PIN sécurisé
   ✦ Export Excel & PDF
   ✦ Notifications en temps réel
   ✦ Devis & Factures
═══════════════════════════════════════════════════════════════════ */

// ─── PERSISTANCE ─────────────────────────────────────────────────
const LS = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ─── UTILS ────────────────────────────────────────────────────────
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtFull = iso => iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDuree = (e, s) => { if (!e || !s) return null; const d = (new Date(s) - new Date(e)) / 60000; return `${Math.floor(d / 60)}h${String(Math.round(d % 60)).padStart(2, "0")}`; };
const dureeH = (e, s) => { if (!e || !s) return 0; return (new Date(s) - new Date(e)) / 3600000; };
const nowISO = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const today = () => new Date().toDateString();

// ─── COULEURS ─────────────────────────────────────────────────────
const NAVY = "#1A2B5F", GOLD = "#F5C200", DARK = "#0a1228";
const TYPE_COL = { "Nettoyage bureaux": "#1A2B5F", "Vitrerie": "#0ea5e9", "Nettoyage médical": "#7c3aed", "Entretien sols": "#10b981", "Post-chantier": "#ef4444", "Panneaux solaires": "#f59e0b", "Remise en état": "#6b7280" };
const ROLE_CFG = { administrateur: { label: "Administrateur", color: NAVY, bg: "#EEF1FA", icon: "👑" }, administratif: { label: "Administratif", color: "#7c3aed", bg: "#f3e8ff", icon: "📋" }, salarie: { label: "Salarié", color: "#059669", bg: "#d1fae5", icon: "👷" } };
const STATUT_DEVIS = { brouillon: { bg: "#f1f5f9", c: "#6b7280" }, envoyé: { bg: "#dbeafe", c: "#1d4ed8" }, accepté: { bg: "#dcfce7", c: "#15803d" }, refusé: { bg: "#fee2e2", c: "#b91c1c" }, facturé: { bg: "#fef9c3", c: "#92400e" } };

// ─── PERMISSIONS ──────────────────────────────────────────────────
const MENU_BY_ROLE = {
  administrateur: ["dashboard", "chantiers", "pointage_admin", "equipe", "clients", "devis", "factures", "rapports", "utilisateurs"],
  administratif: ["dashboard", "chantiers", "clients", "devis", "factures", "rapports"],
  salarie: ["dashboard", "pointage", "chantiers"],
};

// ─── DONNÉES INITIALES ────────────────────────────────────────────
const USERS_INIT = [
  { id: "U001", nom: "Tim Idalgo", role: "administrateur", pin: "1234", avatar: "TI", email: "tim@oze.fr", tel: "06 00 00 00 01", actif: true },
  { id: "U002", nom: "Sophie Martin", role: "administratif", pin: "2222", avatar: "SM", email: "sophie@oze.fr", tel: "06 00 00 00 02", actif: true },
  { id: "U003", nom: "Karim Bouazza", role: "salarie", pin: "3333", avatar: "KB", email: "karim@oze.fr", tel: "06 10 20 30 40", poste: "Agent Senior", actif: true },
  { id: "U004", nom: "Fatima Diallo", role: "salarie", pin: "4444", avatar: "FD", email: "fatima@oze.fr", tel: "06 20 30 40 50", poste: "Agente Polyvalente", actif: true },
  { id: "U005", nom: "Julien Moreau", role: "salarie", pin: "5555", avatar: "JM", email: "julien@oze.fr", tel: "06 30 40 50 60", poste: "Technicien Vitrerie", actif: true },
];
const CLIENTS_INIT = [
  { id: "C001", nom: "Nexity Immobilier", contact: "M. Dupont", tel: "04 72 00 11 22", email: "dupont@nexity.fr", adresse: "12 rue de la République, Lyon 2", tva: "FR12345678901" },
  { id: "C002", nom: "Groupe Serfim", contact: "Mme Leblanc", tel: "04 78 55 33 10", email: "leblanc@serfim.fr", adresse: "5 av. Tony Garnier, Lyon 7", tva: "FR98765432100" },
  { id: "C003", nom: "Clinique du Parc", contact: "Dr. Bernard", tel: "04 78 65 20 00", email: "direction@cliniqueduparc.fr", adresse: "155 bd Pinel, Bron", tva: "FR11223344556" },
  { id: "C004", nom: "Euronext Lyon", contact: "M. Martin", tel: "04 72 44 00 88", email: "martin@euronext.com", adresse: "30 rue Brest, Lyon 2", tva: "FR55667788990" },
];
const CHANTIERS_INIT = [
  { id: "OZE-001", nom: "Tour Oxygène", clientId: "C001", adresse: "10 rue Président Herriot, Lyon 3", type: "Nettoyage bureaux", responsableId: "U003", actif: true },
  { id: "OZE-002", nom: "Siège Serfim", clientId: "C002", adresse: "5 av. Tony Garnier, Lyon 7", type: "Vitrerie", responsableId: "U005", actif: true },
  { id: "OZE-003", nom: "Clinique du Parc – Bloc A", clientId: "C003", adresse: "155 bd Pinel, Bron", type: "Nettoyage médical", responsableId: "U004", actif: true },
];
const DEVIS_INIT = [
  { id: "DEV-001", clientId: "C001", chantierId: "OZE-001", date: "2026-04-10", validite: "2026-05-10", statut: "accepté", lignes: [{ desc: "Nettoyage bureaux (mensuel)", qte: 4, pu: 850, tva: 10 }, { desc: "Fournitures et produits", qte: 1, pu: 120, tva: 20 }], notes: "Contrat annuel reconductible", redacteurId: "U002" },
  { id: "DEV-002", clientId: "C002", chantierId: "OZE-002", date: "2026-04-15", validite: "2026-05-15", statut: "envoyé", lignes: [{ desc: "Nettoyage vitrerie extérieure", qte: 2, pu: 650, tva: 10 }], notes: "", redacteurId: "U002" },
  { id: "DEV-003", clientId: "C003", chantierId: "OZE-003", date: "2026-04-18", validite: "2026-05-18", statut: "brouillon", lignes: [{ desc: "Nettoyage médical quotidien", qte: 20, pu: 320, tva: 10 }, { desc: "Désinfection renforcée", qte: 4, pu: 200, tva: 10 }], notes: "Protocole ISO 22000", redacteurId: "U002" },
];

const LANG_OPTS = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "ar", label: "العربية", flag: "🇲🇦", rtl: true },
  { code: "pt", label: "Português", flag: "🇵🇹" },
];

const CDC_FR = `**Cahier des Charges — Prestation de Nettoyage**

**1. Périmètre d'intervention**
Nettoyage complet des espaces assignés, parties communes et sanitaires.

**2. Fréquences**
• Espaces de travail : quotidien (lundi–vendredi)
• Sanitaires : 2× par jour minimum
• Vitrages intérieurs : mensuel
• Remise en état approfondie : trimestriel

**3. Prestations incluses**
• Aspiration et lavage des sols (balayage, monobrosse)
• Dépoussiérage de toutes les surfaces accessibles
• Vidage des corbeilles avec tri sélectif obligatoire
• Nettoyage et désinfection complète des sanitaires
• Désinfection des points de contact (poignées, interrupteurs, claviers)
• Entretien des espaces de restauration et salles de pause
• Gestion des consommables (savon, essuie-mains, papier toilette)

**4. Produits & matériels**
Produits certifiés Ecolabel européen. Matériel fourni et entretenu par OZÉ Nettoyage. Fiches de données de sécurité disponibles sur demande.

**5. Personnel & encadrement**
Agents formés et habilités. Tenue OZÉ obligatoire. Responsable de secteur disponible 7j/7.

**6. Sécurité & confidentialité**
Port des EPI obligatoire. Accès restreint aux zones sensibles. Agents soumis à clause de confidentialité.

**7. Contrôle qualité**
Fiche de contrôle signée à chaque passage. Audit qualité mensuel. Accès client au tableau de bord OZÉ en temps réel.

**8. Signalement**
Tout incident ou anomalie constaté doit être signalé immédiatement via l'application OZÉ.`;

const CDC_TRANS = {
  en: `**Service Specification — Cleaning Services**\n\n**1. Scope**\nComplete cleaning of assigned spaces, common areas and restrooms.\n\n**2. Frequency**\n• Workspaces: daily (Mon–Fri)\n• Restrooms: 2× daily minimum\n• Interior glazing: monthly\n• Deep clean: quarterly\n\n**3. Services**\n• Vacuuming and mopping all floors\n• Dusting all accessible surfaces\n• Emptying bins with selective sorting\n• Full sanitisation of restrooms\n• Disinfection of contact points\n• Catering area maintenance\n• Consumables management\n\n**4. Products**\nEU Ecolabel certified products. Equipment provided by OZÉ Nettoyage.\n\n**5. Staff**\nTrained and certified agents. OZÉ uniform mandatory. Sector manager on call 7/7.\n\n**6. Safety**\nPPE mandatory. Restricted access to sensitive areas. Confidentiality agreement.\n\n**7. Quality Control**\nSigned inspection sheet each visit. Monthly quality audit. Real-time client dashboard access.\n\n**8. Reporting**\nAll incidents must be immediately reported via the OZÉ application.`,
  es: `**Pliego de Condiciones — Servicios de Limpieza**\n\n**1. Alcance**\nLimpieza completa de espacios asignados, áreas comunes y baños.\n\n**2. Frecuencia**\n• Espacios de trabajo: diario (lun–vie)\n• Baños: mínimo 2× al día\n• Vidrios interiores: mensual\n• Limpieza profunda: trimestral\n\n**3. Servicios**\n• Aspirado y fregado de suelos\n• Desempolvado de todas las superficies\n• Vaciado de papeleras con reciclaje\n• Desinfección completa de baños\n• Desinfección de puntos de contacto\n• Mantenimiento de zonas de restauración\n• Gestión de consumibles\n\n**4. Productos**\nProductos certificados Ecolabel europeo. Equipo proporcionado por OZÉ Nettoyage.\n\n**5. Personal**\nAgentes formados y habilitados. Uniforme OZÉ obligatorio.\n\n**6. Seguridad**\nEPI obligatorio. Acceso restringido a zonas sensibles. Acuerdo de confidencialidad.\n\n**7. Control de Calidad**\nFicha de inspección firmada en cada visita. Auditoría mensual. Acceso al panel OZÉ en tiempo real.\n\n**8. Informes**\nCualquier incidente debe ser notificado inmediatamente a través de la aplicación OZÉ.`,
  ar: `**مواصفات الخدمة — خدمات التنظيف**\n\n**1. النطاق**\nتنظيف شامل للمساحات المخصصة والمناطق المشتركة ودورات المياه.\n\n**2. التكرار**\n• أماكن العمل: يومياً (الاثنين–الجمعة)\n• دورات المياه: مرتين يومياً كحد أدنى\n• الزجاج الداخلي: شهرياً\n• تنظيف عميق: كل ثلاثة أشهر\n\n**3. الخدمات**\n• شفط الغبار وغسيل جميع الأرضيات\n• إزالة الغبار من جميع الأسطح المتاحة\n• إفراغ سلال المهملات مع الفرز الانتقائي\n• تعقيم كامل لدورات المياه\n• تطهير نقاط التلامس\n• صيانة مناطق تناول الطعام\n• إدارة المستهلكات\n\n**4. المنتجات**\nمنتجات معتمدة Ecolabel. المعدات توفرها OZÉ Nettoyage.\n\n**5. الموظفون**\nعملاء مدربون ومؤهلون. الزي الرسمي OZÉ إلزامي.\n\n**6. السلامة**\nمعدات الحماية إلزامية. وصول مقيد للمناطق الحساسة. اتفاقية سرية.\n\n**7. ضبط الجودة**\nبطاقة تفتيش موقعة في كل زيارة. تدقيق شهري. وصول العميل للوحة التحكم.\n\n**8. التقارير**\nيجب الإبلاغ عن أي حادث فوراً عبر تطبيق OZÉ.`,
  pt: `**Caderno de Encargos — Serviços de Limpeza**\n\n**1. Âmbito**\nLimpeza completa dos espaços atribuídos, áreas comuns e instalações sanitárias.\n\n**2. Frequência**\n• Espaços de trabalho: diário (seg–sex)\n• Sanitários: mínimo 2× por dia\n• Envidraçados interiores: mensal\n• Limpeza profunda: trimestral\n\n**3. Serviços**\n• Aspiração e lavagem de todos os pavimentos\n• Remoção de pó de todas as superfícies\n• Esvaziamento de caixotes com reciclagem\n• Desinfeção completa dos sanitários\n• Desinfeção de pontos de contacto\n• Manutenção de áreas de restauração\n• Gestão de consumíveis\n\n**4. Produtos**\nProdutos certificados Ecolabel europeu. Equipamento fornecido pela OZÉ Nettoyage.\n\n**5. Pessoal**\nAgentes formados e habilitados. Farda OZÉ obrigatória.\n\n**6. Segurança**\nEPI obrigatório. Acesso restrito a zonas sensíveis. Acordo de confidencialidade.\n\n**7. Controlo de Qualidade**\nFicha de inspeção assinada em cada visita. Auditoria mensal. Acesso ao painel OZÉ em tempo real.\n\n**8. Relatórios**\nQualquer incidente deve ser comunicado imediatamente através da aplicação OZÉ.`,
};

// ─── ICÔNES ───────────────────────────────────────────────────────
const paths = {
  dashboard: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  chantiers: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  equipe: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 7a4 4 0 100 8 M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  clients: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8",
  rapports: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8M16 17H8",
  utilisateurs: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  pointage: "M12 2a10 10 0 100 20A10 10 0 0012 2z M12 6v6l4 2",
  pointage_admin: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 3h6v4H9z M9 12h6M9 16h4",
  devis: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M12 18v-6M9 15h6",
  factures: "M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z",
  plus: "M12 5v14M5 12h14",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
  print: "M6 9V2h12v7 M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2 M6 14h12v8H6z",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z",
  trash: "M3 6h18 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6 M10 11v6M14 11v6 M9 6V4h6v2",
  doc: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8M16 17H8",
  globe: "M12 2a10 10 0 100 20A10 10 0 0012 2z M2 12h20 M12 2a15.3 15.3 0 010 20",
  lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z M7 11V7a5 5 0 0110 0v4",
  bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0",
  map: "M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z M12 13a3 3 0 100-6",
  trend: "M22 7l-8.5 8.5-5-5L2 17 M16 7h6v6",
  menu: "M3 6h18M3 12h18M3 18h18",
  save: "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z M17 21v-8H7v8 M7 3v5h8",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  send: "M22 2L11 13 M22 2L15 22l-4-9-9-4z",
  camera: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8",
  qr: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM17 14h3M17 17v3M14 20h3",
  euro: "M4 10h12M4 14h12M19 6a7 7 0 100 12",
  arrow: "M19 12H5M12 5l-7 7 7 7",
};
const Ico = ({ n, s = 18, color }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {(paths[n] || "").split(" M").map((p, i) => <path key={i} d={i === 0 ? p : "M" + p} />)}
  </svg>
);

// ─── COMPOSANTS UI ────────────────────────────────────────────────
const Card = ({ children, style: st = {}, onClick }) => (
  <div onClick={onClick} style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 14px rgba(26,43,95,0.07)", border: "1.5px solid #f1f5f9", cursor: onClick ? "pointer" : undefined, ...st }}>{children}</div>
);
const Btn = ({ onClick, children, v = "primary", size = "md", disabled, style: st = {}, title }) => {
  const vs = {
    primary: { background: `linear-gradient(135deg,${NAVY},#243570)`, color: GOLD, border: "none" },
    secondary: { background: "#fff", color: "#374151", border: "1.5px solid #e5e7eb" },
    danger: { background: "#fef2f2", color: "#b91c1c", border: "1.5px solid #fee2e2" },
    ghost: { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,.8)", border: "1px solid rgba(255,255,255,.15)" },
    gold: { background: `linear-gradient(135deg,${GOLD},#d97706)`, color: NAVY, border: "none" },
    green: { background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none" },
  };
  const sz = { sm: "7px 12px", md: "10px 18px", lg: "13px 26px" };
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: sz[size], borderRadius: 10, fontWeight: 700, fontSize: size === "sm" ? 11 : 13, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .45 : 1, fontFamily: "inherit", transition: "all .15s", ...vs[v], ...st }}>
      {children}
    </button>
  );
};
const Inp = ({ value, onChange, type = "text", placeholder, style: st = {}, min, step }) => (
  <input value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder} min={min} step={step}
    style={{ width: "100%", padding: "10px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 13, color: "#111827", background: "#f9fafb", outline: "none", boxSizing: "border-box", fontFamily: "inherit", ...st }} />
);
const Sel = ({ value, onChange, options, style: st = {} }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    style={{ width: "100%", padding: "10px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 13, color: "#111827", background: "#f9fafb", outline: "none", boxSizing: "border-box", fontFamily: "inherit", ...st }}>
    {options.map(o => typeof o === "string" ? <option key={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>)}
  </select>
);
const FRow = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{label}</label>
    {children}
  </div>
);
const Modal = ({ title, subtitle, onClose, children, width = "480px" }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(5,10,30,.65)", backdropFilter: "blur(6px)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div style={{ background: "#fff", borderRadius: 20, width: `min(${width},96vw)`, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 30px 80px rgba(26,43,95,.3)", animation: "popIn .2s cubic-bezier(.34,1.56,.64,1)" }}>
      <div style={{ background: `linear-gradient(135deg,${NAVY},#243570)`, padding: "20px 24px", borderRadius: "20px 20px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 1 }}>
        <div>
          {subtitle && <div style={{ color: GOLD, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 3 }}>{subtitle}</div>}
          <div style={{ color: "#fff", fontSize: 17, fontWeight: 800, fontFamily: "'Playfair Display',serif" }}>{title}</div>
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,.1)", border: "none", borderRadius: 8, padding: 7, cursor: "pointer", color: "#fff", display: "flex" }}><Ico n="x" /></button>
      </div>
      <div style={{ padding: "22px 24px" }}>{children}</div>
    </div>
  </div>
);
const StatBadge = ({ s }) => {
  const m = { planifié: { bg: "#dbeafe", c: "#1d4ed8" }, terminé: { bg: "#dcfce7", c: "#15803d" }, annulé: { bg: "#fee2e2", c: "#b91c1c" }, "en cours": { bg: "#fef9c3", c: "#92400e" } };
  const v = m[s] || m.planifié;
  return <span style={{ background: v.bg, color: v.c, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{s}</span>;
};
const BadgeRole = ({ role }) => {
  const c = ROLE_CFG[role] || ROLE_CFG.salarie;
  return <span style={{ background: c.bg, color: c.color, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{c.icon} {c.label}</span>;
};

// ─── CALCULS DEVIS ────────────────────────────────────────────────
const calcDevis = (lignes) => {
  const ht = lignes.reduce((s, l) => s + l.qte * l.pu, 0);
  const tva = lignes.reduce((s, l) => s + l.qte * l.pu * l.tva / 100, 0);
  return { ht, tva, ttc: ht + tva };
};
const fmtEur = n => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

// ─── QR CANVAS ────────────────────────────────────────────────────
// ─── GÉNÉRATEUR QR CODE PURE JS (sans API externe) ───────────────
// Implémentation QR Code version 3 (29x29) — alphanumeric + byte mode
const QR = (() => {
  // Tables GF(256)
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (() => { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x = x < 128 ? x * 2 : (x * 2) ^ 285; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  const mul = (a, b) => a && b ? EXP[LOG[a] + LOG[b]] : 0;
  const polyMul = (p, q) => { const r = new Uint8Array(p.length + q.length - 1); for (let i = 0; i < p.length; i++) for (let j = 0; j < q.length; j++) r[i + j] ^= mul(p[i], q[j]); return r; };
  const genPoly = n => { let p = [1]; for (let i = 0; i < n; i++) p = polyMul(p, [1, EXP[i]]); return p; };
  const ecBytes = (data, n) => { const gen = genPoly(n); let r = Array.from(data); for (let i = 0; i < n; i++) r.push(0); for (let i = 0; i < data.length; i++) { const c = r[i]; if (c) for (let j = 0; j < gen.length; j++) r[i + j] ^= mul(gen[j], c); } return r.slice(data.length); };

  // Encode bytes
  const encode = (str) => {
    const bytes = Array.from(new TextEncoder().encode(str));
    const bits = [];
    const push = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };
    // Mode byte=4, char count for V3=8 bits
    push(4, 4); push(bytes.length, 8);
    bytes.forEach(b => push(b, 8));
    // Terminator + pad
    push(0, 4);
    while (bits.length % 8) bits.push(0);
    const pads = [236, 17]; let pi = 0;
    // V3-M capacity = 28 data codewords
    while (bits.length < 28 * 8) { for (let i = 0; i < 8; i++) bits.push((pads[pi] >> (7 - i)) & 1); pi ^= 1; }
    // Pack to bytes
    const data = [];
    for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i + j] || 0); data.push(b); }
    return data.slice(0, 28);
  };

  // V3-M: 29x29, 22 EC bytes
  const generate = (text) => {
    const data = encode(text);
    const ec = ecBytes(data, 22);
    const all = [...data, ...ec];
    const N = 29;
    const mat = Array.from({ length: N }, () => new Array(N).fill(-1)); // -1=empty, 0=white, 1=black
    const fn = Array.from({ length: N }, () => new Array(N).fill(false));

    const setFn = (r, c, v) => { if (r >= 0 && r < N && c >= 0 && c < N) { mat[r][c] = v ? 1 : 0; fn[r][c] = true; } };

    // Finder patterns
    const finder = (r, c) => {
      for (let dr = -1; dr <= 7; dr++) for (let dc = -1; dc <= 7; dc++) {
        const ir = r + dr, ic = c + dc;
        if (ir < 0 || ir >= N || ic < 0 || ic >= N) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onEdge = (dr === 0 || dr === 6 || dc === 0 || dc === 6);
        const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFn(ir, ic, inOuter && (onEdge || inInner) ? 1 : 0);
      }
    };
    finder(0, 0); finder(0, N - 7); finder(N - 7, 0);

    // Timing
    for (let i = 8; i < N - 8; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }

    // Alignment (V3: one at row=20,col=20)
    const apos = [20];
    for (const ar of apos) for (const ac of apos) {
      if (fn[ar][ac]) continue;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
        setFn(ar + dr, ac + dc, Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0));
      }
    }

    // Dark module
    setFn(N - 8, 8, 1);

    // Format bits (mask 0, ECL M = 0b101 -> format=0b101000 xor mask)
    // Precomputed format string for ECL=M, mask=2 (checkerboard (r+c)%2)
    const fmt = [1,1,0,1,0,0,0,0,1,0,0,1,0,1,0];
    [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]].forEach(([r,c],i)=>setFn(r,c,fmt[i]));
    [[N-1,8],[N-2,8],[N-3,8],[N-4,8],[N-5,8],[N-6,8],[N-7,8],[8,N-8],[8,N-7],[8,N-6],[8,N-5],[8,N-4],[8,N-3],[8,N-2],[8,N-1]].forEach(([r,c],i)=>setFn(r,c,fmt[i]));

    // Data placement
    let bi = 0;
    const bits = all.flatMap(b => Array.from({length:8},(_,i)=>(b>>(7-i))&1));
    const mask = (r,c) => (r+c)%2===0;
    for (let right = N - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < N; vert++) {
        for (let j = 0; j < 2; j++) {
          const c = right - j, r = ((right + 1) & 2) ? N - 1 - vert : vert;
          if (fn[r][c]) continue;
          const bit = bi < bits.length ? bits[bi++] : 0;
          mat[r][c] = bit ^ (mask(r, c) ? 1 : 0);
        }
      }
    }
    return mat;
  };
  return { generate };
})();

const QRCanvas = ({ data, size = 160, id }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    let mat;
    try { mat = QR.generate(data); } catch { mat = null; }
    const cv = ref.current, ctx = cv.getContext("2d");
    cv.width = size; cv.height = size;
    ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, size, size);
    if (!mat) {
      ctx.fillStyle = NAVY; ctx.font = `bold ${size*.07}px monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("QR", size/2, size/2);
      return;
    }
    const N = mat.length, margin = Math.round(size * 0.06);
    const cellSize = (size - margin * 2) / N;
    ctx.fillStyle = NAVY;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (mat[r][c] === 1) ctx.fillRect(margin + c * cellSize, margin + r * cellSize, cellSize, cellSize);
    }
  }, [data, size]);
  return <canvas ref={ref} id={id} style={{ borderRadius: 6, display: "block" }} />;
};

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════
function useNotifications() {
  const [notifs, setNotifs] = useState(() => LS.get("oze_notifs", []));
  const push = useCallback((type, title, message, icon = "bell") => {
    const n = { id: Date.now(), type, title, message, icon, date: nowISO(), read: false };
    setNotifs(prev => { const u = [n, ...prev].slice(0, 50); LS.set("oze_notifs", u); return u; });
  }, []);
  const markRead = useCallback((id) => setNotifs(prev => { const u = prev.map(n => n.id === id ? { ...n, read: true } : n); LS.set("oze_notifs", u); return u; }), []);
  const markAllRead = useCallback(() => setNotifs(prev => { const u = prev.map(n => ({ ...n, read: true })); LS.set("oze_notifs", u); return u; }), []);
  const unread = notifs.filter(n => !n.read).length;
  return { notifs, push, markRead, markAllRead, unread };
}

function NotifPanel({ notifs, markRead, markAllRead, onClose }) {
  const icons = { pointage: "pointage", devis: "devis", chantier: "chantiers", alerte: "bell", facture: "factures" };
  return (
    <div style={{ position: "fixed", top: 58, right: 16, width: 340, maxHeight: 480, background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(26,43,95,.2)", border: "1.5px solid #f1f5f9", zIndex: 500, display: "flex", flexDirection: "column", animation: "popIn .15s ease" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, color: NAVY, fontSize: 14 }}>Notifications</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={markAllRead} style={{ fontSize: 11, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Tout lire</button>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex" }}><Ico n="x" s={16} /></button>
        </div>
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {notifs.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Aucune notification</div>}
        {notifs.slice(0, 20).map(n => (
          <div key={n.id} onClick={() => markRead(n.id)} style={{ padding: "12px 18px", borderBottom: "1px solid #f9fafb", display: "flex", gap: 12, cursor: "pointer", background: n.read ? "#fff" : "#f8faff", transition: "background .15s" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: n.read ? "#f1f5f9" : "#EEF1FA", display: "flex", alignItems: "center", justifyContent: "center", color: n.read ? "#9ca3af" : NAVY, flexShrink: 0 }}><Ico n={icons[n.icon] || "bell"} s={16} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: n.read ? 600 : 800, fontSize: 13, color: "#111827" }}>{n.title}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{n.message}</div>
              <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>{fmtFull(n.date)}</div>
            </div>
            {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD, flexShrink: 0, marginTop: 4 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT EXCEL & PDF
// ═══════════════════════════════════════════════════════════════════
function exportPointagesExcel(pointages, users, chantiers) {
  const rows = pointages.map(p => ({
    "ID": p.id,
    "Agent": p.nomAgent,
    "Chantier": p.nomChantier,
    "Date": fmtDate(p.entree),
    "Heure arrivée": fmtTime(p.entree),
    "Heure départ": fmtTime(p.sortie),
    "Durée": fmtDuree(p.entree, p.sortie) || "En cours",
    "Statut": p.sortie ? "Complet" : "En cours",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pointages");
  XLSX.writeFile(wb, `OZE_Pointages_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.xlsx`);
}

function exportDevisExcel(devis, clients, chantiers) {
  const rows = devis.map(d => {
    const client = clients.find(c => c.id === d.clientId) || {};
    const chantier = chantiers.find(c => c.id === d.chantierId) || {};
    const { ht, tva, ttc } = calcDevis(d.lignes);
    return {
      "Référence": d.id,
      "Client": client.nom || "",
      "Chantier": chantier.nom || "",
      "Date": d.date,
      "Validité": d.validite,
      "Statut": d.statut,
      "HT (€)": ht.toFixed(2),
      "TVA (€)": tva.toFixed(2),
      "TTC (€)": ttc.toFixed(2),
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 12 }, { wch: 24 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Devis");
  XLSX.writeFile(wb, `OZE_Devis_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.xlsx`);
}

function printDocHTML(html, title) {
  const w = window.open("", "_blank");
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#fff;color:#111}
    @media print{body{-webkit-print-color-adjust:exact;color-adjust:exact}}
  </style></head><body>${html}</body></html>`);
  w.document.close(); setTimeout(() => { w.print(); }, 600);
}

function genDevisPDF(devis, clients, chantiers, users) {
  const client = clients.find(c => c.id === devis.clientId) || {};
  const chantier = chantiers.find(c => c.id === devis.chantierId) || {};
  const red = users.find(u => u.id === devis.redacteurId) || {};
  const { ht, tva, ttc } = calcDevis(devis.lignes);
  const html = `
  <div style="max-width:720px;margin:0 auto;padding:40px;font-family:'DM Sans',sans-serif">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px">
      <div>
        <div style="font-family:'Playfair Display',serif;font-size:36px;font-weight:900;color:${NAVY}">OZÉ</div>
        <div style="font-size:10px;letter-spacing:.12em;color:#9ca3af;font-weight:700">NETTOYAGE & SERVICES</div>
        <div style="font-size:12px;color:#6b7280;margin-top:8px">12 allée des Entrepreneurs, Lyon<br>contact@oze-nettoyage.fr · 04 72 00 00 00</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:28px;font-weight:900;color:${NAVY}">${devis.id}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">Date : ${devis.date}<br>Validité : ${devis.validite}</div>
        <div style="background:${STATUT_DEVIS[devis.statut]?.bg||"#f1f5f9"};color:${STATUT_DEVIS[devis.statut]?.c||"#6b7280"};padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;display:inline-block;margin-top:8px">${devis.statut.toUpperCase()}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:36px">
      <div style="background:#f8fafc;border-radius:12px;padding:18px">
        <div style="font-size:10px;font-weight:800;color:#9ca3af;letter-spacing:.08em;margin-bottom:8px">DESTINATAIRE</div>
        <div style="font-weight:800;font-size:16px;color:${NAVY};margin-bottom:4px">${client.nom}</div>
        <div style="font-size:12px;color:#6b7280">${client.contact || ""}<br>${client.adresse || ""}<br>${client.email || ""}<br>TVA : ${client.tva || ""}</div>
      </div>
      <div style="background:#f8fafc;border-radius:12px;padding:18px">
        <div style="font-size:10px;font-weight:800;color:#9ca3af;letter-spacing:.08em;margin-bottom:8px">CHANTIER</div>
        <div style="font-weight:800;font-size:15px;color:${NAVY};margin-bottom:4px">${chantier.nom}</div>
        <div style="font-size:12px;color:#6b7280">${chantier.adresse || ""}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:6px">Rédigé par : ${red.nom || ""}</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
      <thead><tr style="background:${NAVY}">
        <th style="padding:12px 14px;text-align:left;color:#fff;font-size:11px;letter-spacing:.06em">DÉSIGNATION</th>
        <th style="padding:12px 14px;text-align:center;color:#fff;font-size:11px">QTÉ</th>
        <th style="padding:12px 14px;text-align:right;color:#fff;font-size:11px">PU HT</th>
        <th style="padding:12px 14px;text-align:center;color:#fff;font-size:11px">TVA</th>
        <th style="padding:12px 14px;text-align:right;color:#fff;font-size:11px">TOTAL HT</th>
      </tr></thead>
      <tbody>
        ${devis.lignes.map((l, i) => `<tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"};border-bottom:1px solid #f1f5f9">
          <td style="padding:12px 14px;font-size:13px;font-weight:600;color:#111">${l.desc}</td>
          <td style="padding:12px 14px;text-align:center;font-size:13px;color:#374151">${l.qte}</td>
          <td style="padding:12px 14px;text-align:right;font-size:13px;color:#374151">${fmtEur(l.pu)}</td>
          <td style="padding:12px 14px;text-align:center;font-size:13px;color:#374151">${l.tva}%</td>
          <td style="padding:12px 14px;text-align:right;font-size:13px;font-weight:700;color:${NAVY}">${fmtEur(l.qte * l.pu)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;margin-bottom:32px">
      <div style="width:280px">
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#6b7280"><span>Total HT</span><span style="font-weight:700">${fmtEur(ht)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#6b7280"><span>TVA</span><span style="font-weight:700">${fmtEur(tva)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:12px 0;font-size:16px;font-weight:900;color:${NAVY}"><span>Total TTC</span><span>${fmtEur(ttc)}</span></div>
      </div>
    </div>
    ${devis.notes ? `<div style="background:#f8fafc;border-radius:10px;padding:14px 18px;font-size:12px;color:#6b7280;margin-bottom:28px"><strong>Notes :</strong> ${devis.notes}</div>` : ""}
    <div style="border-top:2px solid #f1f5f9;padding-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <div style="font-size:11px;color:#9ca3af">OZÉ Nettoyage SAS · SIRET 123 456 789 00012 · TVA FR12345678901<br>RCS Lyon B 123 456 789 · APE 8121Z</div>
      <div style="text-align:right">
        <div style="font-size:11px;color:#9ca3af;margin-bottom:8px">Signature & cachet client :</div>
        <div style="border:1.5px solid #e5e7eb;border-radius:8px;height:60px;width:180px;margin-left:auto"></div>
      </div>
    </div>
  </div>`;
  printDocHTML(html, `${devis.id} — ${client.nom}`);
}

// ═══════════════════════════════════════════════════════════════════
// SCAN QR CAMÉRA
// ═══════════════════════════════════════════════════════════════════
function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("starting");
  const [manualInput, setManualInput] = useState("");
  const intervalRef = useRef(null);

  useEffect(() => {
    let active = true;
    const startCam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); setStatus("scanning"); }
        intervalRef.current = setInterval(tick, 400);
      } catch {
        setStatus("no-camera");
      }
    };
    startCam();
    return () => { active = false; clearInterval(intervalRef.current); streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const tick = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current; const c = canvasRef.current;
    if (v.readyState < 2) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    // BarcodeDetector API (Chrome/Edge)
    if ("BarcodeDetector" in window) {
      new window.BarcodeDetector({ formats: ["qr_code"] }).detect(c).then(codes => {
        if (codes.length > 0) { clearInterval(intervalRef.current); onScan(codes[0].rawValue); }
      }).catch(() => {});
    }
  };

  const handleManual = () => { if (manualInput.trim()) onScan(manualInput.trim()); };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(5,10,30,.9)", backdropFilter: "blur(8px)", zIndex: 700, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "min(380px,96vw)", animation: "popIn .2s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ color: GOLD, fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 20 }}>Scanner QR Code</div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.1)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: "#fff", display: "flex" }}><Ico n="x" /></button>
        </div>

        {status === "scanning" && (
          <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", marginBottom: 16, background: "#000" }}>
            <video ref={videoRef} muted playsInline style={{ width: "100%", display: "block", borderRadius: 16 }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            {/* Viewfinder */}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ width: 200, height: 200, position: "relative" }}>
                {[["0,0", "0,0"], ["0,auto", "0,0"], ["auto,0", "0,0"], ["auto,auto", "0,0"]].map(([tb, lr], i) => {
                  const [t, b] = tb.split(","); const [l, r] = lr.split(",");
                  const isTop = b === "auto"; const isLeft = r === "auto";
                  return <div key={i} style={{ position: "absolute", ...(isTop ? { top: 0 } : { bottom: 0 }), ...(isLeft ? { left: 0 } : { right: 0 }), width: 28, height: 28, borderTop: isTop ? `3px solid ${GOLD}` : "none", borderBottom: !isTop ? `3px solid ${GOLD}` : "none", borderLeft: isLeft ? `3px solid ${GOLD}` : "none", borderRight: !isLeft ? `3px solid ${GOLD}` : "none", borderRadius: isTop && isLeft ? "8px 0 0 0" : isTop ? "0 8px 0 0" : isLeft ? "0 0 0 8px" : "0 0 8px 0" }} />;
                })}
                <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${GOLD},transparent)`, animation: "scanLine 2s ease-in-out infinite" }} />
              </div>
            </div>
            <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center" }}>
              <span style={{ background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 12, fontWeight: 600, padding: "4px 14px", borderRadius: 20 }}>Pointez vers le QR Code</span>
            </div>
          </div>
        )}
        {status === "starting" && (
          <div style={{ height: 240, borderRadius: 16, background: "rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, color: "#fff" }}>Démarrage caméra…</div>
        )}
        {status === "no-camera" && (
          <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 12, padding: "16px 20px", marginBottom: 16, color: "#fca5a5", fontSize: 13, textAlign: "center" }}>
            Caméra non disponible ou accès refusé.<br />Utilisez la saisie manuelle ci-dessous.
          </div>
        )}

        <div style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: 16 }}>
          <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 10, textAlign: "center" }}>OU SAISIE MANUELLE</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={manualInput} onChange={e => setManualInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleManual()} placeholder="ID chantier (ex: OZE-001)" style={{ flex: 1, padding: "10px 12px", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 9, color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
            <Btn onClick={handleManual} v="gold" style={{ flexShrink: 0 }}>OK</Btn>
          </div>
        </div>
      </div>
      <style>{`@keyframes scanLine{0%,100%{top:10%}50%{top:88%}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LOGIN — 2 étapes : sélection utilisateur → PIN personnel
// ═══════════════════════════════════════════════════════════════════
function Login({ users, onLogin }) {
  const [step, setStep] = useState("select"); // "select" | "pin"
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const activeUsers = users.filter(u => u.actif);
  const filtered = search.trim()
    ? activeUsers.filter(u => u.nom.toLowerCase().includes(search.toLowerCase()))
    : activeUsers;

  // Grouper par rôle pour l'affichage
  const grouped = [
    { role: "administrateur", label: "Direction", users: filtered.filter(u => u.role === "administrateur") },
    { role: "administratif",  label: "Administratif", users: filtered.filter(u => u.role === "administratif") },
    { role: "salarie",        label: "Équipe terrain", users: filtered.filter(u => u.role === "salarie") },
  ].filter(g => g.users.length > 0);

  const selectUser = (u) => {
    setSelectedUser(u);
    setPin("");
    setErr("");
    setStep("pin");
  };

  useEffect(() => {
    if (pin.length < 4) return;
    setLoading(true);
    setTimeout(() => {
      if (selectedUser && pin === selectedUser.pin) {
        onLogin(selectedUser);
      } else {
        setErr("PIN incorrect. Réessayez.");
        setPin("");
      }
      setLoading(false);
    }, 350);
  }, [pin]);

  const BG = (
    <div style={{ position: "fixed", inset: 0, background: `linear-gradient(160deg,${DARK} 0%,${NAVY} 50%,${DARK} 100%)`, zIndex: -1 }}>
      <div style={{ position: "absolute", top: -120, right: -80, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle,rgba(245,194,0,.07),transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -80, left: -60, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(245,194,0,.04),transparent 70%)" }} />
    </div>
  );

  const Logo = () => (
    <div style={{ textAlign: "center", marginBottom: 28 }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg,${GOLD},#d97706)`, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 12px 40px rgba(245,194,0,.3)` }}>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 900, color: NAVY }}>O</span>
      </div>
      <div style={{ fontFamily: "'Playfair Display',serif", color: GOLD, fontSize: 32, fontWeight: 900 }}>OZÉ</div>
      <div style={{ color: "rgba(255,255,255,.3)", fontSize: 10, letterSpacing: "0.15em", fontWeight: 700, marginTop: 3 }}>NETTOYAGE & SERVICES</div>
    </div>
  );

  // ── ÉTAPE 1 : choisir son nom ────────────────────────────────────
  if (step === "select") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
        {BG}
        <div style={{ width: "min(440px,100%)", animation: "fadeUp .4s ease" }}>
          <Logo />
          <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "24px 24px 20px" }}>
            <div style={{ color: "#fff", fontSize: 17, fontWeight: 800, fontFamily: "'Playfair Display',serif", marginBottom: 4 }}>Qui êtes-vous ?</div>
            <div style={{ color: "rgba(255,255,255,.4)", fontSize: 13, marginBottom: 18 }}>Sélectionnez votre nom pour accéder à votre espace</div>

            {/* Recherche si beaucoup d'utilisateurs */}
            {activeUsers.length > 6 && (
              <div style={{ marginBottom: 14 }}>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher votre nom…"
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
            )}

            <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {grouped.map(g => (
                <div key={g.role}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,.3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 7, paddingLeft: 2 }}>
                    {ROLE_CFG[g.role]?.icon} {g.label}
                  </div>
                  {g.users.map(u => (
                    <button key={u.id} onClick={() => selectUser(u)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 13, padding: "12px 14px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, cursor: "pointer", marginBottom: 7, textAlign: "left", fontFamily: "inherit", transition: "all .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,194,0,.1)"; e.currentTarget.style.borderColor = "rgba(245,194,0,.3)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.08)"; }}>
                      {/* Avatar */}
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg,rgba(245,194,0,.2),rgba(245,194,0,.05))`, border: "2px solid rgba(245,194,0,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: GOLD, flexShrink: 0 }}>
                        {u.avatar}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.nom}</div>
                        <div style={{ color: "rgba(255,255,255,.35)", fontSize: 11, marginTop: 1 }}>{u.poste || ROLE_CFG[u.role]?.label}</div>
                      </div>
                      <div style={{ color: "rgba(255,255,255,.25)", flexShrink: 0 }}>
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ color: "rgba(255,255,255,.3)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Aucun utilisateur trouvé</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ÉTAPE 2 : saisir son PIN ─────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
      {BG}
      <div style={{ width: "min(380px,100%)", animation: "fadeUp .3s ease" }}>
        <Logo />

        {/* Carte utilisateur sélectionné */}
        <div style={{ background: "rgba(245,194,0,.08)", border: "1.5px solid rgba(245,194,0,.2)", borderRadius: 14, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: `linear-gradient(135deg,${GOLD},#d97706)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: NAVY, flexShrink: 0 }}>
            {selectedUser?.avatar}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{selectedUser?.nom}</div>
            <div style={{ color: "rgba(255,255,255,.45)", fontSize: 12, marginTop: 1 }}>
              {selectedUser?.poste || ROLE_CFG[selectedUser?.role]?.label}
            </div>
          </div>
          <button onClick={() => { setStep("select"); setPin(""); setErr(""); }}
            style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "rgba(255,255,255,.6)", fontSize: 11, fontWeight: 700, fontFamily: "inherit", transition: "all .15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.14)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.08)"}>
            Changer
          </button>
        </div>

        {/* Pavé PIN */}
        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "24px 24px 20px" }}>
          <div style={{ color: "#fff", fontSize: 16, fontWeight: 800, fontFamily: "'Playfair Display',serif", marginBottom: 4 }}>
            🔒 Votre code PIN
          </div>
          <div style={{ color: "rgba(255,255,255,.4)", fontSize: 13, marginBottom: 22 }}>
            Saisissez votre code PIN personnel à 4 chiffres
          </div>

          {/* Indicateurs */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 22 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ width: 52, height: 52, borderRadius: 13, border: `2px solid ${pin.length > i ? GOLD : "rgba(255,255,255,.12)"}`, background: pin.length > i ? "rgba(245,194,0,.1)" : "rgba(255,255,255,.03)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}>
                {pin.length > i && <div style={{ width: 14, height: 14, borderRadius: "50%", background: GOLD, boxShadow: `0 0 8px ${GOLD}` }} />}
              </div>
            ))}
          </div>

          {/* Clavier */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k, i) => (
              <button key={i}
                onClick={() => {
                  if (k === "⌫") { setErr(""); setPin(p => p.slice(0, -1)); }
                  else if (k !== "" && pin.length < 4) { setErr(""); setPin(p => p + k); }
                }}
                style={{ padding: "14px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: k === "" ? "transparent" : "rgba(255,255,255,.06)", color: "#fff", fontSize: 18, fontWeight: 700, cursor: k === "" ? "default" : "pointer", visibility: k === "" ? "hidden" : "visible", fontFamily: "inherit", transition: "background .1s" }}
                onMouseEnter={e => { if (k !== "") e.currentTarget.style.background = "rgba(245,194,0,.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = k === "" ? "transparent" : "rgba(255,255,255,.06)"; }}>
                {k}
              </button>
            ))}
          </div>

          {err && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#fca5a5", fontSize: 12, textAlign: "center", marginTop: 12, fontWeight: 600 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {err}
            </div>
          )}
          {loading && <div style={{ color: GOLD, fontSize: 12, textAlign: "center", marginTop: 12 }}>Vérification…</div>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PAGE DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function PageDashboard({ user, chantiers, users, pointages, devis }) {
  const todayStr = today();
  const ptAujourd = pointages.filter(p => new Date(p.entree).toDateString() === todayStr);
  const enCours = ptAujourd.filter(p => !p.sortie).length;
  const moisTtc = devis.filter(d => d.statut === "facturé").reduce((s, d) => s + calcDevis(d.lignes).ttc, 0);
  const devisEnAttente = devis.filter(d => d.statut === "envoyé").length;
  const statCards = user.role !== "salarie" ? [
    { l: "Chantiers actifs", v: chantiers.filter(c => c.actif).length, c: NAVY, bg: "#EEF1FA", icon: "chantiers" },
    { l: "Agents sur site", v: enCours, c: "#10b981", bg: "#dcfce7", icon: "equipe" },
    { l: "Pointages aujourd'hui", v: ptAujourd.length, c: "#f59e0b", bg: "#fef9c3", icon: "pointage" },
    { l: "Devis en attente", v: devisEnAttente, c: "#7c3aed", bg: "#f3e8ff", icon: "devis" },
  ] : [
    { l: "Mes pointages", v: pointages.filter(p => p.agentId === user.id).length, c: NAVY, bg: "#EEF1FA", icon: "pointage" },
    { l: "Aujourd'hui", v: ptAujourd.filter(p => p.agentId === user.id).length, c: "#10b981", bg: "#dcfce7", icon: "check" },
  ];

  const recentPt = [...pointages].sort((a, b) => new Date(b.entree) - new Date(a.entree)).filter(p => user.role === "salarie" ? p.agentId === user.id : true).slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>OZÉ Nettoyage</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", fontFamily: "'Playfair Display',serif", margin: 0 }}>
          {ROLE_CFG[user.role]?.icon} Bonjour, {user.nom.split(" ")[0]}
        </h1>
        <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 24 }}>
        {statCards.map(s => (
          <Card key={s.l} style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", color: s.c, flexShrink: 0 }}><Ico n={s.icon} s={20} /></div>
            <div><div style={{ fontSize: 28, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.v}</div><div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginTop: 3 }}>{s.l}</div></div>
          </Card>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: NAVY, marginBottom: 14 }}>Pointages récents</div>
          {recentPt.length === 0 && <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "16px 0" }}>Aucun pointage</div>}
          {recentPt.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
              <div><div style={{ fontWeight: 700, color: "#111827" }}>{user.role === "salarie" ? p.nomChantier : p.nomAgent}</div><div style={{ fontSize: 11, color: "#9ca3af" }}>{fmtDate(p.entree)}</div></div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: "#10b981", fontWeight: 700 }}>▲{fmtTime(p.entree)}</span>
                {p.sortie && <span style={{ color: "#f59e0b", fontWeight: 700 }}>▼{fmtTime(p.sortie)}</span>}
                {p.sortie && <span style={{ background: "#dcfce7", color: "#15803d", padding: "1px 7px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{fmtDuree(p.entree, p.sortie)}</span>}
              </div>
            </div>
          ))}
        </Card>
        {user.role !== "salarie" && (
          <Card style={{ padding: "20px 22px" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: NAVY, marginBottom: 14 }}>Devis récents</div>
            {devis.slice(0, 5).map(d => {
              const client = CLIENTS_INIT.find(c => c.id === d.clientId) || {};
              const { ttc } = calcDevis(d.lignes);
              const sc = STATUT_DEVIS[d.statut] || {};
              return (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
                  <div><div style={{ fontWeight: 700, color: "#111827" }}>{client.nom}</div><div style={{ fontSize: 11, color: "#9ca3af" }}>{d.id} · {d.date}</div></div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: NAVY }}>{fmtEur(ttc)}</span>
                    <span style={{ background: sc.bg, color: sc.c, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{d.statut}</span>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PAGE CHANTIERS
// ═══════════════════════════════════════════════════════════════════
function PageChantiers({ user, chantiers, setChantiers, clients, users, pointages, push }) {
  const [selCDC, setSelCDC] = useState(null);
  const [selQR, setSelQR] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: "", clientId: "", adresse: "", type: "Nettoyage bureaux", responsableId: "", actif: true });
  const canEdit = user.role === "administrateur";
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveChantier = () => {
    const nc = { ...form, id: "OZE-" + uid() };
    const u = [nc, ...chantiers]; setChantiers(u); LS.set("oze_chantiers", u);
    push("chantier", "Nouveau chantier", `${nc.nom} créé avec succès`, "chantier");
    setShowForm(false); setForm({ nom: "", clientId: "", adresse: "", type: "Nettoyage bureaux", responsableId: "", actif: true });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div><div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Gestion</div><h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", fontFamily: "'Playfair Display',serif", margin: 0 }}>Chantiers</h2></div>
        {canEdit && <Btn onClick={() => setShowForm(true)}><Ico n="plus" s={15} /> Nouveau chantier</Btn>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
        {chantiers.map(c => {
          const client = clients.find(x => x.id === c.clientId) || { nom: "—" };
          const resp = users.find(x => x.id === c.responsableId) || { nom: "—" };
          return (
            <Card key={c.id}>
              <div style={{ background: `linear-gradient(135deg,${NAVY},#243570)`, padding: "14px 16px", borderRadius: "14px 14px 0 0", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ color: GOLD, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 3 }}>{c.id}</div>
                  <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{c.nom}</div>
                  <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11, marginTop: 2 }}>{client.nom}</div>
                </div>
                <span style={{ background: "rgba(255,255,255,.1)", borderRadius: 8, padding: "4px 10px", fontSize: 10, color: "rgba(255,255,255,.7)", fontWeight: 700, alignSelf: "flex-start", whiteSpace: "nowrap", marginTop: 2 }}>{c.type}</span>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>📍 {c.adresse}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>👤 {resp.nom}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
                  <Btn onClick={() => setSelCDC(c)} size="sm" v="secondary"><Ico n="doc" s={13} /> CDC</Btn>
                  <Btn onClick={() => setSelQR(c)} size="sm" v="secondary"><Ico n="qr" s={13} /> QR</Btn>
                  {canEdit && <Btn onClick={() => { const u = chantiers.filter(x => x.id !== c.id); setChantiers(u); LS.set("oze_chantiers", u); }} size="sm" v="danger"><Ico n="trash" s={13} /></Btn>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* CDC MODAL */}
      {selCDC && <ModalCDC chantier={selCDC} onClose={() => setSelCDC(null)} />}

      {/* QR MODAL */}
      {selQR && (() => {
        const qrRef = { current: null };
        const clientNom = (clients.find(c => c.id === selQR.clientId) || {}).nom || "";
        return (
          <Modal title={selQR.nom} subtitle="QR CODE CHANTIER" onClose={() => setSelQR(null)} width="400px">
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{ background: "#f8fafc", borderRadius: 14, padding: 18, display: "inline-block", marginBottom: 14, boxShadow: "0 2px 12px rgba(26,43,95,.08)" }}>
                <QRCanvas data={`OZE|${selQR.id}|${selQR.nom}`} size={200} id="qr-print-canvas" />
              </div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 800, color: NAVY, marginBottom: 4 }}>{selQR.nom}</div>
              <div style={{ fontSize: 12, color: "#374151", fontWeight: 600, marginBottom: 3 }}>{clientNom}</div>
              <div style={{ fontSize: 10, color: "#d1d5db", fontFamily: "monospace", marginBottom: 18 }}>ID: {selQR.id} · PIN requis</div>
              <Btn onClick={() => {
                const cv = document.querySelector("#qr-print-canvas");
                const qrDataUrl = cv ? cv.toDataURL("image/png") : "";
                const html = `<div style="max-width:360px;margin:20px auto;border:2px solid ${NAVY};border-radius:20px;overflow:hidden;font-family:Arial,sans-serif">
                  <div style="background:linear-gradient(135deg,${NAVY},#243570);padding:20px;text-align:center">
                    <div style="font-size:26px;font-weight:900;color:${GOLD}">OZÉ</div>
                    <div style="color:rgba(255,255,255,.4);font-size:9px;letter-spacing:.12em;margin-top:2px">NETTOYAGE & SERVICES</div>
                  </div>
                  <div style="padding:20px;text-align:center;background:#fff">
                    ${qrDataUrl ? `<img src="${qrDataUrl}" style="border-radius:10px;width:200px;height:200px;display:block;margin:0 auto 14px" />` : `<div style="width:200px;height:50px;background:#f0f4ff;border-radius:8px;margin:0 auto 14px;padding:10px;font-family:monospace;color:${NAVY}">${selQR.id}</div>`}
                    <div style="font-size:17px;font-weight:800;color:${NAVY};margin-bottom:4px">${selQR.nom}</div>
                    <div style="font-size:12px;color:#374151;margin-bottom:3px">${clientNom}</div>
                    <div style="font-size:11px;color:#9ca3af;margin-bottom:12px">${selQR.adresse}</div>
                    <div style="background:#EEF1FA;color:${NAVY};padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700;display:inline-block;margin-bottom:12px">${selQR.type}</div>
                    <div style="font-size:9px;color:#d1d5db;font-family:monospace">ID: ${selQR.id} · PIN requis</div>
                  </div>
                  <div style="background:#f8fafc;padding:10px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #f1f5f9">
                    Scannez ce QR Code pour pointer votre présence
                  </div>
                </div>`;
                printDocHTML(html, `QR ${selQR.nom}`);
              }} style={{ width: "100%" }}><Ico n="print" s={15} /> Imprimer le QR Code</Btn>
            </div>
          </Modal>
        );
      })()}      )}

      {showForm && (
        <Modal title="Nouveau chantier" subtitle="OZÉ NETTOYAGE" onClose={() => setShowForm(false)} width="500px">
          <FRow label="Nom du chantier *"><Inp value={form.nom} onChange={v => setF("nom", v)} placeholder="ex: Tour Oxygène – Lyon 3" /></FRow>
          <FRow label="Client *"><Sel value={form.clientId} onChange={v => setF("clientId", v)} options={[{ v: "", l: "— Choisir —" }, ...clients.map(c => ({ v: c.id, l: c.nom }))]} /></FRow>
          <FRow label="Adresse *"><Inp value={form.adresse} onChange={v => setF("adresse", v)} placeholder="Adresse complète" /></FRow>
          <FRow label="Type de prestation"><Sel value={form.type} onChange={v => setF("type", v)} options={Object.keys(TYPE_COL)} /></FRow>
          <FRow label="Responsable OZÉ"><Sel value={form.responsableId} onChange={v => setF("responsableId", v)} options={[{ v: "", l: "— Aucun —" }, ...users.filter(u => u.actif).map(u => ({ v: u.id, l: u.nom }))]} /></FRow>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={() => setShowForm(false)} v="secondary" style={{ flex: 1 }}>Annuler</Btn>
            <Btn onClick={saveChantier} disabled={!form.nom || !form.clientId || !form.adresse} style={{ flex: 2 }}><Ico n="save" s={15} /> Créer & générer QR</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── CDC MODAL ────────────────────────────────────────────────────
function ModalCDC({ chantier, onClose }) {
  const [lang, setLang] = useState("fr");
  const content = lang === "fr" ? CDC_FR : CDC_TRANS[lang] || CDC_FR;
  const lo = LANG_OPTS.find(l => l.code === lang) || LANG_OPTS[0];
  const renderMD = txt => txt.split("\n").map((line, i) => {
    if (line.startsWith("**") && line.endsWith("**") && !line.slice(2, -2).includes("**")) return <div key={i} style={{ fontWeight: 800, fontSize: 14, color: NAVY, fontFamily: "'Playfair Display',serif", margin: "14px 0 6px" }}>{line.slice(2, -2)}</div>;
    if (line.startsWith("• ")) return <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "#374151", marginBottom: 4, paddingLeft: 4 }}><span style={{ color: GOLD, flexShrink: 0 }}>✦</span>{line.slice(2)}</div>;
    if (!line.trim()) return <div key={i} style={{ height: 3 }} />;
    return <div key={i} style={{ fontSize: 13, color: "#374151", lineHeight: 1.65, marginBottom: 3 }}>{line}</div>;
  });
  return (
    <Modal title={chantier.nom} subtitle="CAHIER DES CHARGES" onClose={onClose} width="660px">
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {LANG_OPTS.map(l => (
          <button key={l.code} onClick={() => setLang(l.code)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, border: `2px solid ${lang === l.code ? NAVY : "#e5e7eb"}`, background: lang === l.code ? "#EEF1FA" : "#fff", color: lang === l.code ? NAVY : "#6b7280", fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all .15s", fontFamily: "inherit" }}>
            <span style={{ fontSize: 16 }}>{l.flag}</span> {l.label}
          </button>
        ))}
      </div>
      <div style={{ background: "#fafbff", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "20px 22px", maxHeight: 420, overflowY: "auto", direction: lo.rtl ? "rtl" : "ltr" }}>
        {renderMD(content)}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <Btn onClick={() => { const win = window.open("", "_blank"); win.document.write(`<html><head><title>CDC ${chantier.nom}</title><style>body{font-family:Arial,sans-serif;max-width:720px;margin:40px auto;padding:0 20px}h1{color:${NAVY}}@media print{body{color-adjust:exact}}</style></head><body><h1>OZÉ Nettoyage — Cahier des charges</h1><h2>${chantier.nom}</h2><pre style="white-space:pre-wrap;font-family:inherit;font-size:13px">${content}</pre></body></html>`); win.document.close(); setTimeout(() => win.print(), 400); }} style={{ flex: 1 }}><Ico n="print" s={15} /> Imprimer</Btn>
        <Btn onClick={onClose} v="secondary" style={{ flex: 1 }}>Fermer</Btn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PAGE POINTAGE SALARIÉ (avec scanner QR caméra)
// ═══════════════════════════════════════════════════════════════════
function PagePointage({ user, chantiers, pointages, setPointages, push }) {
  const [step, setStep] = useState("select");
  const [selC, setSelC] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinErr, setPinErr] = useState("");
  const [action, setAction] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = (data) => {
    setShowScanner(false);
    const parts = data.split("|");
    const id = parts[1] || data.trim().toUpperCase();
    const found = chantiers.find(c => c.id === id || c.nom.toLowerCase().includes(data.toLowerCase()));
    if (found) { setSelC(found); setStep("pin"); }
    else alert("QR Code non reconnu. Vérifiez le code.");
  };

  useEffect(() => { if (pinInput.length === 4) { if (pinInput === user.pin) { setStep("action"); setPinErr(""); } else { setPinErr("PIN incorrect"); setPinInput(""); } } }, [pinInput]);

  const doPointage = () => {
    const todayDate = today();
    const existing = pointages.find(p => p.chantierId === selC.id && p.agentId === user.id && new Date(p.entree).toDateString() === todayDate && !p.sortie);
    if (action === "entree") {
      if (existing) { alert("Entrée déjà enregistrée aujourd'hui."); return; }
      const np = { id: Date.now(), chantierId: selC.id, nomChantier: selC.nom, agentId: user.id, nomAgent: user.nom, entree: nowISO(), sortie: null };
      const u = [np, ...pointages]; setPointages(u); LS.set("oze_pointages", u);
      push("pointage", "Pointage arrivée", `${user.nom} → ${selC.nom} à ${fmtTime(np.entree)}`, "pointage");
    } else {
      if (!existing) { alert("Aucune entrée trouvée. Pointez d'abord votre arrivée."); return; }
      const u = pointages.map(p => p.id === existing.id ? { ...p, sortie: nowISO() } : p); setPointages(u); LS.set("oze_pointages", u);
      push("pointage", "Pointage départ", `${user.nom} a quitté ${selC.nom}`, "pointage");
    }
    setStep("done");
  };

  const reset = () => { setStep("select"); setSelC(null); setPinInput(""); setAction(null); };

  if (step === "done") {
    const last = [...pointages].filter(p => p.agentId === user.id).sort((a, b) => new Date(b.entree) - new Date(a.entree))[0];
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
        <div style={{ textAlign: "center", animation: "popIn .3s cubic-bezier(.34,1.56,.64,1)", maxWidth: 360 }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: action === "entree" ? "linear-gradient(135deg,#10b981,#059669)" : `linear-gradient(135deg,${GOLD},#d97706)`, margin: "0 auto 18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, boxShadow: action === "entree" ? "0 12px 40px rgba(16,185,129,.3)" : `0 12px 40px rgba(245,194,0,.3)` }}>
            {action === "entree" ? "✓" : "→"}
          </div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 800, color: "#111827", marginBottom: 6 }}>{action === "entree" ? "Bonne journée !" : "À bientôt !"}</div>
          <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 4 }}>{selC?.nom}</div>
          <div style={{ color: NAVY, fontSize: 28, fontWeight: 900, margin: "14px 0" }}>{action === "entree" ? `Arrivée : ${fmtTime(last?.entree)}` : `Départ : ${fmtTime(last?.sortie)}${last?.sortie ? ` · ${fmtDuree(last.entree, last.sortie) || ""}` : ""}`}</div>
          <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 24 }}>{fmtDate(nowISO())}</div>
          <Btn onClick={reset} style={{ margin: "0 auto" }}><Ico n="check" s={15} /> Nouveau pointage</Btn>
        </div>
      </div>
    );
  }

  const todayPt = pointages.filter(p => p.agentId === user.id && new Date(p.entree).toDateString() === today());

  return (
    <div>
      <div style={{ marginBottom: 24 }}><div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Mon espace</div><h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", fontFamily: "'Playfair Display',serif", margin: 0 }}>Pointage</h2></div>
      {todayPt.length > 0 && (
        <Card style={{ padding: "14px 18px", marginBottom: 20, borderLeft: `4px solid ${NAVY}` }}>
          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, marginBottom: 10, textTransform: "uppercase" }}>Mes pointages aujourd'hui</div>
          {todayPt.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: "#111827" }}>{p.nomChantier}</div>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ color: "#10b981", fontWeight: 700 }}>▲{fmtTime(p.entree)}</span>
                {p.sortie ? <span style={{ color: "#f59e0b", fontWeight: 700 }}>▼{fmtTime(p.sortie)}</span> : <span style={{ color: "#9ca3af", fontSize: 11 }}>En cours</span>}
                {p.sortie && <span style={{ background: "#dcfce7", color: "#15803d", padding: "1px 7px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{fmtDuree(p.entree, p.sortie)}</span>}
              </div>
            </div>
          ))}
        </Card>
      )}
      <div style={{ maxWidth: 440 }}>
        {step === "select" && (
          <div>
            <Btn onClick={() => setShowScanner(true)} v="gold" style={{ width: "100%", padding: "14px 0", marginBottom: 16, fontSize: 14 }}><Ico n="camera" s={18} /> Scanner le QR Code du chantier</Btn>
            <div style={{ color: "#9ca3af", fontSize: 11, fontWeight: 700, textAlign: "center", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>ou choisir manuellement</div>
            {chantiers.filter(c => c.actif).map(c => (
              <button key={c.id} onClick={() => { setSelC(c); setStep("pin"); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "#fff", border: "1.5px solid #f1f5f9", borderRadius: 12, cursor: "pointer", marginBottom: 8, textAlign: "left", boxShadow: "0 1px 4px rgba(26,43,95,.06)", fontFamily: "inherit", transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#f1f5f9"; e.currentTarget.style.background = "#fff"; }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: "#EEF1FA", display: "flex", alignItems: "center", justifyContent: "center", color: NAVY, flexShrink: 0 }}><Ico n="map" s={18} /></div>
                <div><div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{c.nom}</div><div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{c.adresse}</div></div>
              </button>
            ))}
          </div>
        )}
        {step === "pin" && (
          <div style={{ animation: "fadeUp .25s ease" }}>
            <div style={{ background: "#EEF1FA", borderRadius: 12, padding: "12px 16px", marginBottom: 22, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ color: GOLD, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em" }}>CHANTIER</div><div style={{ color: NAVY, fontWeight: 800, fontSize: 15 }}>{selC?.nom}</div></div>
              <button onClick={() => { setStep("select"); setPinInput(""); }} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 11, color: "#6b7280", fontWeight: 600, fontFamily: "inherit" }}>Changer</button>
            </div>
            <Card style={{ padding: "22px", background: `linear-gradient(160deg,${DARK},${NAVY})` }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ color: GOLD, fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 4 }}>🔒 SÉCURITÉ</div>
                <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, fontFamily: "'Playfair Display',serif" }}>Confirmez votre PIN</div>
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 20 }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{ width: 50, height: 50, borderRadius: 12, border: `2px solid ${pinInput.length > i ? GOLD : "rgba(255,255,255,.12)"}`, background: pinInput.length > i ? "rgba(245,194,0,.1)" : "rgba(255,255,255,.03)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}>
                    {pinInput.length > i && <div style={{ width: 14, height: 14, borderRadius: "50%", background: GOLD }} />}
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9, marginBottom: 8 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k, i) => (
                  <button key={i} onClick={() => { if (k === "⌫") { setPinErr(""); setPinInput(p => p.slice(0, -1)); } else if (k !== "" && pinInput.length < 4) { setPinErr(""); setPinInput(p => p + k); } }}
                    style={{ padding: "13px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: k === "" ? "transparent" : "rgba(255,255,255,.06)", color: "#fff", fontSize: 17, fontWeight: 700, cursor: k === "" ? "default" : "pointer", visibility: k === "" ? "hidden" : "visible", fontFamily: "inherit", transition: "background .1s" }}
                    onMouseEnter={e => { if (k !== "") e.currentTarget.style.background = "rgba(245,194,0,.12)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = k === "" ? "transparent" : "rgba(255,255,255,.06)"; }}>
                    {k}
                  </button>
                ))}
              </div>
              {pinErr && <div style={{ color: "#fca5a5", fontSize: 12, textAlign: "center", fontWeight: 600 }}>{pinErr}</div>}
            </Card>
          </div>
        )}
        {step === "action" && (
          <div style={{ animation: "fadeUp .25s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{ width: 62, height: 62, borderRadius: "50%", background: `linear-gradient(135deg,${GOLD},#d97706)`, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 20, color: NAVY }}>{user.avatar}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 800, color: "#111827" }}>{user.nom}</div>
              <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>{selC?.nom}</div>
              <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>{new Date().toLocaleString("fr-FR", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <button onClick={() => { setAction("entree"); setStep("confirm"); }} style={{ padding: "28px 16px", background: "linear-gradient(135deg,#10b981,#059669)", border: "none", borderRadius: 16, cursor: "pointer", textAlign: "center", boxShadow: "0 8px 24px rgba(16,185,129,.25)", fontFamily: "inherit" }}>
                <div style={{ fontSize: 34, marginBottom: 8 }}>▲</div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 17 }}>Arrivée</div>
                <div style={{ color: "rgba(255,255,255,.7)", fontSize: 12, marginTop: 4 }}>Pointer mon entrée</div>
              </button>
              <button onClick={() => { setAction("sortie"); setStep("confirm"); }} style={{ padding: "28px 16px", background: `linear-gradient(135deg,${GOLD},#d97706)`, border: "none", borderRadius: 16, cursor: "pointer", textAlign: "center", boxShadow: `0 8px 24px rgba(245,194,0,.25)`, fontFamily: "inherit" }}>
                <div style={{ fontSize: 34, marginBottom: 8, color: NAVY }}>▼</div>
                <div style={{ color: NAVY, fontWeight: 800, fontSize: 17 }}>Départ</div>
                <div style={{ color: "rgba(26,43,95,.6)", fontSize: 12, marginTop: 4 }}>Pointer ma sortie</div>
              </button>
            </div>
          </div>
        )}
        {step === "confirm" && (
          <div style={{ animation: "fadeUp .2s ease" }}>
            <Card style={{ padding: "24px", textAlign: "center", marginBottom: 16 }}>
              <div style={{ color: NAVY, fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 14, textTransform: "uppercase" }}>{action === "entree" ? "▲ Confirmer l'arrivée" : "▼ Confirmer le départ"}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 4 }}>{user.nom}</div>
              <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 4 }}>{selC?.nom}</div>
              <div style={{ color: NAVY, fontSize: 34, fontWeight: 900, margin: "12px 0" }}>{new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
              <div style={{ color: "#9ca3af", fontSize: 12 }}>{fmtDate(nowISO())}</div>
            </Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Btn onClick={() => setStep("action")} v="secondary">Retour</Btn>
              <Btn onClick={doPointage} v={action === "entree" ? "green" : "gold"}>Confirmer</Btn>
            </div>
          </div>
        )}
      </div>
      {showScanner && <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PAGE POINTAGES ADMIN (avec export Excel + PDF)
// ═══════════════════════════════════════════════════════════════════
function PagePointagesAdmin({ user, pointages, setPointages, users, chantiers }) {
  const [filterAgent, setFilterAgent] = useState("tous");
  const [filterChantier, setFilterChantier] = useState("tous");
  const [filterDate, setFilterDate] = useState("");

  const filtered = pointages.filter(p => {
    const okA = filterAgent === "tous" || p.agentId === filterAgent;
    const okC = filterChantier === "tous" || p.chantierId === filterChantier;
    const okD = !filterDate || p.entree.startsWith(filterDate);
    return okA && okC && okD;
  });
  const totalH = filtered.reduce((s, p) => s + dureeH(p.entree, p.sortie), 0);
  const del = id => { const u = pointages.filter(p => p.id !== id); setPointages(u); LS.set("oze_pointages", u); };

  const exportPDFTable = () => {
    const rows = [...filtered].sort((a, b) => new Date(b.entree) - new Date(a.entree));
    const html = `<div style="max-width:900px;margin:30px auto;font-family:'DM Sans',sans-serif">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px">
        <div><div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;color:${NAVY}">OZÉ</div><div style="font-size:9px;letter-spacing:.12em;color:#9ca3af;font-weight:700">NETTOYAGE & SERVICES</div></div>
        <div style="text-align:right"><div style="font-size:18px;font-weight:800;color:${NAVY}">Registre des Pointages</div><div style="font-size:12px;color:#6b7280">Exporté le ${fmtDate(nowISO())} · ${rows.length} entrées · ${Math.floor(totalH)}h${String(Math.round((totalH % 1) * 60)).padStart(2, "0")} cumulées</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:${NAVY}"><th style="padding:10px 12px;color:#fff;text-align:left">Agent</th><th style="padding:10px 12px;color:#fff;text-align:left">Chantier</th><th style="padding:10px 12px;color:#fff">Date</th><th style="padding:10px 12px;color:#fff">Arrivée</th><th style="padding:10px 12px;color:#fff">Départ</th><th style="padding:10px 12px;color:#fff">Durée</th><th style="padding:10px 12px;color:#fff">Statut</th></tr></thead>
        <tbody>${rows.map((p, i) => `<tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"};border-bottom:1px solid #f1f5f9">
          <td style="padding:9px 12px;font-weight:700;color:#111">${p.nomAgent}</td>
          <td style="padding:9px 12px;color:#374151">${p.nomChantier}</td>
          <td style="padding:9px 12px;text-align:center;color:#6b7280">${fmtDate(p.entree)}</td>
          <td style="padding:9px 12px;text-align:center;color:#10b981;font-weight:700">${fmtTime(p.entree)}</td>
          <td style="padding:9px 12px;text-align:center;color:#f59e0b;font-weight:700">${fmtTime(p.sortie)}</td>
          <td style="padding:9px 12px;text-align:center;font-weight:700;color:${NAVY}">${fmtDuree(p.entree, p.sortie) || "—"}</td>
          <td style="padding:9px 12px;text-align:center"><span style="background:${p.sortie ? "#dcfce7" : "#fef9c3"};color:${p.sortie ? "#15803d" : "#92400e"};padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700">${p.sortie ? "Complet" : "En cours"}</span></td>
        </tr>`).join("")}</tbody>
      </table></div>`;
    printDocHTML(html, "Pointages OZÉ");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div><div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Suivi</div><h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", fontFamily: "'Playfair Display',serif", margin: 0 }}>Registre des pointages</h2></div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => exportPointagesExcel(filtered, users, chantiers)} v="secondary"><Ico n="download" s={15} /> Excel</Btn>
          <Btn onClick={exportPDFTable}><Ico n="print" s={15} /> PDF</Btn>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
        {[{ l: "Total", v: filtered.length, c: NAVY }, { l: "Heures cumulées", v: `${Math.floor(totalH)}h${String(Math.round((totalH % 1) * 60)).padStart(2, "0")}`, c: GOLD }, { l: "En cours", v: filtered.filter(p => !p.sortie).length, c: "#10b981" }, { l: "Complétés", v: filtered.filter(p => p.sortie).length, c: "#6b7280" }].map(s => (
          <Card key={s.l} style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginTop: 4 }}>{s.l}</div>
          </Card>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Sel value={filterAgent} onChange={setFilterAgent} options={[{ v: "tous", l: "Tous les agents" }, ...users.filter(u => u.role === "salarie").map(u => ({ v: u.id, l: u.nom }))]} style={{ flex: "1 1 180px", width: "auto" }} />
        <Sel value={filterChantier} onChange={setFilterChantier} options={[{ v: "tous", l: "Tous les chantiers" }, ...chantiers.map(c => ({ v: c.id, l: c.nom }))]} style={{ flex: "1 1 200px", width: "auto" }} />
        <Inp value={filterDate} onChange={setFilterDate} type="date" style={{ flex: "0 0 auto" }} />
      </div>
      <Card style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #f1f5f9" }}>{["Agent", "Chantier", "Date", "Arrivée", "Départ", "Durée", "Statut", ""].map(h => <th key={h} style={{ padding: "11px 14px", textAlign: "left", color: "#9ca3af", fontWeight: 700, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Aucun pointage</td></tr>}
              {[...filtered].sort((a, b) => new Date(b.entree) - new Date(a.entree)).map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f9fafb" }}>
                  <td style={{ padding: "11px 14px" }}><div style={{ display: "flex", alignItems: "center", gap: 9 }}><div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg,${NAVY},#2d4090)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: GOLD }}>{p.nomAgent?.split(" ").map(n => n[0]).join("").slice(0, 2)}</div><span style={{ fontWeight: 700, color: "#111827" }}>{p.nomAgent}</span></div></td>
                  <td style={{ padding: "11px 14px", color: "#374151", fontWeight: 600 }}>{p.nomChantier}</td>
                  <td style={{ padding: "11px 14px", color: "#9ca3af", fontSize: 12 }}>{fmtDate(p.entree)}</td>
                  <td style={{ padding: "11px 14px", color: "#10b981", fontWeight: 700 }}>{fmtTime(p.entree)}</td>
                  <td style={{ padding: "11px 14px", color: "#f59e0b", fontWeight: 700 }}>{fmtTime(p.sortie)}</td>
                  <td style={{ padding: "11px 14px" }}>{fmtDuree(p.entree, p.sortie) ? <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{fmtDuree(p.entree, p.sortie)}</span> : "—"}</td>
                  <td style={{ padding: "11px 14px" }}><span style={{ background: p.sortie ? "#dcfce7" : "#fef9c3", color: p.sortie ? "#15803d" : "#92400e", padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{p.sortie ? "Complet" : "En cours"}</span></td>
                  <td style={{ padding: "11px 14px" }}>{user.role === "administrateur" && <Btn onClick={() => del(p.id)} v="danger" size="sm"><Ico n="trash" s={13} /></Btn>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PAGE DEVIS & FACTURES
// ═══════════════════════════════════════════════════════════════════
function PageDevis({ user, devis, setDevis, clients, chantiers, users, push, mode = "devis" }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ clientId: "", chantierId: "", date: new Date().toISOString().slice(0, 10), validite: "", statut: "brouillon", lignes: [{ desc: "", qte: 1, pu: 0, tva: 10 }], notes: "", redacteurId: user.id });
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filteredDevis = mode === "factures" ? devis.filter(d => ["facturé", "accepté"].includes(d.statut)) : devis;

  const saveDevis = () => {
    let u;
    if (editId) { u = devis.map(d => d.id === editId ? { ...form, id: editId } : d); }
    else { const nd = { ...form, id: "DEV-" + uid() }; u = [nd, ...devis]; push("devis", "Nouveau devis", `${nd.id} créé pour ${(clients.find(c => c.id === nd.clientId) || {}).nom || ""}`, "devis"); }
    setDevis(u); LS.set("oze_devis", u);
    setShowForm(false); setEditId(null);
    setForm({ clientId: "", chantierId: "", date: new Date().toISOString().slice(0, 10), validite: "", statut: "brouillon", lignes: [{ desc: "", qte: 1, pu: 0, tva: 10 }], notes: "", redacteurId: user.id });
  };

  const updateStatut = (id, statut) => {
    const u = devis.map(d => d.id === id ? { ...d, statut } : d); setDevis(u); LS.set("oze_devis", u);
    push("devis", "Devis mis à jour", `${id} → ${statut}`, "devis");
  };

  const openEdit = (d) => { setForm({ ...d }); setEditId(d.id); setShowForm(true); };

  const addLigne = () => setF("lignes", [...form.lignes, { desc: "", qte: 1, pu: 0, tva: 10 }]);
  const updateLigne = (i, k, v) => setF("lignes", form.lignes.map((l, idx) => idx === i ? { ...l, [k]: k === "desc" ? v : Number(v) } : l));
  const removeLigne = (i) => setF("lignes", form.lignes.filter((_, idx) => idx !== i));

  const totalCA = filteredDevis.filter(d => d.statut === "facturé").reduce((s, d) => s + calcDevis(d.lignes).ttc, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Commercial</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", fontFamily: "'Playfair Display',serif", margin: 0 }}>{mode === "factures" ? "Factures" : "Devis"}</h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => exportDevisExcel(filteredDevis, clients, chantiers)} v="secondary"><Ico n="download" s={15} /> Excel</Btn>
          <Btn onClick={() => setShowForm(true)}><Ico n="plus" s={15} /> Nouveau devis</Btn>
        </div>
      </div>

      {mode === "factures" && (
        <Card style={{ padding: "16px 20px", marginBottom: 20, background: `linear-gradient(135deg,${NAVY},#243570)`, display: "flex", gap: 32 }}>
          <div><div style={{ color: "rgba(255,255,255,.5)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 4 }}>CA FACTURÉ</div><div style={{ color: GOLD, fontSize: 26, fontWeight: 900 }}>{fmtEur(totalCA)}</div></div>
          <div><div style={{ color: "rgba(255,255,255,.5)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 4 }}>FACTURES</div><div style={{ color: "#fff", fontSize: 26, fontWeight: 900 }}>{filteredDevis.filter(d => d.statut === "facturé").length}</div></div>
          <div><div style={{ color: "rgba(255,255,255,.5)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 4 }}>EN ATTENTE</div><div style={{ color: "#fff", fontSize: 26, fontWeight: 900 }}>{filteredDevis.filter(d => d.statut === "accepté").length}</div></div>
        </Card>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {filteredDevis.map(d => {
          const client = clients.find(c => c.id === d.clientId) || {};
          const chantier = chantiers.find(c => c.id === d.chantierId) || {};
          const { ht, tva, ttc } = calcDevis(d.lignes);
          const sc = STATUT_DEVIS[d.statut] || {};
          return (
            <Card key={d.id} style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: NAVY }}>{d.id}</span>
                    <span style={{ background: sc.bg, color: sc.c, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{d.statut}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 2 }}>{client.nom}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>{chantier.nom} · {d.date} · Validité : {d.validite || "—"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: NAVY }}>{fmtEur(ttc)}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>HT {fmtEur(ht)} · TVA {fmtEur(tva)}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <Btn onClick={() => genDevisPDF(d, clients, chantiers, users)} v="secondary" size="sm"><Ico n="print" s={13} /> PDF</Btn>
                <Btn onClick={() => openEdit(d)} v="secondary" size="sm"><Ico n="edit" s={13} /> Modifier</Btn>
                {d.statut === "brouillon" && <Btn onClick={() => updateStatut(d.id, "envoyé")} v="secondary" size="sm"><Ico n="send" s={13} /> Envoyer</Btn>}
                {d.statut === "envoyé" && <>
                  <Btn onClick={() => updateStatut(d.id, "accepté")} v="green" size="sm"><Ico n="check" s={13} /> Accepté</Btn>
                  <Btn onClick={() => updateStatut(d.id, "refusé")} v="danger" size="sm"><Ico n="x" s={13} /> Refusé</Btn>
                </>}
                {d.statut === "accepté" && <Btn onClick={() => updateStatut(d.id, "facturé")} v="gold" size="sm"><Ico n="euro" s={13} /> Facturer</Btn>}
                {user.role === "administrateur" && <Btn onClick={() => { const u = devis.filter(x => x.id !== d.id); setDevis(u); LS.set("oze_devis", u); }} v="danger" size="sm"><Ico n="trash" s={13} /></Btn>}
              </div>
            </Card>
          );
        })}
        {filteredDevis.length === 0 && <div style={{ textAlign: "center", padding: "50px 20px", color: "#9ca3af" }}><div style={{ fontSize: 36, marginBottom: 10 }}>📄</div><div style={{ fontWeight: 700 }}>Aucun devis</div></div>}
      </div>

      {showForm && (
        <Modal title={editId ? "Modifier le devis" : "Nouveau devis"} subtitle="OZÉ COMMERCIAL" onClose={() => { setShowForm(false); setEditId(null); }} width="660px">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FRow label="Client *"><Sel value={form.clientId} onChange={v => setF("clientId", v)} options={[{ v: "", l: "— Choisir —" }, ...clients.map(c => ({ v: c.id, l: c.nom }))]} /></FRow>
            <FRow label="Chantier"><Sel value={form.chantierId} onChange={v => setF("chantierId", v)} options={[{ v: "", l: "— Aucun —" }, ...chantiers.map(c => ({ v: c.id, l: c.nom }))]} /></FRow>
            <FRow label="Date"><Inp value={form.date} onChange={v => setF("date", v)} type="date" /></FRow>
            <FRow label="Validité"><Inp value={form.validite} onChange={v => setF("validite", v)} type="date" /></FRow>
          </div>
          <FRow label="Statut"><Sel value={form.statut} onChange={v => setF("statut", v)} options={Object.keys(STATUT_DEVIS)} /></FRow>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase" }}>Lignes de prestation</label>
              <Btn onClick={addLigne} v="secondary" size="sm"><Ico n="plus" s={12} /> Ajouter</Btn>
            </div>
            <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1fr auto", gap: 0, background: "#f8fafc", padding: "8px 10px" }}>
                {["Désignation", "Qté", "PU HT (€)", "TVA %", ""].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.06em" }}>{h}</div>)}
              </div>
              {form.lignes.map((l, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1fr auto", gap: 6, padding: "8px 10px", borderTop: "1px solid #f1f5f9", alignItems: "center" }}>
                  <Inp value={l.desc} onChange={v => updateLigne(i, "desc", v)} placeholder="Désignation…" />
                  <Inp value={l.qte} onChange={v => updateLigne(i, "qte", v)} type="number" min="0.5" step="0.5" />
                  <Inp value={l.pu} onChange={v => updateLigne(i, "pu", v)} type="number" min="0" />
                  <Sel value={l.tva} onChange={v => updateLigne(i, "tva", Number(v))} options={[{ v: 0, l: "0%" }, { v: 5.5, l: "5.5%" }, { v: 10, l: "10%" }, { v: 20, l: "20%" }]} />
                  <button onClick={() => removeLigne(i)} style={{ background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: 7, padding: "6px 7px", cursor: "pointer", color: "#b91c1c", display: "flex", flexShrink: 0 }}><Ico n="trash" s={13} /></button>
                </div>
              ))}
              <div style={{ padding: "12px 14px", background: "#f8fafc", borderTop: "1.5px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 24, fontSize: 13 }}>
                <span style={{ color: "#6b7280" }}>HT : <strong style={{ color: NAVY }}>{fmtEur(calcDevis(form.lignes).ht)}</strong></span>
                <span style={{ color: "#6b7280" }}>TVA : <strong>{fmtEur(calcDevis(form.lignes).tva)}</strong></span>
                <span style={{ fontWeight: 800, color: NAVY, fontSize: 15 }}>TTC : {fmtEur(calcDevis(form.lignes).ttc)}</span>
              </div>
            </div>
          </div>
          <FRow label="Notes">
            <textarea value={form.notes} onChange={e => setF("notes", e.target.value)} rows={2} placeholder="Conditions particulières, remarques…" style={{ width: "100%", padding: "10px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 13, color: "#111827", background: "#f9fafb", outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
          </FRow>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={() => { setShowForm(false); setEditId(null); }} v="secondary" style={{ flex: 1 }}>Annuler</Btn>
            <Btn onClick={saveDevis} disabled={!form.clientId || form.lignes.some(l => !l.desc)} style={{ flex: 2 }}><Ico n="save" s={15} /> {editId ? "Enregistrer" : "Créer le devis"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PAGE UTILISATEURS
// ═══════════════════════════════════════════════════════════════════
function PageUtilisateurs({ users, setUsers, currentUser, setCurrentUser }) {
  const [showForm, setShowForm] = useState(false);
  const [editU, setEditU] = useState(null);
  const [form, setForm] = useState({ nom: "", role: "salarie", pin: "", email: "", tel: "", poste: "", actif: true });
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const save = async () => {
    if (editU) {
      const updated = { ...editU, ...form, avatar: form.nom.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() };
      await supabase.from("oze_users").update(form).eq("id", editU.id);
      const newList = users.map(x => x.id === editU.id ? updated : x);
      setUsers(newList);
      if (currentUser && currentUser.id === editU.id) setCurrentUser(updated);
    } else {
      const newUser = { ...form, id: "U" + uid(), avatar: form.nom.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() };
      await supabase.from("oze_users").insert(newUser);
      setUsers([newUser, ...users]);
    }
    setShowForm(false); setEditU(null);
  };
  const openEdit = u => { setEditU(u); setForm({ nom: u.nom, role: u.role, pin: u.pin, email: u.email || "", tel: u.tel || "", poste: u.poste || "", actif: u.actif }); setShowForm(true); };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div><div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Administration</div><h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", fontFamily: "'Playfair Display',serif", margin: 0 }}>Utilisateurs & accès</h2></div>
        <Btn onClick={() => { setEditU(null); setShowForm(true); }}><Ico n="plus" s={15} /> Nouvel utilisateur</Btn>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {users.map(u => (
          <Card key={u.id} style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, opacity: u.actif ? 1 : .6 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: u.actif ? `linear-gradient(135deg,${NAVY},#2d4090)` : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: u.actif ? GOLD : "#9ca3af", flexShrink: 0 }}>{u.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: "#111827" }}>{u.nom}</span>
                <BadgeRole role={u.role} />
                {!u.actif && <span style={{ background: "#f1f5f9", color: "#9ca3af", padding: "1px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>Inactif</span>}
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 3, flexWrap: "wrap" }}>
                {u.email && <span style={{ fontSize: 12, color: "#9ca3af" }}>{u.email}</span>}
                {u.tel && <span style={{ fontSize: 12, color: "#9ca3af" }}>{u.tel}</span>}
                {u.poste && <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{u.poste}</span>}
              </div>
              <div style={{ fontSize: 10, color: "#d1d5db", marginTop: 2, fontFamily: "monospace" }}>PIN : {"●".repeat(u.pin?.length || 4)} · {u.id}</div>
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <Btn onClick={() => openEdit(u)} v="secondary" size="sm"><Ico n="edit" s={13} /></Btn>
              <Btn onClick={async () => { await supabase.from("oze_users").update({ actif: !u.actif }).eq("id", u.id); const up = users.map(x => x.id === u.id ? { ...x, actif: !u.actif } : x); setUsers(up); }} v={u.actif ? "danger" : "secondary"} size="sm"><Ico n={u.actif ? "x" : "check"} s={13} /></Btn>
              <Btn onClick={async () => { if (currentUser && currentUser.id === u.id) return; if (!window.confirm(`Supprimer ${u.nom} ?`)) return; await supabase.from("oze_users").delete().eq("id", u.id); setUsers(users.filter(x => x.id !== u.id)); }} v="danger" size="sm" title="Supprimer" disabled={!!(currentUser && currentUser.id === u.id)}><Ico n="trash" s={13} /></Btn>
            </div>
          </Card>
        ))}
      </div>
      {showForm && (
        <Modal title={editU ? "Modifier" : "Nouvel utilisateur"} subtitle="GESTION DES ACCÈS" onClose={() => { setShowForm(false); setEditU(null); }} width="480px">
          <FRow label="Nom complet *"><Inp value={form.nom} onChange={v => setF("nom", v)} placeholder="Prénom Nom" /></FRow>
          <FRow label="Rôle *"><Sel value={form.role} onChange={v => setF("role", v)} options={[{ v: "administrateur", l: "👑 Administrateur" }, { v: "administratif", l: "📋 Administratif" }, { v: "salarie", l: "👷 Salarié" }]} /></FRow>
          <FRow label="Code PIN * (4 chiffres)"><Inp value={form.pin} onChange={v => { if (/^\d{0,4}$/.test(v)) setF("pin", v); }} placeholder="ex: 1234" /></FRow>
          <FRow label="Email"><Inp value={form.email} onChange={v => setF("email", v)} placeholder="email@oze.fr" type="email" /></FRow>
          <FRow label="Téléphone"><Inp value={form.tel} onChange={v => setF("tel", v)} placeholder="06 00 00 00 00" /></FRow>
          <FRow label="Poste / Fonction"><Inp value={form.poste} onChange={v => setF("poste", v)} placeholder="ex: Agent Senior, Comptable…" /></FRow>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 12px", background: "#f8fafc", borderRadius: 8 }}>
            <input type="checkbox" checked={form.actif} onChange={e => setF("actif", e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Compte actif</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={() => { setShowForm(false); setEditU(null); }} v="secondary" style={{ flex: 1 }}>Annuler</Btn>
            <Btn onClick={save} disabled={!form.nom || form.pin?.length !== 4} style={{ flex: 2 }}><Ico n="save" s={15} /> {editU ? "Enregistrer" : "Créer l'accès"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LAYOUT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
const NAV_ITEMS = [
  { id: "dashboard", label: "Tableau de bord", icon: "dashboard" },
  { id: "chantiers", label: "Chantiers", icon: "chantiers" },
  { id: "pointage", label: "Mon pointage", icon: "pointage" },
  { id: "pointage_admin", label: "Pointages", icon: "pointage_admin" },
  { id: "equipe", label: "Équipe", icon: "equipe" },
  { id: "clients", label: "Clients", icon: "clients" },
  { id: "devis", label: "Devis", icon: "devis" },
  { id: "factures", label: "Factures", icon: "factures" },
  { id: "utilisateurs", label: "Utilisateurs", icon: "utilisateurs" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotifs, setShowNotifs] = useState(false);

  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Chargement initial depuis Supabase
    supabase.from("oze_users").select("*").then(({ data }) => {
      if (data && data.length > 0) setUsers(data);
      else setUsers(USERS_INIT); // fallback si table vide
    });

    // Écoute en temps réel — se met à jour sur tous les appareils
    const channel = supabase
      .channel("oze_users_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "oze_users" }, () => {
        supabase.from("oze_users").select("*").then(({ data }) => {
          if (data) setUsers(data);
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);
  const [chantiers, setChantiers] = useState(() => LS.get("oze_chantiers", CHANTIERS_INIT));
  const [pointages, setPointages] = useState(() => LS.get("oze_pointages", []));
  const [devis, setDevis] = useState(() => LS.get("oze_devis", DEVIS_INIT));
  const { notifs, push, markRead, markAllRead, unread } = useNotifications();

  if (!user) return <Login users={users} onLogin={u => { setUser(u); setPage(u.role === "salarie" ? "pointage" : "dashboard"); }} />;

  const menuItems = NAV_ITEMS.filter(n => (MENU_BY_ROLE[user.role] || []).includes(n.id));
  const roleCfg = ROLE_CFG[user.role];

  const renderPage = () => {
    const sharedProps = { user, chantiers, setChantiers, clients: CLIENTS_INIT, users, pointages, setPointages, devis, setDevis, push };
    switch (page) {
      case "dashboard": return <PageDashboard {...sharedProps} />;
      case "chantiers": return <PageChantiers {...sharedProps} />;
      case "pointage": return <PagePointage {...sharedProps} />;
      case "pointage_admin": return <PagePointagesAdmin {...sharedProps} />;
      case "equipe": return (
        <div>
          <div style={{ marginBottom: 24 }}><div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>RH</div><h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", fontFamily: "'Playfair Display',serif", margin: 0 }}>Équipe terrain</h2></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 16 }}>
            {users.filter(u => u.role === "salarie").map(u => (
              <Card key={u.id} style={{ padding: "22px", textAlign: "center", opacity: u.actif ? 1 : .6 }}>
                <div style={{ width: 58, height: 58, borderRadius: "50%", background: u.actif ? `linear-gradient(135deg,${NAVY},#2d4090)` : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: u.actif ? GOLD : "#9ca3af", margin: "0 auto 12px" }}>{u.avatar}</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#111827", marginBottom: 2 }}>{u.nom}</div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>{u.poste || "Agent"}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>{u.tel}</div>
                <span style={{ background: u.actif ? "#dcfce7" : "#f1f5f9", color: u.actif ? "#15803d" : "#9ca3af", padding: "3px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{u.actif ? "Actif" : "Inactif"}</span>
              </Card>
            ))}
          </div>
        </div>
      );
      case "clients": return (
        <div>
          <div style={{ marginBottom: 24 }}><div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Portefeuille</div><h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", fontFamily: "'Playfair Display',serif", margin: 0 }}>Clients</h2></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
            {CLIENTS_INIT.map(c => (
              <Card key={c.id} style={{ padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg,${NAVY},#2d4090)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: GOLD }}>{c.nom[0]}</div>
                  <div><div style={{ fontWeight: 800, fontSize: 14, color: "#111827" }}>{c.nom}</div><div style={{ fontSize: 11, color: "#9ca3af" }}>{c.contact}</div></div>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>📍 {c.adresse}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>📧 {c.email}</div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>TVA : {c.tva}</div>
              </Card>
            ))}
          </div>
        </div>
      );
      case "devis": return <PageDevis {...sharedProps} mode="devis" />;
      case "factures": return <PageDevis {...sharedProps} mode="factures" />;
      case "utilisateurs": return <PageUtilisateurs users={users} setUsers={setUsers} />;
      default: return null;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f1f4f9", fontFamily: "'DM Sans',sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes popIn{from{opacity:0;transform:scale(.93) translateY(8px)}to{opacity:1;transform:none}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        button{font-family:'DM Sans',sans-serif}input,select,textarea{font-family:'DM Sans',sans-serif}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:2px}
        button:active{transform:scale(.97)}
      `}</style>

      {/* SIDEBAR */}
      <div style={{ width: sidebarOpen ? 252 : 70, background: `linear-gradient(180deg,${DARK} 0%,${NAVY} 55%,#0f1e4a 100%)`, display: "flex", flexDirection: "column", transition: "width .25s cubic-bezier(.4,0,.2,1)", flexShrink: 0, overflow: "hidden" }}>
        <div style={{ padding: sidebarOpen ? "22px 20px 18px" : "22px 14px 18px", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg,${GOLD},#d97706)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 14px rgba(245,194,0,.3)` }}>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 900, color: NAVY }}>O</span>
          </div>
          {sidebarOpen && <div><div style={{ color: GOLD, fontWeight: 900, fontSize: 18, fontFamily: "'Playfair Display',serif", lineHeight: 1 }}>OZÉ</div><div style={{ color: "rgba(255,255,255,.3)", fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", marginTop: 2 }}>NETTOYAGE & SERVICES</div></div>}
        </div>

        {sidebarOpen && (
          <div style={{ margin: "10px 10px 4px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: `rgba(245,194,0,.15)`, border: `2px solid rgba(245,194,0,.35)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, color: GOLD, flexShrink: 0 }}>{user.avatar}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.nom}</div>
              <div style={{ marginTop: 2 }}><span style={{ background: roleCfg.bg, color: roleCfg.color, padding: "1px 7px", borderRadius: 20, fontSize: 9, fontWeight: 700 }}>{roleCfg.icon} {roleCfg.label}</span></div>
            </div>
          </div>
        )}

        <nav style={{ flex: 1, padding: "6px 10px", overflowY: "auto" }}>
          {menuItems.map(n => {
            const active = page === n.id;
            return (
              <button key={n.id} onClick={() => setPage(n.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: sidebarOpen ? "10px 13px" : "10px", borderRadius: 10, border: "none", background: active ? "rgba(245,194,0,.1)" : "transparent", color: active ? GOLD : "rgba(255,255,255,.48)", cursor: "pointer", marginBottom: 2, transition: "all .15s", textAlign: "left", justifyContent: sidebarOpen ? "flex-start" : "center", position: "relative", fontFamily: "inherit" }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,.06)"; e.currentTarget.style.color = "#fff"; } }}
                onMouseLeave={e => { e.currentTarget.style.background = active ? "rgba(245,194,0,.1)" : "transparent"; e.currentTarget.style.color = active ? GOLD : "rgba(255,255,255,.48)"; }}>
                <span style={{ flexShrink: 0 }}><Ico n={n.icon} s={17} /></span>
                {sidebarOpen && <span style={{ fontSize: 13, fontWeight: active ? 700 : 600, whiteSpace: "nowrap" }}>{n.label}</span>}
                {sidebarOpen && active && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: GOLD }} />}
                {!sidebarOpen && active && <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 18, borderRadius: 2, background: GOLD }} />}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: "10px 10px 14px", borderTop: "1px solid rgba(255,255,255,.07)" }}>
          <button onClick={() => setUser(null)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: sidebarOpen ? "flex-start" : "center", gap: 10, padding: sidebarOpen ? "9px 13px" : "9px", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "rgba(255,255,255,.38)", cursor: "pointer", fontWeight: 600, fontSize: 12, transition: "all .15s", fontFamily: "inherit" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,.1)"; e.currentTarget.style.color = "#fca5a5"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.03)"; e.currentTarget.style.color = "rgba(255,255,255,.38)"; }}>
            <Ico n="logout" s={16} />{sidebarOpen && "Déconnexion"}
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* TOPBAR */}
        <div style={{ height: 58, background: "#fff", borderBottom: "1.5px solid #f1f5f9", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ padding: 8, borderRadius: 8, border: "none", background: "#f4f6fb", cursor: "pointer", color: "#6b7280", display: "flex" }}><Ico n="menu" s={17} /></button>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>Lyon & Rhône-Alpes</div>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowNotifs(v => !v)} style={{ position: "relative", padding: 8, borderRadius: 8, border: "none", background: unread > 0 ? "#EEF1FA" : "#f4f6fb", cursor: "pointer", color: unread > 0 ? NAVY : "#6b7280", display: "flex" }}><Ico n="bell" s={17} /></button>
            {unread > 0 && <div style={{ position: "absolute", top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, background: GOLD, border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: NAVY, padding: "0 3px" }}>{unread}</div>}
          </div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${NAVY},#2d4090)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: GOLD }}>{user.avatar}</div>
        </div>
        {showNotifs && <NotifPanel notifs={notifs} markRead={markRead} markAllRead={markAllRead} onClose={() => setShowNotifs(false)} />}

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 30px" }}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
