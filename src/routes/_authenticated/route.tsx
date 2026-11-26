import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import { IconText } from "@/components/icon-text";
import { useEffect, useRef, useState } from "react";
import { BackgroundJobsWatcher } from "@/components/background";
import { NotificationCenter } from "@/components/notification-center";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { signOutAndClear } from "@/lib/session-cache";
import { SessionUnverifiedError } from "@/lib/session-check";
import { checkSession } from "@/lib/session";
import { SessionUnverified } from "@/components/session-unverified";
import { useMe } from "@/hooks/use-me";
import { ROLES, type Role } from "@/lib/roles";
import { canUseAdvisor } from "@/lib/advisor";
import {
  AGENT_ICON,
  NAV,
  NAV_GROUPS,
  NAV_ICONS,
  groupOpen,
  isActive,
  visibleItems,
} from "@/lib/nav";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { OrgSwitcher } from "@/components/org-switcher";
import { OrgOnboarding } from "@/components/org-onboarding";
import { AgentProvider, useAgent } from "@/components/agent";
import { useSetup } from "@/hooks/use-setup";
import { useSetupGuide } from "@/hooks/use-setup-guide";
import { useSuggestions } from "@/components/suggestions";
import { useLivePipeline } from "@/hooks/use-live-pipeline";
import { Isotipo, Lockup } from "@/components/brand";
import { AppPending } from "@/components/app-pending";
import { useTheme } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavAdvanced } from "@/hooks/use-nav-advanced";
import { exitDemoMode, isDemoMode } from "@/lib/demo-mode";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // One GET /auth/v1/user per session token, not per navigation (NK-0098, src/lib/session-check.ts).
  // Only "none" goes to /auth; "unverified" (network, 5xx) keeps the session and shows a retry screen (NK-0112).
  beforeLoad: async () => {
    const session = await checkSession();
    if (session.status === "none") throw redirect({ to: "/auth" });
    if (session.status === "unverified") throw new SessionUnverifiedError();
  },
  // Only the guard's own error is handled here; any other error keeps going to the root boundary as before.
  errorComponent: ({ error }) => {
    if (error instanceof SessionUnverifiedError) return <SessionUnverified />;
    throw error;
  },
  // First load or reload: this route is client-only, so without a pending state nothing paints until the guard answers.
  pendingComponent: AppPending,
  pendingMs: 0,
  component: Shell,
});

