// ⌘K destinations: where a record hit opens, and screens reachable from ⌘K outside the menu (src/lib/nav.ts).
import { ASSISTANTS_NAV, type NavGroup } from "./nav";

/** ⌘K lists the complete role-filtered catalogue: advanced and sidebar-hidden (paletteOnly) links included. */
export function paletteItems(group: NavGroup, leader: boolean) {
  const items = group.items.filter((i) => !i.leadersOnly || leader);
  return group.key === "more" ? [...items, ASSISTANTS_NAV] : items;
}
export type HitKind = "Cuenta" | "Lead" | "Persona" | "Deal";

export function hitTarget(h: { kind: HitKind; id: string }) {
  switch (h.kind) {
    case "Cuenta":
      return { to: "/accounts/$id", params: { id: h.id } } as const;
    case "Deal":
      return { to: "/deals", search: { deal: h.id } } as const;
    case "Lead":
      return { to: "/leads", search: { lead: h.id } } as const;
    case "Persona":
      return { to: "/people", search: { persona: h.id } } as const;
  }
}

export const PALETTE_SCREENS = [
  { to: "/replies", label: "Respuestas de tus leads", keywords: "bandeja respuestas gmail email" },
  {
    to: "/onboarding",
    label: "Onboarding",
    keywords: "configurar empezar lectura fuentes estrategia",
  },
] as const;
