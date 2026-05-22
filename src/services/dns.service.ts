import { getDb, throwIfMatuError, pickRow } from "../db/matu.js";
import type { DnsRecord, Domain } from "../types/index.js";
import { NotFoundError } from "../utils/errors.js";
import { syncAuthoritativeZone } from "./dns-zone.service.js";

async function getDomainRow(userId: string, domainId: string): Promise<Domain> {
  const { data, error } = await getDb()
    .from("domains")
    .select("*")
    .eq("id", domainId)
    .eq("user_id", userId)
    .single();
  throwIfMatuError(error, "Domain not found");
  if (!data) throw new NotFoundError("Domain not found");
  return data as Domain;
}

async function applyZone(userId: string, domainId: string): Promise<void> {
  const domain = await getDomainRow(userId, domainId);
  await syncAuthoritativeZone(domain);
}

export async function listDnsRecords(userId: string, domainId: string): Promise<DnsRecord[]> {
  await getDomainRow(userId, domainId);
  const { data, error } = await getDb()
    .from("dns_records")
    .select("*")
    .eq("user_id", userId)
    .eq("domain_id", domainId)
    .order("type")
    .order("name");

  throwIfMatuError(error);
  return (data ?? []) as DnsRecord[];
}

export async function createDnsRecord(
  userId: string,
  domainId: string,
  data: {
    type: DnsRecord["type"];
    name: string;
    content: string;
    ttl?: number;
    priority?: number;
  }
): Promise<DnsRecord> {
  await getDomainRow(userId, domainId);
  const { data: inserted, error } = await getDb().from("dns_records").insert({
    user_id: userId,
    domain_id: domainId,
    type: data.type,
    name: data.name,
    content: data.content,
    ttl: data.ttl ?? 3600,
    priority: data.priority ?? null,
  });

  throwIfMatuError(error);
  const record = pickRow<DnsRecord>(inserted);
  await applyZone(userId, domainId);
  return record;
}

export async function updateDnsRecord(
  userId: string,
  id: string,
  data: Partial<Pick<DnsRecord, "name" | "content" | "ttl" | "priority">>
): Promise<DnsRecord> {
  const { data: existing, error: fetchErr } = await getDb()
    .from("dns_records")
    .select("domain_id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  throwIfMatuError(fetchErr, "DNS record not found");
  if (!existing) throw new NotFoundError("DNS record not found");

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.content !== undefined) updates.content = data.content;
  if (data.ttl !== undefined) updates.ttl = data.ttl;
  if (data.priority !== undefined) updates.priority = data.priority;

  const { data: rows, error } = await getDb()
    .from("dns_records")
    .eq("id", id)
    .eq("user_id", userId)
    .update(updates);

  throwIfMatuError(error, "DNS record not found");
  const record = pickRow<DnsRecord>(rows);
  await applyZone(userId, (existing as { domain_id: string }).domain_id);
  return record;
}

export async function deleteDnsRecord(userId: string, id: string): Promise<void> {
  const { data: existing, error: fetchErr } = await getDb()
    .from("dns_records")
    .select("domain_id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  throwIfMatuError(fetchErr, "DNS record not found");

  const { error } = await getDb().from("dns_records").eq("id", id).eq("user_id", userId).delete();
  throwIfMatuError(error, "DNS record not found");

  if (existing) {
    await applyZone(userId, (existing as { domain_id: string }).domain_id);
  }
}
