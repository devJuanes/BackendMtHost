import { getDb, throwIfMatuError, pickRow } from "../db/matu.js";
import { env } from "../config/env.js";
import type { Domain } from "../types/index.js";
import { NotFoundError, ValidationError, ConflictError } from "../utils/errors.js";
import { parseFqdn } from "../utils/domain.js";
import { ensureDefaultSite } from "../utils/default-site.js";
import {
  getDomainHealth,
  provisionDomainOnServer,
  verifyAndSyncDomain,
} from "./domain-provision.service.js";
import type { DomainHealth } from "./domain-provision.service.js";

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

export async function createDomain(
  userId: string,
  fqdnInput: string,
  notes?: string
): Promise<Domain> {
  const parsed = parseFqdn(fqdnInput);
  if (!parsed) throw new ValidationError("Invalid domain name");

  const { data: dup } = await getDb()
    .from("domains")
    .select("id")
    .eq("user_id", userId)
    .eq("fqdn", parsed.fqdn)
    .limit(1);

  if (dup && dup.length > 0) {
    throw new ConflictError("Domain already exists in your account");
  }

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const { data: inserted, error } = await getDb().from("domains").insert({
    user_id: userId,
    fqdn: parsed.fqdn,
    tld: parsed.tld,
    status: "pending",
    is_simulated: true,
    expires_at: expiresAt.toISOString(),
    server_ip: env.DEFAULT_SERVER_IP,
    notes: notes ?? null,
  });

  throwIfMatuError(error);
  const domain = pickRow<Domain>(inserted);

  const { error: dnsError } = await getDb().from("dns_records").insert([
    { user_id: userId, domain_id: domain.id, type: "A", name: "@", content: env.DEFAULT_SERVER_IP, ttl: 3600 },
    { user_id: userId, domain_id: domain.id, type: "A", name: "www", content: env.DEFAULT_SERVER_IP, ttl: 3600 },
    {
      user_id: userId,
      domain_id: domain.id,
      type: "TXT",
      name: "@",
      content: "v=spf1 include:_spf.matuhost.local ~all",
      ttl: 3600,
    },
  ]);
  throwIfMatuError(dnsError);

  await ensureDefaultSite(parsed.fqdn);
  await provisionDomainOnServer(userId, domain);

  return { ...(await getDomain(userId, domain.id)), health: await getDomainHealth(domain) };
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
  await getDomain(userId, id);
  const { error } = await getDb().from("domains").eq("id", id).eq("user_id", userId).delete();
  throwIfMatuError(error);
}

export async function activateDomain(userId: string, id: string): Promise<DomainWithHealth> {
  const domain = await getDomain(userId, id);
  await updateDomain(userId, id, { status: "active" });
  await provisionDomainOnServer(userId, domain);
  return verifyAndSyncDomain(userId, { ...domain, status: "active" });
}

export async function verifyDomainDnsForUser(
  userId: string,
  id: string
): Promise<DomainWithHealth> {
  const domain = await getDomain(userId, id);
  await provisionDomainOnServer(userId, domain);
  return verifyAndSyncDomain(userId, domain);
}

export async function reprovisionDomain(
  userId: string,
  id: string
): Promise<DomainWithHealth> {
  const domain = await getDomain(userId, id);
  await provisionDomainOnServer(userId, domain);
  return { ...domain, health: await getDomainHealth(domain) };
}
