import { validatedUser } from "@/lib/session";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Lockup } from "@/components/brand";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import { errorText } from "@/lib/errors";
import { track } from "@/lib/analytics";
import { absoluteUrl } from "@/lib/site";
import { demoAvailable, enterDemoMode } from "@/lib/demo-mode";

// Set just before the Google redirect so the return can be measured as sign_up or login.
const OAUTH_PENDING = "nokko-oauth-pending";
// An account created this recently on return from Google counts as a new sign-up.
const NEW_ACCOUNT_MS = 10 * 60 * 1000;

function trackGoogleReturn(createdAt: string | undefined) {
  let pending = false;
  try {
    pending = sessionStorage.getItem(OAUTH_PENDING) === "1";
    sessionStorage.removeItem(OAUTH_PENDING);
  } catch {
    /* blocked storage */
  }
  if (!pending) return;
  const isNew = !!createdAt && Date.now() - Date.parse(createdAt) < NEW_ACCOUNT_MS;
  track(isNew ? "sign_up" : "login", { method: "google" });
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s.next === "string" ? { next: s.next } : {},
  head: () => ({
    meta: [
      { title: "Entrar — Nokko" },
      { name: "description", content: "Accede al sistema comercial de tu equipo." },
      { property: "og:title", content: "Entrar — Nokko" },
      { property: "og:description", content: "Accede al sistema comercial de tu equipo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/auth") }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next: rawNext } = Route.useSearch();
  // Validated once; external assistants send users back to the consent page through this.
  const next = rawNext ? oauthReturnPath(rawNext) : null;
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const goOn = () =>
      next ? window.location.assign(next) : navigate({ to: "/home", replace: true });
    // Only a validated session sends the user on (NK-0098): a merely local one may be stale, and a failed
    // check (network, 5xx) must leave /auth in place instead of bouncing to /home and back.
    // The validator is the guard's own, per token: no extra /auth/v1/user in the normal path.
    let alive = true;
    // Same rule for the first check and for every later event: only a validated user goes on (NK-0113).
    // Concurrent calls for one token share the in-flight request inside the validator.
    const goIfValid = () =>
      validatedUser().then((user) => {
        if (alive && user) {
          trackGoogleReturn(user.created_at);
          goOn();
        }
      });
    goIfValid();
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      // INITIAL_SESSION just replays the stored (maybe stale) session: the call above covers it.
      if (s && e !== "INITIAL_SESSION") goIfValid();
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [navigate, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: next
              ? new URL(next, window.location.origin).href
              : window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        track("sign_up", { method: "email" });
        if (!data.session) toast.success("Revisa tu email para confirmar la cuenta.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        track("login", { method: "email" });
      }
    } catch (err) {
      toast.error(errorText(err, "No se ha podido continuar. Inténtalo de nuevo."));
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    if (!email)
      return toast.error("Escribe tu email arriba y vuelve a pulsar «¿Olvidaste tu contraseña?».");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(errorText(error));
    toast.success(
      "Si existe una cuenta con ese email, te hemos enviado un enlace para cambiar la contraseña.",
    );
  }

  async function google() {
    try {
      sessionStorage.setItem(OAUTH_PENDING, "1");
    } catch {
      /* blocked storage */
    }
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri:
        window.location.origin + "/auth" + (next ? `?next=${encodeURIComponent(next)}` : ""),
    });
    if (r.error) toast.error("No se pudo entrar con Google.");
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between border-r-2 border-hairline-firm bg-paper-edge p-12 md:flex">
        <Link to="/" aria-label="Nokko">
          <Lockup />
        </Link>
        <div>
          <div className="rule-major mb-6 w-24" />
          <p className="lede-l measure-lede">
            Primero el sistema, luego el equipo, luego los agentes.
          </p>
        </div>
        <p className="kicker">Una sola fuente de verdad</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <Link to="/" aria-label="Nokko" className="mb-8 inline-block md:hidden">
            <Lockup />
          </Link>
          <h1 className="lede-m">{mode === "in" ? "Entrar" : "Crear cuenta"}</h1>
          {mode === "up" && (
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="auth-password">Contraseña</Label>
              {mode === "in" && (
                <button
                  type="button"
                  onClick={forgot}
                  className="min-h-11 text-sm text-ink underline decoration-hairline-firm underline-offset-4"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                id="auth-password"
                type={show ? "text" : "password"}
                autoComplete={mode === "in" ? "current-password" : "new-password"}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button
                type="button"
                variant="outline"
                className="min-h-11 shrink-0"
                aria-pressed={show}
                onClick={() => setShow(!show)}
              >
                {show ? "Ocultar" : "Mostrar"}
              </Button>
            </div>
          </div>
          <Button className="w-full" disabled={busy}>
            {mode === "in" ? "Entrar" : "Crear cuenta"}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={google}>
            Continuar con Google
          </Button>
          <button
            type="button"
            className="w-full py-2 text-sm text-ink underline decoration-hairline-firm underline-offset-4"
            onClick={() => {
              if (mode === "in") track("sign_up_start", { location: "auth_toggle" });
              setMode(mode === "in" ? "up" : "in");
            }}
          >
            {mode === "in" ? "¿No tienes cuenta? Créala" : "¿Ya tienes cuenta? Entra"}
          </button>
          <p className="note">
            Al entrar podrás crear tu empresa o unirte a las que te hayan invitado.
          </p>
          {/* Ronda 3B: only on the dev server (import.meta.env.DEV); never in a production build. */}
          {import.meta.env.DEV && demoAvailable() && (
            <button
              type="button"
              className="min-h-11 w-full text-sm text-ink-faint underline decoration-hairline underline-offset-4 hover:text-ink"
              onClick={() => {
                if (enterDemoMode()) window.location.assign("/home");
              }}
            >
              Explorar en modo demo local
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
