import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { causalChain, genericPhrases, signalLine } from "@/lib/daily-queue";
import {
  DEMO_EXCLUDED_DOMAINS,
  DEMO_ORG_ID,
  DEMO_ORG_NAME,
  DEMO_USER_ID,
  buildDemoData,
  demoMe,
  demoRest,
  enterDemoMode,
  exitDemoMode,
  isDemoMode,
  resetDemoData,
} from "@/lib/demo-mode";

const BASE = "https://demo.supabase.co";
const get = (path: string, accept = "application/json", prefer = "") =>
  demoRest("GET", new URL(BASE + path), new Headers({ accept, prefer }), null);

describe("demo mode state", () => {
  afterEach(() => exitDemoMode());

  it("is off by default and toggles per tab in the dev server", () => {
    expect(isDemoMode()).toBe(false);
    expect(enterDemoMode()).toBe(true);
    expect(isDemoMode()).toBe(true);
    exitDemoMode();
    expect(isDemoMode()).toBe(false);
  });

  it("never turns on outside the dev server (production build)", () => {
    vi.stubEnv("DEV", false);
    try {
      expect(enterDemoMode()).toBe(false);
      sessionStorage.setItem("nokko-demo-local", "1");
      expect(isDemoMode()).toBe(false);
    } finally {
      vi.unstubAllEnvs();
      sessionStorage.removeItem("nokko-demo-local");
    }
  });

  it("is the owner of the fictitious «Demo GTM» company", () => {
    const me = demoMe();
    expect(me.currentOrg.name).toBe(DEMO_ORG_NAME);
    expect(me.roles).toEqual(["owner"]);
    expect(me.profile.current_org_id).toBe(DEMO_ORG_ID);
  });
});

describe("demo dataset", () => {
  it("has real numbers for Inicio, Bandeja, Pipeline, Cuentas and Estrategia", () => {
    const db = buildDemoData(new Date("2026-11-26T08:00:00Z"));
    expect(db.deals!.length).toBeGreaterThanOrEqual(8);
    expect(db.accounts!.length).toBeGreaterThanOrEqual(6);
    expect(db.suggestions!.filter((s) => s.status === "pending").length).toBeGreaterThan(0);
    expect(db.meetings!.some((m) => String(m.scheduled_at) > "2026-11-26")).toBe(true);
    expect(db.segments!.length).toBeGreaterThan(0);
    expect(db.positioning!.length).toBe(1);
    // Every deal points to an existing account.
    const ids = new Set(db.accounts!.map((a) => a.id));
    expect(db.deals!.every((d) => ids.has(d.account_id))).toBe(true);
  });
});

describe("demo V2 causal chain", () => {
  const db = buildDemoData(new Date("2026-11-26T08:00:00Z"));

  it("every suggestion carries tier, hypothesis, exact signal, a human draft and the reason", () => {
    for (const s of db.suggestions!) {
      const c = causalChain(s);
      expect(c?.tier === "Tier 1 · ABM" || c?.tier === "Tier 2").toBe(true);
      expect(c?.hypothesis).toBeTruthy();
      expect(signalLine(c!)?.split(" · ")).toHaveLength(3);
      expect(c?.pedagogyReason).toBeTruthy();
      expect(c?.draftMessage?.length).toBeLessThan(450);
      expect(genericPhrases(c!.draftMessage!)).toEqual([]);
    }
    expect(db.suggestions!.some((s) => s.tier === "Tier 1 · ABM")).toBe(true);
    expect(db.suggestions!.some((s) => s.tier === "Tier 2")).toBe(true);
  });

  it("accounts and deals carry the tier and hypothesis without touching the A/B/C tier column", () => {
    expect(db.accounts!.every((a) => ["A", "B", "C"].includes(String(a.tier)))).toBe(true);
    expect(db.accounts!.every((a) => a.gtmTier && a.hypothesis)).toBe(true);
    expect(db.deals!.every((d) => d.tier && d.hypothesis)).toBe(true);
  });

  it("excludes 14 domains: customers and investors", () => {
    expect(DEMO_EXCLUDED_DOMAINS).toHaveLength(14);
    expect(new Set(DEMO_EXCLUDED_DOMAINS.map((d) => d.reason))).toEqual(
      new Set(["cliente", "inversor"]),
    );
  });
});

