import fs from "fs/promises";
import path from "path";
import { getDb, throwIfMatuError, pickRow } from "../db/matu.js";
import { env } from "../config/env.js";
import type { DnsRecord, Domain } from "../types/index.js";
import { renderBindZoneFile, zoneSerialFromDate } from "../dns/bind-zone.js";
import { runInfrastructureCommand } from "../utils/infrastructure.js";
import { getZoneNameserverHosts } from "../utils/domain-dns.js";

export interface DnsZoneMeta {
  domain_id: string;
  fqdn: string;
  zone_file: string;
  serial: number;
  nameservers: string[];
  status: "active" | "pending" | "error";
}

function zoneFilePath(fqdn: string): string {
  const safe = fqdn.replace(/\./g, "_");
  return path.join(env.DNS_ZONES_DIR, `db.${safe}`);
}

function namedZoneBlock(fqdn: string, zoneFile: string): string {
  return `zone "${fqdn}" {
    type master;
    file "${zoneFile.replace(/\\/g, "/")}";
};\n`;
}

/** Registros DNS base creados por la plataforma (no el usuario manual). */
export async function seedPlatformDnsRecords(
  userId: string,
  domainId: string,
  fqdn: string
): Promise<void> {
  const ip = env.DEFAULT_SERVER_IP;
  const { ns1, ns2 } = getZoneNameserverHosts(fqdn);
  const rows = [
    { user_id: userId, domain_id: domainId, type: "NS", name: "@", content: ns1, ttl: 3600 },
    { user_id: userId, domain_id: domainId, type: "NS", name: "@", content: ns2, ttl: 3600 },
    { user_id: userId, domain_id: domainId, type: "A", name: "@", content: ip, ttl: 3600 },
    { user_id: userId, domain_id: domainId, type: "A", name: "www", content: ip, ttl: 3600 },
    {
      user_id: userId,
      domain_id: domainId,
      type: "TXT",
      name: "@",
      content: "v=spf1 include:_spf.matuhost.local ~all",
      ttl: 3600,
    },
  ];

  const { error } = await getDb().from("dns_records").insert(rows);
  throwIfMatuError(error);
}

/** Escribe zona BIND + include en named.conf.local */
export async function syncAuthoritativeZone(
  domain: Pick<Domain, "id" | "fqdn" | "user_id">
): Promise<DnsZoneMeta> {
  const { data: records, error } = await getDb()
    .from("dns_records")
    .select("*")
    .eq("domain_id", domain.id)
    .eq("user_id", domain.user_id);

  throwIfMatuError(error);
  const list = (records ?? []) as DnsRecord[];

  const serial = zoneSerialFromDate();
  const zoneFile = zoneFilePath(domain.fqdn);
  const zoneNs = getZoneNameserverHosts(domain.fqdn);
  const content = renderBindZoneFile(
    {
      fqdn: domain.fqdn,
      serverIp: env.DEFAULT_SERVER_IP,
      ns1: zoneNs.ns1,
      ns2: zoneNs.ns2,
      serial,
      adminEmail: env.DNS_ADMIN_EMAIL,
    },
    list
  );

  await fs.mkdir(env.DNS_ZONES_DIR, { recursive: true });
  await fs.writeFile(zoneFile, content, "utf-8");
  await updateNamedConfIncludes(domain.fqdn, zoneFile);

  const meta: DnsZoneMeta = {
    domain_id: domain.id,
    fqdn: domain.fqdn,
    zone_file: zoneFile,
    serial,
    nameservers: [env.MATUHOST_NS1, env.MATUHOST_NS2],
    status: "active",
  };

  await upsertZoneRow(domain.id, meta);
  await runInfrastructureCommand(env.DNS_RELOAD_CMD, "DNS reload");

  return meta;
}

async function upsertZoneRow(domainId: string, meta: DnsZoneMeta): Promise<void> {
  const { data: existing } = await getDb()
    .from("dns_zones")
    .select("id")
    .eq("domain_id", domainId)
    .limit(1);

  const row = {
    domain_id: domainId,
    fqdn: meta.fqdn,
    zone_file: meta.zone_file,
    serial: meta.serial,
    nameserver_1: meta.nameservers[0],
    nameserver_2: meta.nameservers[1],
    status: meta.status,
    updated_at: new Date().toISOString(),
  };

  if (existing && existing.length > 0) {
    const { error } = await getDb().from("dns_zones").eq("domain_id", domainId).update(row);
    throwIfMatuError(error);
  } else {
    const { error } = await getDb().from("dns_zones").insert({
      ...row,
      created_at: new Date().toISOString(),
    });
    throwIfMatuError(error);
  }
}

const INCLUDE_MARKER = "# --- MatuHost zones (auto) ---";

async function updateNamedConfIncludes(fqdn: string, zoneFile: string): Promise<void> {
  const includePath = env.DNS_NAMED_CONF_SNIPPET;
  await fs.mkdir(path.dirname(includePath), { recursive: true });

  let body = "";
  try {
    body = await fs.readFile(includePath, "utf-8");
  } catch {
    body = `${INCLUDE_MARKER}\n`;
  }

  if (!body.includes(INCLUDE_MARKER)) {
    body = `${INCLUDE_MARKER}\n${body}`;
  }

  const block = namedZoneBlock(fqdn, path.resolve(zoneFile));
  const zoneRe = new RegExp(
    `zone\\s+"${fqdn.replace(/\./g, "\\.")}"\\s*\\{[^}]*\\};\\s*`,
    "g"
  );

  if (!zoneRe.test(body)) {
    body = body.trimEnd() + "\n\n" + block;
  } else {
    body = body.replace(zoneRe, block);
  }

  await fs.writeFile(includePath, body, "utf-8");
}

export async function removeAuthoritativeZone(fqdn: string, domainId: string): Promise<void> {
  const zoneFile = zoneFilePath(fqdn);
  try {
    await fs.unlink(zoneFile);
  } catch {
    /* ignore */
  }

  const includePath = env.DNS_NAMED_CONF_SNIPPET;
  try {
    let body = await fs.readFile(includePath, "utf-8");
    const zoneRe = new RegExp(
      `zone\\s+"${fqdn.replace(/\./g, "\\.")}"\\s*\\{[^}]*\\};\\s*`,
      "g"
    );
    body = body.replace(zoneRe, "");
    await fs.writeFile(includePath, body, "utf-8");
  } catch {
    /* ignore */
  }

  await getDb().from("dns_zones").eq("domain_id", domainId).delete();
  await runInfrastructureCommand(env.DNS_RELOAD_CMD, "DNS reload");
}

export async function syncAllZones(): Promise<number> {
  const { data, error } = await getDb().from("domains").select("id, fqdn, user_id");
  throwIfMatuError(error);
  const domains = (data ?? []) as Pick<Domain, "id" | "fqdn" | "user_id">[];
  for (const d of domains) {
    await syncAuthoritativeZone(d);
  }
  return domains.length;
}

export async function getZoneForDomain(domainId: string): Promise<DnsZoneMeta | null> {
  const { data, error } = await getDb().from("dns_zones").select("*").eq("domain_id", domainId).maybeSingle();
  throwIfMatuError(error);
  if (!data) return null;
  const z = data as Record<string, unknown>;
  return {
    domain_id: domainId,
    fqdn: z.fqdn as string,
    zone_file: z.zone_file as string,
    serial: z.serial as number,
    nameservers: [z.nameserver_1 as string, z.nameserver_2 as string],
    status: z.status as DnsZoneMeta["status"],
  };
}
