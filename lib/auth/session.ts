import { cache } from "react";
import { cookies } from "next/headers";
import { createId } from "@/lib/utils";
import { readStore, writeStore } from "@/lib/database/store";
import { APP_URL, isSupabaseConfigured } from "@/lib/config/env";
import { allowDemoAuth } from "@/lib/config/runtime";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { validatePasswordStrength } from "@/lib/auth/password";
import { normalizePlanId } from "@/lib/admin/entitlements";
import { softDeleteColumnsSupported } from "@/lib/database/supabase-store";
import type { Session, User, Workspace } from "@/types/user";


const LEGACY_SESSION_COOKIE = "vitrin_session";
const DEMO_EMAIL = "demo@vitrin.app";

async function loadWorkspaceForUserUncached(
  userId: string,
  email: string,
  name: string | null,
) {
  const schemaReady = await isSupabaseSchemaReady();
  const displayName = name ?? email.split("@")[0];

  if (schemaReady) {
    const db = getSupabaseAdmin();

    // Read-only on the hot path. Create profile/workspace only when missing —
    // never upsert on every page render (that + Auth refresh was rate-limiting us).
    const softDeleteReady = await softDeleteColumnsSupported();
    let workspaceQuery = db
      .from("workspaces")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at")
      .limit(1);
    if (softDeleteReady) workspaceQuery = workspaceQuery.is("deleted_at", null);

    const [{ data: profile }, { data: workspace }] = await Promise.all([
      db
        .from("profiles")
        .select("id, email, name, avatar_url, created_at")
        .eq("id", userId)
        .maybeSingle(),
      workspaceQuery.maybeSingle(),
    ]);

    let workspaceRow = workspace;
    if (!profile) {
      await db.from("profiles").upsert({
        id: userId,
        email,
        name: displayName,
      });
    }

    if (!workspaceRow) {
      const inserted = await db
        .from("workspaces")
        .insert({
          id: createId("ws"),
          owner_id: userId,
          name: displayName || "Workspace",
          plan: "free",
        })
        .select("*")
        .single();
      if (inserted.error || !inserted.data) {
        throw new Error(inserted.error?.message ?? "Failed to create workspace.");
      }
      workspaceRow = inserted.data;
    }

    return {
      user: {
        id: userId,
        email: profile?.email ?? email,
        name: profile?.name ?? displayName,
        avatarUrl: profile?.avatar_url ?? null,
        createdAt: profile?.created_at ?? new Date().toISOString(),
      },
      workspace: {
        id: workspaceRow.id,
        ownerId: workspaceRow.owner_id,
        name: workspaceRow.name,
        plan: normalizePlanId(workspaceRow.plan),
        createdAt: workspaceRow.created_at,
      },
    } satisfies Session;
  }

  const created: { session: Session | null } = { session: null };
  await writeStore((store) => {
    let user = store.users.find((item) => item.id === userId || item.email === email);
    if (!user) {
      user = {
        id: userId,
        email,
        name: displayName,
        avatarUrl: null,
        createdAt: new Date().toISOString(),
      };
      store.users.push(user);
    } else {
      user.id = userId;
      user.email = email;
      user.name = displayName;
    }

    let workspace = store.workspaces.find((item) => item.ownerId === userId);
    if (!workspace) {
      workspace = {
        id: createId("ws"),
        ownerId: userId,
        name: displayName || "Workspace",
        plan: "free",
        createdAt: new Date().toISOString(),
      };
      store.workspaces.push(workspace);
    }

    created.session = { user, workspace };
  });

  if (!created.session) throw new Error("Failed to create session.");
  return created.session;
}

/** Short cache — profile/workspace barely change between navigations. */
async function loadWorkspaceForUser(
  userId: string,
  email: string,
  name: string | null,
) {
  if (!isSupabaseConfigured() || !(await isSupabaseSchemaReady())) {
    return loadWorkspaceForUserUncached(userId, email, name);
  }
  const { unstable_cache } = await import("next/cache");
  return unstable_cache(
    () => loadWorkspaceForUserUncached(userId, email, name),
    [`session-workspace-${userId}`],
    { revalidate: 60, tags: [`session-workspace-${userId}`] },
  )();
}

async function getLegacyFileSession(): Promise<Session | null> {
  const jar = await cookies();
  const userId = jar.get(LEGACY_SESSION_COOKIE)?.value;
  if (!userId) return null;
  const store = await readStore();
  const user = store.users.find((item) => item.id === userId);
  const workspace = store.workspaces.find((item) => item.ownerId === userId);
  if (!user || !workspace) return null;
  return { user, workspace };
}

export const getSession = cache(async (): Promise<Session | null> => {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      // Prefer local JWT claims (middleware already refreshed) — skips Auth HTTP round-trip.
      const { data: claimsData } = await supabase.auth.getClaims();
      const claims = claimsData?.claims as
        | {
            sub?: string;
            email?: string;
            user_metadata?: { name?: string };
          }
        | undefined;
      if (claims?.sub && claims.email) {
        return loadWorkspaceForUser(
          claims.sub,
          claims.email.toLowerCase(),
          claims.user_metadata?.name ?? null,
        );
      }

      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user?.email) return null;
      return loadWorkspaceForUser(
        data.user.id,
        data.user.email.toLowerCase(),
        (data.user.user_metadata?.name as string | undefined) ?? null,
      );
    } catch {
      return null;
    }
  }

  // Local file-store only — never use insecure email cookie when Supabase is on.
  return getLegacyFileSession();
});

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export type AuthResult =
  | { ok: true; session: Session }
  | { ok: false; code: string; message: string };

