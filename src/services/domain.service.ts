import { getDb, throwIfMatuError, pickRow } from "../db/matu.js";
import { env } from "../config/env.js";
import type { Domain } from "../types/index.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { parseFqdn } from "../utils/domain.js";
import {
  getDomainHealth,
  provisionDomainOnServer,
  verifyAndSyncDomain,
} from "./domain-provision.service.js";
import type { DomainHealth } from "./domain-provision.service.js";
import { assertNotRegistered } from "./domain-registry.service.js";
import { seedPlatformDnsRecords } from "./dns-zone.service.js";
import { fullProvisionDomain } from "./provision-orchestrator.service.js";
import { removeAuthoritativeZone } from "./dns-zone.service.js";

export type DomainWithHealth = Domain & { health?: DomainHealth };

export async function listDomains(userId: string): Promise<DomainWithHealth[]> {
  const { data, error } = await getDb()
    .from("domains")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  throwIfMatuError(error);
  const domains = (data ?? []) as Domain[];
  return Promise.all(
    domains.map(async (d) => ({
      ...d,
      health: await getDomainHealth(d),
    }))
  );
}

export async function getDomain(userId: string, id: string): Promise<DomainWithHealth> {
  const { data, error } = await getDb()
    .from("domains")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  throwIfMatuError(error, "Domain not found");
  if (!data) throw new NotFoundError("Domain not found");
  const domain = data as Domain;
  return { ...domain, health: await getDomainHealth(domain) };
}

/** Registro interno + aprovisionamiento automático (DNS + Nginx + sitio). */
export async function createDomain(
  userId: string,
  fqdnInput: string,
  notes?: string
): Promise<DomainWithHealth> {
  const parsed = parseFqdn(fqdnInput);
  if (!parsed) throw new ValidationError("Invalid domain name");

  await assertNotRegistered(parsed.fqdn);

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const { data: inserted, error } = await getDb().from("domains").insert({
    user_id: userId,
    fqdn: parsed.fqdn,
    tld: parsed.tld,
    status: "pending",
    is_simulated: false,
    platform_managed: true,
    registration_source: "matuhost",
    expires_at: expiresAt.toISOString(),
    server_ip: env.DEFAULT_SERVER_IP,
    notes: notes ?? null,
  });

  throwIfMatuError(error);
  let domain = pickRow<Domain>(inserted);

  await seedPlatformDnsRecords(userId, domain.id, domain.fqdn);
  const result = await fullProvisionDomain(userId, domain);

  const status: Domain["status"] =
    result.health.authoritative || result.health.dns_verified ? "active" : "pending";

  const updates = {
    status,
    is_simulated: false,
    platform_managed: true,
    updated_at: new Date().toISOString(),
  };

  const { data: rows, error: updErr } = await getDb()
    .from("domains")
    .eq("id", domain.id)
    .update(updates);
  throwIfMatuError(updErr);
  domain = { ...domain, ...pickRow<Domain>(rows), ...updates } as Domain;

  return { ...domain, health: result.health };
}

export async function updateDomain(
  userId: string,
  id: string,
  data: { status?: Domain["status"]; notes?: string; server_ip?: string }
): Promise<Domain> {
  await getDomain(userId, id);

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.status !== undefined) updates.status = data.status;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.server_ip !== undefined) updates.server_ip = data.server_ip;

  const { data: rows, error } = await getDb()
    .from("domains")
    .eq("id", id)
    .eq("user_id", userId)
    .update(updates);

  throwIfMatuError(error, "Domain not found");
  return pickRow<Domain>(rows);
}

export async function deleteDomain(userId: string, id: string): Promise<void> {
  const domain = await getDomain(userId, id);
  await removeAuthoritativeZone(domain.fqdn, domain.id);
  const { error } = await getDb().from("domains").eq("id", id).eq("user_id", userId).delete();
  throwIfMatuError(error);
}

export async function activateDomain(userId: string, id: string): Promise<DomainWithHealth> {
  const domain = await getDomain(userId, id);
  await updateDomain(userId, id, { status: "active" });
  await fullProvisionDomain(userId, { ...domain, status: "active" });
  return verifyAndSyncDomain(userId, { ...domain, status: "active" });
}

export async function verifyDomainDnsForUser(
  userId: string,
  id: string
): Promise<DomainWithHealth> {
  const domain = await getDomain(userId, id);
  return verifyAndSyncDomain(userId, domain);
}

export async function reprovisionDomain(
  userId: string,
  id: string
): Promise<DomainWithHealth> {
  const domain = await getDomain(userId, id);
  await fullProvisionDomain(userId, domain);
  return { ...domain, health: await getDomainHealth(domain) };
}
