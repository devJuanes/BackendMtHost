import { getDb, throwIfMatuError, pickRow } from "../db/matu.js";
import type { Subdomain } from "../types/index.js";
import { NotFoundError, ValidationError, ConflictError } from "../utils/errors.js";
import * as domainService from "./domain.service.js";
import { isValidSubdomain } from "../utils/domain.js";

export async function listSubdomains(userId: string, domainId?: string): Promise<Subdomain[]> {
  let query = getDb().from("subdomains").select("*").eq("user_id", userId);
  if (domainId) query = query.eq("domain_id", domainId);
  const { data, error } = await query.order("created_at", { ascending: false });
  throwIfMatuError(error);
  return (data ?? []) as Subdomain[];
}

export async function createSubdomain(
  userId: string,
  domainId: string,
  hostname: string,
  targetPath = "/"
): Promise<Subdomain> {
  const domain = await domainService.getDomain(userId, domainId);
  const host = hostname.trim().toLowerCase();

  if (!isValidSubdomain(host, domain.fqdn) && host !== `www.${domain.fqdn}`) {
    if (host !== domain.fqdn) {
      throw new ValidationError(`Hostname must be a subdomain of ${domain.fqdn}`);
    }
  }

  const { data: dup } = await getDb()
    .from("subdomains")
    .select("id")
    .eq("domain_id", domainId)
    .eq("hostname", host)
    .limit(1);

  if (dup && dup.length > 0) throw new ConflictError("Subdomain already exists");

  const { data: inserted, error } = await getDb().from("subdomains").insert({
    user_id: userId,
    domain_id: domainId,
    hostname: host,
    target_path: targetPath,
  });

  throwIfMatuError(error);
  const sub = pickRow<Subdomain>(inserted);

  await getDb().from("dns_records").insert({
    user_id: userId,
    domain_id: domainId,
    type: "CNAME",
    name: host.replace(`.${domain.fqdn}`, "") || "www",
    content: domain.fqdn,
    ttl: 3600,
  });

  return sub;
}

export async function deleteSubdomain(userId: string, id: string): Promise<void> {
  const { error } = await getDb().from("subdomains").eq("id", id).eq("user_id", userId).delete();
  throwIfMatuError(error, "Subdomain not found");
}
