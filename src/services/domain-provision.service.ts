import { exec } from "child_process";
import { promisify } from "util";
import { getDb, throwIfMatuError, pickRow } from "../db/matu.js";
import { env } from "../config/env.js";
import type { Domain } from "../types/index.js";
import { ensureDefaultSite } from "../utils/default-site.js";
import { verifyDomainDns } from "../utils/dns-verify.js";
import * as nginxService from "./nginx.service.js";

const execAsync = promisify(exec);

export interface DomainHealth {
  dns_verified: boolean;
  hosting_provisioned: boolean;
  resolved_ips: string[];
  dns_message: string;
  site_url: string;
}

export async function getDomainHealth(domain: Domain): Promise<DomainHealth> {
  const serverIp = domain.server_ip ?? env.DEFAULT_SERVER_IP;
  const dns = await verifyDomainDns(domain.fqdn, serverIp);

  const { data: vhosts } = await getDb()
    .from("nginx_vhosts")
    .select("id, enabled, status")
    .eq("domain_id", domain.id)
    .limit(1);

  const vhost = vhosts?.[0] as { enabled?: boolean; status?: string } | undefined;
  const hosting_provisioned = Boolean(vhost?.enabled && vhost.status === "enabled");

  return {
    dns_verified: dns.verified,
    hosting_provisioned,
    resolved_ips: dns.resolved_ips,
    dns_message: dns.message,
    site_url: `http://${domain.fqdn}`,
  };
}

/** Crea/activa vhost Nginx + página por defecto para el dominio. */
export async function provisionDomainOnServer(
  userId: string,
  domain: Domain
): Promise<{ provisioned: boolean; vhost_id?: string }> {
  await ensureDefaultSite(domain.fqdn);

  const { data: existing } = await getDb()
    .from("nginx_vhosts")
    .select("id, enabled")
    .eq("domain_id", domain.id)
    .eq("user_id", userId)
    .limit(1);

  let vhostId: string;

  if (existing && existing.length > 0) {
    vhostId = (existing[0] as { id: string }).id;
    if (!(existing[0] as { enabled: boolean }).enabled) {
      await nginxService.enableVhost(userId, vhostId);
    }
  } else {
    const vhost = await nginxService.createVhost(userId, {
      server_name: domain.fqdn,
      domain_id: domain.id,
    });
    vhostId = vhost.id;
    await nginxService.enableVhost(userId, vhostId);
  }

  await reloadNginxIfConfigured();

  return { provisioned: true, vhost_id: vhostId };
}

async function reloadNginxIfConfigured(): Promise<void> {
  const cmd = process.env.NGINX_RELOAD_CMD?.trim();
  if (!cmd) return;
  try {
    await execAsync(cmd);
  } catch (err) {
    console.warn("[MatuHost] NGINX_RELOAD_CMD falló:", (err as Error).message);
  }
}

export async function verifyAndSyncDomain(
  userId: string,
  domain: Domain
): Promise<Domain & { health: DomainHealth }> {
  const serverIp = domain.server_ip ?? env.DEFAULT_SERVER_IP;
  const dns = await verifyDomainDns(domain.fqdn, serverIp);

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (dns.verified) {
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
  const health = await getDomainHealth(updated);

  return { ...updated, health };
}
