import { getDb, throwIfMatuError, pickRow } from "../db/matu.js";
import type { User } from "../types/index.js";

/** MatuDB exige fila en `users` por FK de domains y tablas relacionadas. */
export async function ensureProjectUser(
  authUser: { id: string; email: string },
  fullName: string
): Promise<void> {
  const db = getDb();
  const { data: existing, error: fetchError } = await db
    .from("users")
    .select("id")
    .eq("id", authUser.id)
    .maybeSingle();

  throwIfMatuError(fetchError);
  if (existing) return;

  const { error: insertError } = await db.from("users").insert({
    id: authUser.id,
    email: authUser.email.toLowerCase(),
    password_hash: "matuhost-auth-managed",
    full_name: fullName,
  });

  throwIfMatuError(insertError);
}

export async function ensureProfile(
  authUser: { id: string; email: string; role?: string },
  fullNameFallback?: string
): Promise<User> {
  const db = getDb();
  const fullName =
    fullNameFallback ?? authUser.email.split("@")[0] ?? "Usuario";

  const { data: existing, error: fetchError } = await db
    .from("profiles")
    .select("id, email, full_name, role, created_at, updated_at")
    .eq("id", authUser.id)
    .maybeSingle();

  throwIfMatuError(fetchError);

  if (existing) {
    await ensureProjectUser(authUser, existing.full_name as string);
    return existing as User;
  }

  const { data: inserted, error: insertError } = await db.from("profiles").insert({
    id: authUser.id,
    email: authUser.email.toLowerCase(),
    full_name: fullName,
    role: authUser.role ?? "user",
  });

  throwIfMatuError(insertError);
  await ensureProjectUser(authUser, fullName);
  return pickRow<User>(inserted);
}
