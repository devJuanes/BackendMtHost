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
  if (name === "@" || name === "" || name === zone) return `${zone}.`;
  if (name.endsWith(".")) return name;
  if (name.includes(".")) return `${name}.`;
  return `${name}.${zone}.`;
}

function formatRecord(rec: DnsRecord, zone: string): string | null {
  const ttl = rec.ttl ?? 3600;
  const name = rec.name === "@" ? "@" : rec.name;
  const owner = name === "@" ? "@" : name;

  switch (rec.type) {
    case "A":
      return `${owner.padEnd(20)} IN  A     ${ttl}  ${rec.content}`;
    case "AAAA":
      return `${owner.padEnd(20)} IN  AAAA  ${ttl}  ${rec.content}`;
    case "CNAME":
      return `${owner.padEnd(20)} IN  CNAME ${ttl}  ${fqdnDot(rec.content, zone)}`;
    case "MX":
      return `${owner.padEnd(20)} IN  MX    ${ttl}  ${rec.priority ?? 10} ${fqdnDot(rec.content, zone)}`;
    case "TXT":
      return `${owner.padEnd(20)} IN  TXT   ${ttl}  "${rec.content.replace(/"/g, '\\"')}"`;
    case "NS":
      return `${owner.padEnd(20)} IN  NS    ${ttl}  ${fqdnDot(rec.content, zone)}`;
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
    `@  IN  SOA  ${fqdnDot(config.ns1, zone)} ${admin}. (`,
    `        ${config.serial} ; serial`,
    `        3600       ; refresh`,
    `        1800       ; retry`,
    `        604800     ; expire`,
    `        86400 )    ; minimum`,
    "",
    `; Nameservers MatuHost`,
    `@  IN  NS   ${fqdnDot(config.ns1, zone)}`,
    `@  IN  NS   ${fqdnDot(config.ns2, zone)}`,
    `${config.ns1.split(".")[0].padEnd(20)} IN  A     ${config.serverIp}`,
    `${config.ns2.split(".")[0].padEnd(20)} IN  A     ${config.serverIp}`,
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
    lines.push(`@`.padEnd(20) + ` IN  A     3600  ${config.serverIp}`);
  }
  if (!records.some((r) => r.type === "A" && r.name === "www")) {
    lines.push(`www`.padEnd(20) + ` IN  A     3600  ${config.serverIp}`);
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
