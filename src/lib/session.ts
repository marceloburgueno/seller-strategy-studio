// NK-0098: the one session validator of the app (per auth client, shared with the route guard).
import { supabase } from "@/integrations/supabase/client";
import {
  createLastValidatedUserId,
  createOtherUserSubscription,
  createSessionState,
  createSessionUser,
  type SessionState,
} from "@/lib/session-check";
import { DEMO_USER, installDemoBackend, isDemoMode } from "@/lib/demo-mode";

const realValidatedUser = createSessionUser(supabase.auth);
const realCheckSession = createSessionState(supabase.auth);

// Ronda 3B: on the dev server with demo mode on, the session is the fictitious demo user and the local backend
// answers every Supabase request. isDemoMode() is always false in a production build (import.meta.env.DEV).
export const validatedUser = async () => {
  if (import.meta.env.DEV && isDemoMode()) {
    installDemoBackend();
    return DEMO_USER;
  }
  return realValidatedUser();
};
export const isSignedIn = async () => (await validatedUser()) !== null;
export const checkSession = async (): Promise<SessionState<typeof DEMO_USER>> => {
  if (import.meta.env.DEV && isDemoMode()) {
    installDemoBackend();
    return { status: "valid", user: DEMO_USER };
  }
  return realCheckSession();
};
export const lastValidatedUserId = createLastValidatedUserId(supabase.auth);
export const onOtherUserValidated = createOtherUserSubscription(supabase.auth);
