import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { validatedUser } from "@/lib/session";
import { isSessionEnding } from "@/lib/session-ending";
import { currencySymbol, formatMoney } from "@/lib/money";
import { demoMe, isDemoMode } from "@/lib/demo-mode";

export type Membership = {
  org_id: string;
  role: string;
  name: string;
  currency: string;
  website: string | null;
  archived: boolean;
};

type MemberRow = {
  org_id: string;
  role: string;
  organizations: {
    name: string;
    currency: string;
    website: string | null;
    archived_at: string | null;
  } | null;
};

/** The signed-in user, their companies and the current one. Shared by useMe and the route loaders. */
export const meQuery = queryOptions({
  queryKey: ["me"],
  // Remounts (mobile drawer, every screen) reuse the cache; session changes invalidate it (__root).
  staleTime: 5 * 60_000,
  queryFn: async () => {
    // Sign-out in progress: «no user» is the true answer, and no read leaves with the old token (NK-0169/F4).
    if (isSessionEnding()) return null;
    // Ronda 3B: local demo (dev server only): the fictitious «Demo GTM» company, no Supabase account.
    if (import.meta.env.DEV && isDemoMode()) return demoMe();
    // Per-token validated user shared with the route guard: no extra /auth/v1/user per navigation.
    const user = await validatedUser();
    if (!user) {
      // Signed out: null is a real answer. A local session that failed validation (blip, refusal) is not:
      // throw so it is never cached as fresh «no user» for the stale window (NK-0098).
      const { data } = await supabase.auth.getSession();
      if (data.session) throw new Error("No se pudo validar la sesión. Vuelve a intentarlo.");
      return null;
    }
    // Signed out (or switched) while we were validating: never query with the old user's id, and never
    // cache «no user» for the stale window: reject, and the session event that caused it refetches (NK-0115).
    const stillSame = async () =>
      (await supabase.auth.getSession()).data.session?.user.id === user.id;
    const changed = () =>
      new Error("La sesión ha cambiado mientras se cargaba. Vuelve a intentarlo.");
    if (!(await stillSame())) throw changed();
    if (isSessionEnding()) return null;
    // Joins any company that invited this email before loading memberships.
    await supabase.rpc("accept_invites");
    if (!(await stillSame())) throw changed();
    if (isSessionEnding()) return null;
    const [{ data: profile }, { data: members }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("org_members")
        .select("org_id, role, organizations(name, currency, website, archived_at)")
        .eq("user_id", user.id),
    ]);
    const all: Membership[] = (members ?? []).map((m: MemberRow) => ({
      org_id: m.org_id,
      role: m.role,
      name: m.organizations?.name ?? "",
      currency: m.organizations?.currency ?? "EUR",
      website: m.organizations?.website ?? null,
      archived: !!m.organizations?.archived_at,
    }));
    const archived = all.filter((m) => m.archived);
    const memberships = all.filter((m) => !m.archived);
    const currentOrgId = profile?.current_org_id ?? null;
    const current = memberships.find((m) => m.org_id === currentOrgId) ?? null;
    return {
      user,
      profile,
      memberships,
      archived,
      currentOrg: current,
      roles: current ? [current.role] : [],
    };
  },
});

export function useMe() {
  return useQuery(meQuery);
}

/** Currency of the current company plus formatters bound to it. */
export function useCurrency() {
  const { data: me } = useMe();
  const currency = me?.currentOrg?.currency ?? "EUR";
  return {
    currency,
    symbol: currencySymbol(currency),
    money: (n: number, compact = false) => formatMoney(n, currency, compact),
  };
}
