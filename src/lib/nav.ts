// Ronda 2A: six fixed daily entries, a discreet «Estrategia» group and everything else under «Más».
// Advanced hides links, never routes or permissions. paletteOnly links (Onboarding, Configuración) leave the
// sidebar (the setup pill leads there) but stay in ⌘K. The shell and the full command palette share this catalogue.
import {
  Building2,
  Cable,
  ChartLine,
  House,
  Inbox,
  Sparkles,
  Spline,
  SquareKanban,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  leadersOnly?: boolean;
  advancedOnly?: boolean;
  /** Reachable from ⌘K (and the setup pill) but not listed in the sidebar. */
  paletteOnly?: boolean;
  keywords?: string;
};
export type NavGroup = {
  key: "daily" | "strategy" | "more";
  title: string;
  collapsible: boolean;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "daily",
    title: "Hoy",
    collapsible: false,
    items: [
      { to: "/home", label: "Inicio", keywords: "hoy resumen" },
      { to: "/inbox", label: "Bandeja", keywords: "sugerencias propuestas pendientes" },
      { to: "/accounts", label: "Cuentas", keywords: "empresas clientes" },
      { to: "/leads", label: "Leads", keywords: "entrada prospectos" },
      { to: "/deals", label: "Pipeline", keywords: "deals oportunidades" },
      { to: "/metrics", label: "Métricas", keywords: "cac payback funnel" },
    ],
  },
  {
    key: "strategy",
    title: "Estrategia",
    collapsible: true,
    items: [
      { to: "/strategy", label: "Estrategia GTM", keywords: "icp segmentos posicionamiento" },
      {
        to: "/plays",
        label: "Plays",
        keywords: "plays gtm jugadas señales automatizaciones equipos grupos",
      },
      { to: "/products", label: "Productos" },
      { to: "/hub", label: "Conocimiento" },
    ],
  },
  {
    key: "more",
    title: "Más",
    collapsible: true,
    items: [
      { to: "/approvals", label: "Aprobaciones" },
      { to: "/replies", label: "Respuestas", keywords: "gmail email bandeja" },
      { to: "/people", label: "Personas", keywords: "contactos" },
      { to: "/abm", label: "ABM y partners" },
      { to: "/discoveries", label: "Descubiertos" },
      { to: "/advisor", label: "Asesor GTM", leadersOnly: true },
      { to: "/cycle", label: "Ciclo GTM", advancedOnly: true },
      { to: "/debates", label: "Debates", advancedOnly: true },
      { to: "/theory-u", label: "Theory U", advancedOnly: true },
      { to: "/company", label: "Empresa", keywords: "ajustes" },
      { to: "/team", label: "Equipo", keywords: "ajustes miembros invitaciones" },
      { to: "/integrations", label: "Conexiones", keywords: "ajustes integraciones" },
      { to: "/memory", label: "Memoria", keywords: "ajustes" },
      {
        to: "/onboarding",
        label: "Onboarding",
        paletteOnly: true,
        keywords: "empezar lectura fuentes",
      },
      { to: "/setup", label: "Configuración", paletteOnly: true, keywords: "setup ajustes" },
    ],
  },
];

export const ASSISTANTS_NAV: NavItem = { to: "/connect", label: "Conectar asistentes" };
export const NAV: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), ASSISTANTS_NAV];
export const isActive = (path: string, to: string) => path === to || path.startsWith(`${to}/`);

/** NK-0168: one icon per concept, always rendered with its label through IconText. */
export const NAV_ICONS: Record<string, LucideIcon> = {
  "/home": House,
  "/inbox": Inbox,
  "/accounts": Building2,
  "/leads": UserPlus,
  "/deals": SquareKanban,
  "/metrics": ChartLine,
  "/theory-u": Spline,
  "/connect": Cable,
};
/** The agent is an action, not a route; same icon wherever it is offered as a tab. */
export const AGENT_ICON: LucideIcon = Sparkles;

/** Items this person may see in a group of the sidebar. */
export const visibleItems = (g: NavGroup, isLeader: boolean, advanced = false) =>
  g.items.filter(
    (i) => !i.paletteOnly && (!i.leadersOnly || isLeader) && (!i.advancedOnly || advanced),
  );

/** A collapsible group opens when you are on one of its pages, or when you left it open. */
export const groupOpen = (g: NavGroup, path: string, saved: boolean | undefined) =>
  !g.collapsible || g.items.some((i) => isActive(path, i.to)) || !!saved;