describe("demoRest (PostgREST answers from the dataset)", () => {
  beforeEach(() => resetDemoData(new Date("2026-11-26T08:00:00Z")));

  it("filters, orders and limits like PostgREST", () => {
    const r = get("/rest/v1/deals?select=id,stage,amount&stage=eq.won&order=amount.desc");
    const rows = r.body as { stage: string; amount: number }[];
    expect(rows.length).toBe(2);
    expect(rows.every((d) => d.stage === "won")).toBe(true);
    expect(rows[0]!.amount).toBeGreaterThan(rows[1]!.amount);
    const limited = get(
      "/rest/v1/meetings?select=*&scheduled_at=gte.2026-11-25&order=scheduled_at&limit=2",
    );
    expect((limited.body as unknown[]).length).toBe(2);
  });

  it("supports or=() and in.()", () => {
    const or = get(
      `/rest/v1/suggestions?select=*&status=eq.pending&or=(user_id.is.null,user_id.eq.${DEMO_USER_ID})`,
    );
    expect((or.body as unknown[]).length).toBe(5);
    const inList = get("/rest/v1/deals?select=id&stage=in.(won,lost)");
    expect((inList.body as unknown[]).length).toBe(3);
  });

  it("embeds many-to-one and one-to-many resources", () => {
    const deals = get("/rest/v1/deals?select=*,accounts(name,domain)").body as {
      accounts: { name: string } | null;
    }[];
    expect(deals[0]!.accounts?.name).toBeTruthy();
    const members = get(
      `/rest/v1/org_members?select=org_id,role,organizations(name)&user_id=eq.${DEMO_USER_ID}`,
    ).body as { organizations: { name: string } }[];
    expect(members[0]!.organizations.name).toBe(DEMO_ORG_NAME);
    const accounts = get("/rest/v1/accounts?select=*,deals(amount),stakeholders(id)").body as {
      deals: unknown[];
    }[];
    expect(accounts.some((a) => a.deals.length > 0)).toBe(true);
  });

  it("answers single() with one object or a PGRST116 error", () => {
    const one = get(
      `/rest/v1/profiles?select=*&id=eq.${DEMO_USER_ID}`,
      "application/vnd.pgrst.object+json",
    );
    expect(one.status).toBe(200);
    expect((one.body as { full_name: string }).full_name).toBe("Laura Demo");
    const none = get(
      "/rest/v1/profiles?select=*&id=eq.nobody",
      "application/vnd.pgrst.object+json",
    );
    expect(none.status).toBe(406);
  });

  it("reports counts in content-range and returns [] for unknown tables", () => {
    const r = get(
      "/rest/v1/approvals?select=id&status=eq.pending",
      "application/json",
      "count=exact",
    );
    expect(r.headers?.["content-range"]).toBe("0-1/2");
    expect(get("/rest/v1/whatever?select=*").body).toEqual([]);
  });

  it("keeps writes in memory only", () => {
    const h = new Headers({ prefer: "return=representation" });
    const ins = demoRest("POST", new URL(`${BASE}/rest/v1/tasks?select=id`), h, { title: "Nueva" });
    expect(ins.status).toBe(201);
    const [created] = ins.body as { id: string; org_id: string }[];
    expect(created!.org_id).toBe(DEMO_ORG_ID);
    demoRest("PATCH", new URL(`${BASE}/rest/v1/tasks?id=eq.${created!.id}`), h, { done: true });
    const after = get(`/rest/v1/tasks?select=*&id=eq.${created!.id}`).body as { done: boolean }[];
    expect(after[0]!.done).toBe(true);
    demoRest("DELETE", new URL(`${BASE}/rest/v1/tasks?id=eq.${created!.id}`), new Headers(), null);
    expect(get(`/rest/v1/tasks?select=*&id=eq.${created!.id}`).body).toEqual([]);
  });

  it("answers auth and rpc locally", () => {
    expect((get("/auth/v1/user").body as { id: string }).id).toBe(DEMO_USER_ID);
    expect(
      demoRest("POST", new URL(`${BASE}/rest/v1/rpc/accept_invites`), new Headers(), {}).body,
    ).toBeNull();
  });
});

describe("wiring (source guards)", () => {
  const src = (p: string) => readFileSync(resolve(__dirname, p), "utf8");

  it("the /auth button only renders on the dev server", () => {
    const auth = src("../routes/auth.tsx");
    expect(auth).toMatch(/import\.meta\.env\.DEV && demoAvailable\(\) &&/);
    expect(auth).toContain("Explorar en modo demo local");
  });

  it("the shell shows the banner with «Salir» and keeps the guard unchanged", () => {
    const route = src("../routes/_authenticated/route.tsx");
    expect(route).toContain("Modo demo local");
    expect(route).toMatch(/demo && <DemoBanner/);
    expect(route.match(/redirect\(\{ to: "\/auth" \}\)/g)).toHaveLength(1);
  });
});
