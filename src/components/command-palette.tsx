// ⌘K: go to any screen, open a record of the current company, or ask the agent. Records are searched
// through the browser client, so RLS keeps them to the current company.
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useAgent } from "@/components/agent";
import { useMe } from "@/hooks/use-me";
import { canUseAdvisor } from "@/lib/advisor";
import { NAV_GROUPS, type NavGroup } from "@/lib/nav";
import { hitTarget, paletteItems, type HitKind } from "@/lib/palette";

// The sidebar's «Hoy» has no visible title and «Más» only means something next to the menu.
const PALETTE_HEADINGS: Record<NavGroup["key"], string> = {
  daily: "Ir a",
  strategy: "Estrategia",
  more: "Más pantallas",
};

type Hit = { kind: HitKind; id: string; name: string; sub: string | null };

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return [open, setOpen] as const;
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const agent = useAgent();
  const { data: me } = useMe();
  const [q, setQ] = useState("");
  const term = q.trim();
  const { data: hits = [] } = useQuery({
    queryKey: ["palette", me?.currentOrg?.org_id, term],
    enabled: open && term.length >= 2,
    staleTime: 30_000,
    queryFn: async (): Promise<Hit[]> => {
      const like = `%${term.replace(/[%_]/g, "")}%`;
      const [a, l, p, d] = await Promise.all([
        supabase.from("accounts").select("id,name,domain").ilike("name", like).limit(5),
        supabase
          .from("leads")
          .select("id,company,contact_name")
          .or(`company.ilike.${like},contact_name.ilike.${like}`)
          .limit(5),
        supabase.from("people").select("id,full_name,title").ilike("full_name", like).limit(5),
        supabase.from("deals").select("id,name").ilike("name", like).limit(5),
      ]);
      return [
        ...(a.data ?? []).map((r) => ({
          kind: "Cuenta" as const,
          id: r.id,
          name: r.name,
          sub: r.domain,
        })),
        ...(l.data ?? []).map((r) => ({
          kind: "Lead" as const,
          id: r.id,
          name: r.company || r.contact_name || "Lead",
          sub: r.company ? r.contact_name : null,
        })),
        ...(p.data ?? []).map((r) => ({
          kind: "Persona" as const,
          id: r.id,
          name: r.full_name ?? "Persona",
          sub: r.title,
        })),
        ...(d.data ?? []).map((r) => ({
          kind: "Deal" as const,
          id: r.id,
          name: r.name,
          sub: null,
        })),
      ];
    },
  });

  function go(fn: () => void) {
    onOpenChange(false);
    setQ("");
    fn();
  }
  function openHit(h: Hit) {
    go(() => navigate(hitTarget(h) as never));
  }
  const leader = canUseAdvisor(me?.roles ?? []);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Busca una cuenta, un lead, una pantalla… o pregunta al agente"
        value={q}
        onValueChange={setQ}
      />
      <CommandList>
        <CommandEmpty>Nada con ese nombre.</CommandEmpty>
        {hits.length > 0 && (
          <CommandGroup heading="Registros">
            {hits.map((h) => (
              <CommandItem
                key={`${h.kind}-${h.id}`}
                value={`${h.kind} ${h.name} ${h.sub ?? ""} ${h.id}`}
                onSelect={() => openHit(h)}
              >
                <span className="truncate">{h.name}</span>
                {h.sub && <span className="truncate text-xs text-muted-foreground">{h.sub}</span>}
                <CommandShortcut>{h.kind}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Acciones">
          <CommandItem
            value={`agente preguntar ${term}`}
            onSelect={() => go(() => agent.open(term ? { prompt: term, fresh: true } : {}))}
          >
            {term ? `Preguntar al agente: «${term}»` : "Abrir el agente"}
            <CommandShortcut>⌘J</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="nuevo lead entrada"
            onSelect={() => go(() => navigate({ to: "/leads/entrada" }))}
          >
            Añadir o importar leads
          </CommandItem>
          <CommandItem
            value="buscar empresas icp descubiertos"
            onSelect={() => go(() => navigate({ to: "/discoveries" }))}
          >
            Buscar empresas por ICP
          </CommandItem>
        </CommandGroup>
        {NAV_GROUPS.map((g) => (
          <CommandGroup key={g.key} heading={PALETTE_HEADINGS[g.key]}>
            {paletteItems(g, leader).map((n) => (
              <CommandItem
                key={n.to}
                value={`${n.label} ${n.keywords ?? ""}`}
                onSelect={() => go(() => navigate({ to: n.to as never }))}
              >
                {n.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
