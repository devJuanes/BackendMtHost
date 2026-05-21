import { getDb, throwIfMatuError, pickRow } from "../db/matu.js";
import type { SslCertificate } from "../types/index.js";
import { NotFoundError } from "../utils/errors.js";
import * as domainService from "./domain.service.js";

export async function listSsl(userId: string): Promise<SslCertificate[]> {
  const { data, error } = await getDb()
    .from("ssl_certificates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  throwIfMatuError(error);
  return (data ?? []) as SslCertificate[];
}

export async function getSslForDomain(userId: string, domainId: string): Promise<SslCertificate | null> {
  await domainService.getDomain(userId, domainId);
  const { data, error } = await getDb()
    .from("ssl_certificates")
    .select("*")
    .eq("user_id", userId)
    .eq("domain_id", domainId)
    .limit(1);

  throwIfMatuError(error);
  const rows = (data ?? []) as SslCertificate[];
  return rows[0] ?? null;
}

export async function requestSsl(
  userId: string,
  domainId: string,
  vhostId?: string
): Promise<SslCertificate> {
  await domainService.getDomain(userId, domainId);

  const { data: existing } = await getDb()
    .from("ssl_certificates")
    .select("*")
    .eq("user_id", userId)
    .eq("domain_id", domainId)
    .limit(1);

  if (existing && existing.length > 0) {
    const { data: rows, error } = await getDb()
      .from("ssl_certificates")
      .eq("user_id", userId)
      .eq("domain_id", domainId)
      .update({
        status: "pending",
        vhost_id: vhostId ?? (existing[0] as SslCertificate).vhost_id,
        last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    throwIfMatuError(error);
    return pickRow<SslCertificate>(rows);
  }

  const { data: inserted, error } = await getDb().from("ssl_certificates").insert({
    user_id: userId,
    domain_id: domainId,
    vhost_id: vhostId ?? null,
    status: "pending",
  });

  throwIfMatuError(error);
  return pickRow<SslCertificate>(inserted);
}

export async function simulateIssueSsl(userId: string, id: string): Promise<SslCertificate> {
  const { data: cert, error } = await getDb()
    .from("ssl_certificates")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  throwIfMatuError(error, "SSL certificate not found");
  if (!cert) throw new NotFoundError("SSL certificate not found");

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 3);

  const { data: rows, error: updateError } = await getDb()
    .from("ssl_certificates")
    .eq("id", id)
    .eq("user_id", userId)
    .update({
      status: "active",
      expires_at: expiresAt.toISOString(),
      last_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  throwIfMatuError(updateError);
  return pickRow<SslCertificate>(rows);
}

export async function checkSslStatus(userId: string, id: string): Promise<SslCertificate> {
  const { data: cert, error } = await getDb()
    .from("ssl_certificates")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  throwIfMatuError(error, "SSL certificate not found");
  const row = cert as SslCertificate;

  if (row.status === "pending") {
    const domain = await domainService.getDomain(userId, row.domain_id);
    if (domain.status === "active") {
      return simulateIssueSsl(userId, id);
    }
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    const { data: rows, error: expError } = await getDb()
      .from("ssl_certificates")
      .eq("id", id)
      .update({
        status: "expired",
        last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    throwIfMatuError(expError);
    return pickRow<SslCertificate>(rows);
  }

  await getDb()
    .from("ssl_certificates")
    .eq("id", id)
    .update({ last_checked_at: new Date().toISOString() });

  const { data: refreshed, error: refreshError } = await getDb()
    .from("ssl_certificates")
    .select("*")
    .eq("id", id)
    .single();

  throwIfMatuError(refreshError);
  return refreshed as SslCertificate;
}
