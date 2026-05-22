import { getDb, throwIfMatuError } from "../db/matu.js";
import { env } from "../config/env.js";
import type { Domain } from "../types/index.js";
import { ensureDefaultSite } from "../utils/default-site.js";
import { verifyDomainDns, verifyDomainDnsAuthoritative } from "../utils/dns-verify.js";
import { runInfrastructureCommand } from "../utils/infrastructure.js";
import * as nginxService from "./nginx.service.js";
import {
  seedPlatformDnsRecords,
  syncAuthoritativeZone,
  getZoneForDomain,
} from "./dns-zone.service.js";
import type { DomainHealth } from "./domain-provision.service.js";
import { publishGlobalDns } from "./global-dns.service.js";
import { ensureNginxDefaultSite } from "./nginx-default.service.js";

export interface ProvisionResult {
  domain: Domain;
  health: DomainHealth;
  zone_synced: boolean;
  nginx_enabled: boolean;
  ssl_attempted: boolean;
}

export async function fullProvisionDomain(
  userId: string,
  domain: Domain,
  options?: { skipDnsSeed?: boolean }
): Promise<ProvisionResult> {
  if (!options?.skipDnsSeed) {
    const { data: existing } = await getDb()
      .from("dns_records")
      .select("id")
      .eq("domain_id", domain.id)
      .limit(1);
    if (!existing?.length) {
      await seedPlatformDnsRecords(userId, domain.id, domain.fqdn);
    }
  }

  await publishGlobalDns(domain);
  await ensureDefaultSite(domain.fqdn);
  await ensureNginxDefaultSite();

  const { data: vhosts } = await getDb()
    .from("nginx_vhosts")
    .select("id, enabled")
    .eq("domain_id", domain.id)
    .eq("user_id", userId)
    .limit(1);

  let nginx_enabled = false;
  if (vhosts?.length) {
    const v = vhosts[0] as { id: string; enabled: boolean };
    if (!v.enabled) await nginxService.enableVhost(userId, v.id);
    nginx_enabled = true;
  } else {
    const vhost = await nginxService.createVhost(userId, {
      server_name: domain.fqdn,
      domain_id: domain.id,
    });
    await nginxService.enableVhost(userId, vhost.id);
    nginx_enabled = true;
  }

  await runInfrastructureCommand(env.NGINX_RELOAD_CMD, "Nginx reload");

  let ssl_attempted = false;
  if (env.CERTBOT_CMD?.trim() && domain.status === "active") {
    ssl_attempted = true;
    await runInfrastructureCommand(
      env.CERTBOT_CMD.replace("{fqdn}", domain.fqdn),
      "Certbot SSL"
    );
  }

  const health = await buildHealth(domain);
  return {
    domain,
    health,
    zone_synced: true,
    nginx_enabled,
    ssl_attempted,
  };
}

export async function buildHealth(domain: Domain): Promise<DomainHealth> {
  const serverIp = domain.server_ip ?? env.DEFAULT_SERVER_IP;
  const auth = await verifyDomainDnsAuthoritative(domain.fqdn, serverIp);
  const combined = await verifyDomainDns(domain.fqdn, serverIp);
  const zone = await getZoneForDomain(domain.id);

  const { data: vhosts } = await getDb()
    .from("nginx_vhosts")
    .select("enabled, status")
    .eq("domain_id", domain.id)
    .limit(1);
  const vhost = vhosts?.[0] as { enabled?: boolean; status?: string } | undefined;

  const platformOnline = auth.verified;

  return {
    dns_verified: platformOnline,
    hosting_provisioned: Boolean(vhost?.enabled && zone?.status === "active"),
    resolved_ips: combined.resolved_ips,
    dns_message: combined.message,
    site_url: `http://${domain.fqdn}`,
    global_dns_ready: combined.public_resolved,
    authoritative: platformOnline,
    public_resolved: combined.public_resolved,
    nameservers: zone?.nameservers ?? [env.MATUHOST_NS1, env.MATUHOST_NS2],
  };
}
