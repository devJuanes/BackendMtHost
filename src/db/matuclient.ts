import { createClient, type MatuDBClient } from "@devjuanes/matuclient";
import { env } from "../config/env.js";
import { UnauthorizedError } from "../utils/errors.js";

let serviceClient: MatuDBClient | null = null;

export function getServiceClient(): MatuDBClient {
  if (!serviceClient) {
    serviceClient = createClient({
      url: env.MATUDB_URL,
      projectId: env.MATUDB_PROJECT_ID,
      apiKey: env.MATUDB_API_KEY,
      useSupabase: env.MATUDB_USE_SUPABASE,
    });
  }
  return serviceClient;
}

interface MatuAuthUser {
  id: string;
  email: string;
  role?: string;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function userFromJwt(token: string): MatuAuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const id = (payload.id ?? payload.sub) as string | undefined;
  if (!id) return null;

  const exp = payload.exp as number | undefined;
  if (exp && exp * 1000 < Date.now()) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  return {
    id,
    email: (payload.email as string) ?? "",
    role: (payload.role as string) ?? "user",
  };
}

/** Valida token MatuDB: API /auth/user + fallback decode JWT. */
export async function verifyAccessToken(accessToken: string): Promise<MatuAuthUser> {
  const url = `${env.MATUDB_URL}/api/projects/${env.MATUDB_PROJECT_ID}/auth/user`;

  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        apikey: env.MATUDB_API_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const json = (await res.json()) as {
      success?: boolean;
      message?: string;
      data?: { user?: MatuAuthUser } & MatuAuthUser;
    };

    if (res.ok) {
      const user = json.data?.user ?? (json.data?.id ? (json.data as MatuAuthUser) : null);
      if (user?.id) return user;
    }
  } catch {
    /* fallback JWT */
  }

  const fromJwt = userFromJwt(accessToken);
  if (fromJwt?.id) return fromJwt;

  throw new UnauthorizedError("Invalid or expired token");
}