function Shell() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  // Ronda 3B: local demo mode (dev server only). Leaving it reloads /auth so no demo cache or patch survives.
  const demo = import.meta.env.DEV && isDemoMode();
  function leaveDemo() {
    exitDemoMode();
    window.location.replace("/auth");
  }
  async function signOut() {
    if (demo) return leaveDemo();
    await signOutAndClear(qc, supabase.auth);
    navigate({ to: "/auth", replace: true });
  }
  const role = me?.roles[0] as Role | undefined;
  const hasOrg = !!me?.currentOrg;
  useLivePipeline(demo ? undefined : me?.currentOrg?.org_id);
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useCollapsedSidebar();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const current = NAV.find((n) => isActive(path, n.to))?.label;
  const [paletteOpen, setPaletteOpen] = useCommandPalette();
  const [openGroups, setOpenGroups] = useOpenGroups();
  const leader = canUseAdvisor(me?.roles ?? []);
  const [advanced, setAdvanced] = useNavAdvanced(me?.user.id);
  const { data: sugg = [] } = useSuggestions();

  // Close the mobile menu whenever the route changes (links, back button, redirects).
  useEffect(() => setNavOpen(false), [path]);

  // Swipe left on the open drawer closes it.
  const touchX = useRef<number | null>(null);
  const swipe = {
    onTouchStart: (e: React.TouchEvent) => {
      touchX.current = e.touches[0].clientX;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchX.current != null && e.changedTouches[0].clientX - touchX.current < -60)
        setNavOpen(false);
      touchX.current = null;
    },
  };

  // Same sidebar content on desktop (fixed column) and on mobile (drawer under the top bar).
  const linkClass =
    "my-0.5 flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-base text-ink-mid transition-colors hover:bg-paper-sunk hover:text-ink data-[status=active]:bg-lime-soft data-[status=active]:font-semibold data-[status=active]:text-ink md:min-h-0 md:py-1.5 md:text-sm";
  const sidebar = (mobile: boolean) => (
    <>
      {!mobile && (
        <div className="px-5 pb-4 pt-6">
          <Lockup />
        </div>
      )}
      {me && hasOrg && (
        <OrgSwitcher
          memberships={me.memberships}
          archived={me.archived}
          current={me.currentOrg}
          userId={me.user.id}
        />
      )}
      <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-2" aria-label="Secciones">
        {hasOrg &&
          NAV_GROUPS.map((g) => {
            const items = visibleItems(g, leader, advanced);
            const open = groupOpen({ ...g, items }, path, openGroups[g.key]);
            return (
              <div key={g.key} className={g.collapsible ? "mt-3" : ""}>
                {g.collapsible && (
                  <button
                    type="button"
                    onClick={() => setOpenGroups({ ...openGroups, [g.key]: !open })}
                    aria-expanded={open}
                    className="flex min-h-11 w-full items-center rounded-md px-3 text-xs font-medium text-ink-faint hover:text-ink md:min-h-8"
                  >
                    <IconText icon={open ? ChevronDown : ChevronRight}>{g.title}</IconText>
                  </button>
                )}
                {open &&
                  items.map((n) => {
                    const icon = NAV_ICONS[n.to];
                    const badge = n.to === "/inbox" ? sugg.length : 0;
                    return (
                      <Link
                        key={n.to}
                        to={n.to as never}
                        className={`${linkClass} ${g.collapsible ? "pl-[2.125rem]" : ""}`}
                      >
                        {icon ? (
                          <IconText icon={icon} size="nav">
                            {n.label}
                          </IconText>
                        ) : (
                          n.label
                        )}
                        {badge > 0 && (
                          <span
                            className="ml-auto rounded-full bg-paper-sunk px-1.5 font-mono text-xs tabular-nums text-ink"
                            aria-label={`${badge} sugerencias pendientes`}
                          >
                            {badge > 99 ? "99+" : badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
              </div>
            );
          })}
      </nav>
      {hasOrg && <SetupPill />}
      <UserMenu
        name={me?.profile?.full_name ?? ""}
        role={role ? (ROLES[role]?.label ?? "") : ""}
        advanced={advanced}
        onAdvanced={setAdvanced}
        onCollapse={mobile ? undefined : () => setCollapsed(true)}
        onSignOut={signOut}
      />
    </>
  );

  return (
    <AgentProvider>
      <BackgroundJobsWatcher userId={me?.user.id} />
      <div className="flex min-h-screen flex-col md:flex-row">
        {/* Mobile top bar: brand + current section + menu toggle. It stays above the drawer so ☰/✕ always works. */}
        <header
          className={`sticky top-0 ${navOpen ? "z-[60]" : "z-30"} border-b border-hairline bg-sidebar pt-[env(safe-area-inset-top)] text-sidebar-foreground md:hidden`}
        >
          <div className="flex h-14 items-center justify-between gap-1 px-2.5 min-[400px]:gap-3 min-[400px]:px-4">
            <Link to="/home" className="shrink-0" aria-label="Inicio">
              <Lockup />
            </Link>
            {current && (
              <span className="hidden min-w-0 truncate text-sm text-ink-mid min-[420px]:inline">
                {current}
              </span>
            )}
            {/* «Cerrar» is ~5 px wider than «Menú»: with the drawer open, below 400 px «Buscar» steps aside so the bar
                fits at 360 px (measured 2026-11-21: 366 px page with «Avisos · 9+»). It comes back when the drawer closes. */}
            <button
              onClick={() => setPaletteOpen(true)}
              aria-label="Buscar"
              className={`ml-auto ${navOpen ? "hidden min-[400px]:flex" : "flex"} min-h-11 min-w-11 shrink-0 items-center justify-center px-1 text-sm text-ink-mid`}
            >
              Buscar
            </button>
            <NotificationCenter
              userId={me?.user.id}
              className={navOpen ? "ml-auto shrink-0 min-[400px]:ml-0" : "shrink-0"}
            />
            <button
              onClick={() => setNavOpen((o) => !o)}
              aria-label={navOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={navOpen}
              aria-controls="mobile-nav"
              className="-mr-2 flex h-11 shrink-0 items-center justify-center px-1 text-sm text-ink"
            >
              <IconText icon={navOpen ? X : Menu} size="nav">
                {navOpen ? "Cerrar" : "Menú"}
              </IconText>
            </button>
          </div>
        </header>
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent
            id="mobile-nav"
            side="left"
            {...swipe}
            // Starts under the top bar; the bar's ✕ closes it (the sheet's own X is hidden).
            className="top-[calc(3.5rem+env(safe-area-inset-top))] flex h-auto w-[85vw] max-w-xs flex-col gap-0 border-hairline bg-sidebar p-0 text-sidebar-foreground md:hidden [&>button:first-child]:sr-only [&>button:first-child]:focus:not-sr-only"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <SheetTitle className="sr-only">Menú</SheetTitle>
            {sidebar(true)}
          </SheetContent>
        </Sheet>

        {/* Desktop/tablet: full sidebar, or a slim rail when closed (remembered per browser). */}
        {collapsed ? (
          <aside className="sticky top-0 hidden h-screen w-14 shrink-0 flex-col items-center gap-4 border-r border-hairline bg-sidebar py-6 text-sidebar-foreground md:flex">
            <Link to="/home" aria-label="Inicio">
              <Isotipo className="size-8" />
            </Link>
            <button
              onClick={() => setCollapsed(false)}
              aria-label="Abrir menú"
              title="Abrir menú"
              className="flex size-9 items-center justify-center text-lg text-ink-mid hover:text-ink"
            >
              ›
            </button>
          </aside>
        ) : (
          <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-hairline bg-sidebar text-sidebar-foreground md:flex">
            {sidebar(false)}
          </aside>
        )}
        <main className="min-w-0 flex-1">
          {demo && <DemoBanner onExit={leaveDemo} />}
          {hasOrg && <TopBar onSearch={() => setPaletteOpen(true)} userId={me?.user.id} />}
          {!me ? null : hasOrg ? (
            <Outlet key={me.currentOrg?.org_id} />
          ) : (
            <OrgOnboarding memberships={me.memberships} archived={me.archived} />
          )}
        </main>
        {hasOrg && <BottomBar />}
        {hasOrg && <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />}
      </div>
    </AgentProvider>
  );
}

/** Ronda 3B: reminds that the data is fictitious and nothing reaches Supabase; «Salir» ends the demo. */
function DemoBanner({ onExit }: { onExit: () => void }) {
  return (
    <div
      role="status"
      className="flex min-h-11 items-center justify-between gap-3 border-b border-hairline bg-lime-soft px-4 text-sm text-ink md:px-6 lg:px-10"
    >
      <span className="min-w-0 truncate">
        <strong className="font-semibold">Modo demo local</strong>
        <span className="hidden text-ink-mid sm:inline"> · datos ficticios, nada se guarda</span>
      </span>
      <button
        type="button"
        onClick={onExit}
        className="min-h-11 shrink-0 px-1 font-medium underline decoration-hairline-firm underline-offset-4"
      >
        Salir
      </button>
    </div>
  );
}

/** Desktop top bar: search (⌘K), the agent (⌘J) and notices, out of the way of the content. */
function TopBar({ onSearch, userId }: { onSearch: () => void; userId: string | undefined }) {
  const { open } = useAgent();
  return (
    <div className="sticky top-0 z-30 hidden h-14 items-center gap-3 border-b border-hairline bg-background/85 px-6 backdrop-blur md:flex lg:px-10">
      <button
        onClick={onSearch}
        className="flex h-9 w-full max-w-md items-center justify-between rounded-lg border border-hairline bg-card px-3 text-sm text-ink-faint shadow-xs hover:border-hairline-firm"
      >
        Buscar cuentas, leads, pantallas…
        <kbd className="rounded-md bg-paper-sunk px-1.5 py-0.5 text-xs font-medium text-ink-mid">
          ⌘K
        </kbd>
      </button>
      <div className="ml-auto flex items-center gap-4">
        <NotificationCenter userId={userId} />
        <button
          onClick={() => open()}
          className="flex h-9 items-center gap-2 rounded-lg bg-ink px-3 text-sm font-semibold text-ink-reverse hover:bg-ink/85"
          aria-label="Abrir agente GTM"
        >
          Agente <kbd className="rounded bg-ink-reverse/15 px-1.5 text-xs">⌘J</kbd>
        </button>
      </div>
    </div>
  );
}

/** Which collapsible menu groups are open, remembered in this browser. */
function useOpenGroups() {
  const KEY = "nokko-nav-groups";
  const [v, set] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      set(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
    } catch {
      /* ignore */
    }
  }, []);
  const save = (n: Record<string, boolean>) => {
    set(n);
    try {
      localStorage.setItem(KEY, JSON.stringify(n));
    } catch {
      /* ignore */
    }
  };
  return [v, save] as const;
}

/** Sidebar open/closed on desktop, remembered in this browser (best effort: storage can be blocked). */
function useCollapsedSidebar() {
  const KEY = "nokko-sidebar-collapsed";
  const [collapsed, set] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });
  const setCollapsed = (v: boolean) => {
    set(v);
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };
  // ⌘/Ctrl + B toggles it, like most editors.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "b" &&
        !(e.target as HTMLElement)?.closest?.("input, textarea, [contenteditable=true]")
      ) {
        e.preventDefault();
        set((c) => {
          const v = !c;
          try {
            localStorage.setItem(KEY, v ? "1" : "0");
          } catch {
            /* ignore */
          }
          return v;
        });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return [collapsed, setCollapsed] as const;
}

/** Mobile bottom bar: the four places used most plus the agent, one thumb away (icon over label, 60 px tall). */
function BottomBar() {
  const { open } = useAgent();
  const { data: sugg = [] } = useSuggestions();
  const tabs = [
    { to: "/home", label: "Inicio", badge: 0 },
    { to: "/inbox", label: "Bandeja", badge: sugg.length },
    { to: "/leads", label: "Leads", badge: 0 },
    { to: "/deals", label: "Pipeline", badge: 0 },
  ] as const;
  const item =
    "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center border-t-2 border-transparent text-xs leading-tight text-ink-mid";
  const stack = "max-w-full flex-col [&>span]:max-w-full [&>span]:truncate";
  return (
    <nav
      aria-label="Accesos rápidos"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(3.75rem+env(safe-area-inset-bottom))] border-t border-hairline bg-sidebar pb-[env(safe-area-inset-bottom)] text-sidebar-foreground md:hidden"
    >
      {tabs.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className={`${item} relative data-[status=active]:border-ink data-[status=active]:font-semibold data-[status=active]:text-ink`}
        >
          <IconText icon={NAV_ICONS[t.to]} size="nav" className={stack}>
            {t.label}
          </IconText>
          {t.badge > 0 && (
            <span
              className="absolute left-1/2 top-1 ml-2 rounded-full bg-signal px-1 text-xs font-semibold tabular-nums leading-4 text-ink-reverse"
              aria-label={`${t.badge} pendientes`}
            >
              {t.badge > 9 ? "9+" : t.badge}
            </span>
          )}
        </Link>
      ))}
      <button onClick={() => open()} className={item} aria-label="Abrir agente GTM">
        <IconText icon={AGENT_ICON} size="nav" className={stack}>
          Agente
        </IconText>
      </button>
    </nav>
  );
}

