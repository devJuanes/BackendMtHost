import { getDb, throwIfMatuError, pickRow } from "../db/matu.js";
import type { Domain } from "../types/index.js";
import { fullProvisionDomain, buildHealth } from "./provision-orchestrator.service.js";

export interface DomainHealth {
  dns_verified: boolean;
  hosting_provisioned: boolean;
  resolved_ips: string[];
  dns_message: string;
  site_url: string;
  authoritative?: boolean;
  nameservers?: string[];
}

export async function getDomainHealth(domain: Domain): Promise<DomainHealth> {
  return buildHealth(domain);
}

/** Pipeline completo: DNS zona + nginx + sitio por defecto. */
export async function provisionDomainOnServer(
  userId: string,
  domain: Domain
): Promise<{ provisioned: boolean; vhost_id?: string }> {
  await fullProvisionDomain(userId, domain, { skipDnsSeed: true });
  const { data: vhosts } = await getDb()
    .from("nginx_vhosts")
    .select("id")
    .eq("domain_id", domain.id)
    .limit(1);
  return { provisioned: true, vhost_id: (vhosts?.[0] as { id: string } | undefined)?.id };
}

export async function verifyAndSyncDomain(
  userId: string,
  domain: Domain
): Promise<Domain & { health: DomainHealth }> {
  await fullProvisionDomain(userId, domain, { skipDnsSeed: true });
  const health = await buildHealth(domain);

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    platform_managed: true,
  };

  if (health.dns_verified || health.authoritative) {
    updates.is_simulated = false;
    if (domain.status === "pending") updates.status = "active";
  }

  const { data: rows, error } = await getDb()
    .from("domains")
    .eq("id", domain.id)
    .eq("user_id", userId)
    .update(updates);

  throwIfMatuError(error);
  const updated = { ...domain, ...pickRow<Domain>(rows), ...updates } as Domain;
  return { ...updated, health: await buildHealth(updated) };
}
