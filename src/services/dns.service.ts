import { getDb, throwIfMatuError, pickRow } from "../db/matu.js";
import type { DnsRecord } from "../types/index.js";
import { NotFoundError } from "../utils/errors.js";
import * as domainService from "./domain.service.js";

export async function listDnsRecords(userId: string, domainId: string): Promise<DnsRecord[]> {
  await domainService.getDomain(userId, domainId);
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
  await domainService.getDomain(userId, domainId);
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
  return pickRow<DnsRecord>(inserted);
}

export async function updateDnsRecord(
  userId: string,
  id: string,
  data: Partial<Pick<DnsRecord, "name" | "content" | "ttl" | "priority">>
): Promise<DnsRecord> {
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
  return pickRow<DnsRecord>(rows);
}

export async function deleteDnsRecord(userId: string, id: string): Promise<void> {
  const { error } = await getDb().from("dns_records").eq("id", id).eq("user_id", userId).delete();
  throwIfMatuError(error, "DNS record not found");
}