/** Discreet setup state under the menu: «Configuración X/Y» until every milestone is done, then nothing. */
function SetupPill() {
  const { data } = useSetup();
  const { nextStep } = useSetupGuide();
  const items = data?.status.items;
  if (!items?.length) return null;
  const done = items.filter((i) => i.done).length;
  if (done >= items.length) return null;
  const next = nextStep?.label.split(" (")[0];
  return (
    <div className="px-3 pb-3">
      <Link
        to="/setup"
        title={next ? `Siguiente: ${next}` : undefined}
        className="flex min-h-11 items-center justify-between gap-2 rounded-full border border-hairline px-3 text-xs text-ink-mid hover:border-hairline-firm hover:text-ink md:min-h-8"
      >
        <span>Configuración</span>
        <span className="font-mono font-semibold tabular-nums text-ink">
          {done}/{items.length}
        </span>
      </Link>
    </div>
  );
}

/** Sidebar footer: who you are, and the personal preferences (advanced links, theme, fold) behind one menu. */
function UserMenu({
  name,
  role,
  advanced,
  onAdvanced,
  onCollapse,
  onSignOut,
}: {
  name: string;
  role: string;
  advanced: boolean;
  onAdvanced: (v: boolean) => void;
  onCollapse: (() => void) | undefined;
  onSignOut: () => void;
}) {
  const { theme, setTheme } = useTheme();
  return (
    <div className="border-t border-hairline p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:pb-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex min-h-11 w-full min-w-0 flex-col items-start justify-center rounded-lg px-3 py-1.5 text-left text-sm hover:bg-paper-sunk"
          >
            <span className="w-full truncate font-medium">{name || "Tu cuenta"}</span>
            {role && <span className="eyebrow w-full truncate">{role}</span>}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuLabel className="truncate">{name || "Tu cuenta"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={advanced}
            onCheckedChange={(v) => onAdvanced(v === true)}
            onSelect={(e) => e.preventDefault()}
          >
            Modo avanzado
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={theme === "dark"}
            onCheckedChange={(v) => setTheme(v === true ? "dark" : "light")}
            onSelect={(e) => e.preventDefault()}
          >
            Modo oscuro
          </DropdownMenuCheckboxItem>
          {onCollapse && (
            <DropdownMenuItem onSelect={onCollapse}>
              Plegar menú
              <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onSignOut}>Cerrar sesión</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
