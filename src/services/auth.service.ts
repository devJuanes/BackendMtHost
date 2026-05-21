import { getDb, throwIfMatuError } from "../db/matu.js";
import type { User } from "../types/index.js";
import { ConflictError, UnauthorizedError, NotFoundError } from "../utils/errors.js";
import { ensureProfile } from "./profile.service.js";

export async function register(
  email: string,
  password: string,
  fullName: string
): Promise<{ user: User; token: string }> {
  const db = getDb();
  const normalizedEmail = email.toLowerCase();

  const { data: existing } = await db
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new ConflictError("Email already registered");
  }

  const { data: authData, error: signUpError } = await db.auth.signUp({
    email: normalizedEmail,
    password,
    options: { data: { name: fullName } },
  });
  throwIfMatuError(signUpError);

  const authUser = authData?.user;
  const session = authData?.session;
  if (!authUser?.id) {
    throw new UnauthorizedError("Registration failed");
  }

  const user = await ensureProfile(
    { id: authUser.id, email: normalizedEmail, role: "user" },
    fullName
  );

  const token = session?.access_token ?? (authData as { token?: string })?.token;
  if (!token) {
    throw new UnauthorizedError("No session token returned from MatuDB");
  }

  return { user, token };
}

export async function login(
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  const db = getDb();
  const { data, error } = await db.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  });
  throwIfMatuError(error, "Invalid email or password");

  const authUser = data?.user;
  const token = data?.session?.access_token;
  if (!authUser?.id || !token) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const profile = await ensureProfile(authUser);
  return { user: profile, token };
}

export async function getUserById(id: string): Promise<User> {
  const { data, error } = await getDb()
    .from("profiles")
    .select("id, email, full_name, role, created_at, updated_at")
    .eq("id", id)
    .single();

  throwIfMatuError(error, "User not found");
  if (!data) throw new NotFoundError("User not found");
  return data as User;
}
