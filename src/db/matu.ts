import { getServiceClient } from "./matuclient.js";
import {
  AppError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../utils/errors.js";

export function matuErrorMessage(error: unknown): string {
  if (!error) return "Unknown MatuDB error";
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: string }).message);
  }
  return JSON.stringify(error);
}

function matuErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: string }).code).toUpperCase();
  }
  return "";
}

export function throwIfMatuError(error: unknown, notFoundMessage?: string): void {
  if (!error) return;
  const msg = matuErrorMessage(error);
  const msgLower = msg.toLowerCase();
  const code = matuErrorCode(error);

  if (code === "PGRST116" || msgLower === "row not found") {
    throw new NotFoundError(notFoundMessage ?? "Resource not found");
  }
  if (msgLower.includes("referenced record not found")) {
    throw new ValidationError(
      "Tu cuenta no está vinculada en la base de datos. Cierra sesión y vuelve a entrar."
    );
  }
  if (msgLower.includes("0 rows") || msgLower.includes("no rows")) {
    throw new NotFoundError(notFoundMessage ?? "Resource not found");
  }
  if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("already")) {
    throw new ConflictError(matuErrorMessage(error));
  }
  if (msg.includes("invalid") && msg.includes("token")) {
    throw new UnauthorizedError("Invalid or expired token");
  }
  throw new AppError(400, matuErrorMessage(error), "MATUDB_ERROR");
}

export function getDb() {
  return getServiceClient();
}

/** MatuDB insert/update devuelve filas en `data` (array o objeto). */
export function pickRow<T>(data: T | T[] | null | undefined): T {
  if (data == null) throw new NotFoundError("No data returned");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new NotFoundError("No data returned");
  return row;
}

export async function matuRpc<T = unknown>(sql: string): Promise<T> {
  const { data, error } = await getServiceClient().rpc(sql);
  throwIfMatuError(error);
  return data as T;
}
