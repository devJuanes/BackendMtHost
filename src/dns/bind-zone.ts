import type { DnsRecord } from "../types/index.js";

export interface BindZoneConfig {
  fqdn: string;
  serverIp: string;
  ns1: string;
  ns2: string;
  serial: number;
  adminEmail?: string;
}

function fqdnDot(name: string, zone: string): string {
  const n = name.trim().toLowerCase();
  if (n === "@" || n === "" || n === zone) return `${zone}.`;
  if (n.endsWith(".")) return n;
  if (n.includes(".")) return `${n}.`;
  return `${n}.${zone}.`;
}

/** Formato BIND: owner [TTL] IN type rdata (TTL global vía $TTL). */
function formatRecord(rec: DnsRecord, zone: string): string | null {
  const owner = rec.name === "@" ? "@" : rec.name;

  switch (rec.type) {
    case "A":
      return `${owner}\tIN\tA\t${rec.content.trim()}`;
    case "AAAA":
      return `${owner}\tIN\tAAAA\t${rec.content.trim()}`;
    case "CNAME":
      return `${owner}\tIN\tCNAME\t${fqdnDot(rec.content, zone)}`;
    case "MX":
      return `${owner}\tIN\tMX\t${rec.priority ?? 10}\t${fqdnDot(rec.content, zone)}`;
    case "TXT":
      return `${owner}\tIN\tTXT\t"${rec.content.replace(/"/g, '\\"')}"`;
    case "NS":
      return `${owner}\tIN\tNS\t${fqdnDot(rec.content, zone)}`;
    default:
      return null;
  }
}

/** Genera archivo de zona BIND9 autoritativa. */
export function renderBindZoneFile(config: BindZoneConfig, records: DnsRecord[]): string {
  const zone = config.fqdn;
  const admin = (config.adminEmail ?? "hostmaster.matuhost.com").replace("@", ".");

  const lines: string[] = [
    `; MatuHost authoritative zone — ${zone}`,
    `; Generated ${new Date().toISOString()}`,
    `$TTL 3600`,
    `@\tIN\tSOA\t${fqdnDot(config.ns1, zone)} ${admin}. (`,
    `\t\t${config.serial}\t; serial`,
    `\t\t3600\t\t; refresh`,
    `\t\t1800\t\t; retry`,
    `\t\t604800\t\t; expire`,
    `\t\t86400 )\t\t; minimum`,
    "",
    `; Nameservers MatuHost`,
    `@\tIN\tNS\t${fqdnDot(config.ns1, zone)}`,
    `@\tIN\tNS\t${fqdnDot(config.ns2, zone)}`,
    "",
    `; Records from MatuHost DNS Manager`,
  ];

  const seen = new Set<string>();
  for (const rec of records) {
    if (rec.type === "NS" && rec.name === "@") continue;
    const line = formatRecord(rec, zone);
    if (!line || seen.has(line)) continue;
    seen.add(line);
    lines.push(line);
  }

  if (!records.some((r) => r.type === "A" && (r.name === "@" || r.name === zone))) {
    lines.push(`@\tIN\tA\t${config.serverIp}`);
  }
  if (!records.some((r) => r.type === "A" && r.name === "www")) {
    lines.push(`www\tIN\tA\t${config.serverIp}`);
  }

  for (const nsHost of [config.ns1, config.ns2]) {
    const h = nsHost.toLowerCase();
    if (!h.endsWith(`.${zone}`)) continue;
    const label = h.slice(0, -(zone.length + 1));
    if (!label || records.some((r) => r.type === "A" && r.name === label)) continue;
    lines.push(`${label}\tIN\tA\t${config.serverIp}`);
  }

  lines.push("");
  return lines.join("\n");
}

export function zoneSerialFromDate(d = new Date()): number {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return Number(`${y}${m}${day}01`);
}