export async function signUpWithPassword(params: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResult> {
  const email = params.email.trim().toLowerCase();
  const password = params.password;
  if (!email.includes("@")) {
    return { ok: false, code: "INVALID_EMAIL", message: "Invalid email." };
  }
  const strength = validatePasswordStrength(password, email);
  if (!strength.ok) return strength;

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      code: "SUPABASE_REQUIRED",
      message: "Configure Supabase Auth before creating accounts.",
    };
  }

  const name = params.name ?? email.split("@")[0];
  const supabase = await createClient();

  // Prefer normal signup so Supabase sends confirmation email when enabled.
  const signedUp = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${APP_URL.replace(/\/$/, "")}/auth/callback`,
    },
  });

  if (signedUp.error) {
    const message = signedUp.error.message ?? "Signup failed.";
    if (/already|registered|exists/i.test(message)) {
      return {
        ok: false,
        code: "EMAIL_TAKEN",
        message: "An account with this email already exists. Log in instead.",
      };
    }
    return { ok: false, code: "AUTH_FAILED", message };
  }

  // If project has "confirm email" disabled, session is returned immediately.
  if (signedUp.data.session && signedUp.data.user?.email) {
    const session = await loadWorkspaceForUser(
      signedUp.data.user.id,
      email,
      name,
    );
    return { ok: true, session };
  }

  return {
    ok: false,
    code: "EMAIL_CONFIRMATION_REQUIRED",
    message:
      "Check your inbox to confirm your email, then log in.",
  };
}

export async function signInWithPassword(params: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const email = params.email.trim().toLowerCase();
  if (!email.includes("@") || !params.password) {
    return { ok: false, code: "INVALID_CREDENTIALS", message: "Invalid credentials." };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      code: "SUPABASE_REQUIRED",
      message: "Configure Supabase Auth for password login.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: params.password,
  });
  if (error || !data.user?.email) {
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password.",
    };
  }

  const session = await loadWorkspaceForUser(
    data.user.id,
    data.user.email.toLowerCase(),
    (data.user.user_metadata?.name as string | undefined) ?? null,
  );
  return { ok: true, session };
}

async function createLocalFileSession(params: { email: string; name?: string }) {
  const email = params.email.trim().toLowerCase();
  const created: { session: Session | null } = { session: null };
  await writeStore((store) => {
    let user = store.users.find((item) => item.email === email);
    if (!user) {
      user = {
        id: createId("usr"),
        email,
        name: params.name ?? email.split("@")[0],
        avatarUrl: null,
        createdAt: new Date().toISOString(),
      };
      store.users.push(user);
    }
    let workspace = store.workspaces.find((item) => item.ownerId === user!.id);
    if (!workspace) {
      workspace = {
        id: createId("ws"),
        ownerId: user.id,
        name: user.name || "Workspace",
        plan: "free",
        createdAt: new Date().toISOString(),
      };
      store.workspaces.push(workspace);
    }
    created.session = { user, workspace };
  });
  if (!created.session) throw new Error("Failed to create session.");

  const jar = await cookies();
  jar.set(LEGACY_SESSION_COOKIE, created.session.user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
  return created.session;
}

/** Demo-only session for instagram.com/demo imports. */
export async function createDemoSession(): Promise<Session> {
  if (!allowDemoAuth()) {
    throw new Error("Demo auth is disabled in production.");
  }

  if (!isSupabaseConfigured()) {
    return createLocalFileSession({ email: DEMO_EMAIL, name: "Demo" });
  }

  const password =
    process.env.DEMO_AUTH_PASSWORD || "vitrin-demo-local-only-change-me";
  const admin = getSupabaseAdmin();
  const supabase = await createClient();

  let signed = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password,
  });

  if (signed.error || !signed.data.user) {
    await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { name: "Demo" },
    });
    // If user existed with different password, update it (dev only).
    const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = listed.data.users.find(
      (u) => u.email?.toLowerCase() === DEMO_EMAIL,
    );
    if (existing) {
      await admin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      });
    }
    signed = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password,
    });
  }

  if (!signed.data.user?.email) {
    throw new Error(signed.error?.message ?? "Demo login failed.");
  }

  return loadWorkspaceForUser(signed.data.user.id, DEMO_EMAIL, "Demo");
}

export type AuthActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export async function requestPasswordReset(emailRaw: string): Promise<AuthActionResult> {
  const email = emailRaw.trim().toLowerCase();
  if (!email.includes("@")) {
    return { ok: false, code: "INVALID_EMAIL", message: "Invalid email." };
  }
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      code: "SUPABASE_REQUIRED",
      message: "Configure Supabase Auth first.",
    };
  }

  const supabase = await createClient();
  const redirectTo = `${APP_URL.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent("/fa/reset-password")}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) {
    // Do not reveal whether the email exists.
    console.error("[auth] resetPasswordForEmail", error.message);
  }
  return { ok: true };
}

export async function updatePassword(password: string): Promise<AuthResult> {
  const strength = validatePasswordStrength(password);
  if (!strength.ok) return strength;
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      code: "SUPABASE_REQUIRED",
      message: "Configure Supabase Auth first.",
    };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Reset link expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, code: "AUTH_FAILED", message: error.message };
  }

  const session = await loadWorkspaceForUser(
    userData.user.id,
    (userData.user.email ?? "").toLowerCase(),
    (userData.user.user_metadata?.name as string | undefined) ?? null,
  );
  return { ok: true, session };
}

export async function clearSession() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  const jar = await cookies();
  jar.delete(LEGACY_SESSION_COOKIE);
}

export async function upsertDemoUser() {
  return createDemoSession();
}

export function googleAuthAvailable() {
  return isSupabaseConfigured() && process.env.GOOGLE_AUTH_ENABLED === "true";
}

export type { User, Workspace, Session };
