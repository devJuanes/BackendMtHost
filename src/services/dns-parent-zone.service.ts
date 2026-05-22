import fs from "fs/promises";
import path from "path";
import { env } from "../config/env.js";
import { getChildLabelInParent, getDelegationParentFqdn } from "../utils/domain-dns.js";
import { runInfrastructureCommand } from "../utils/infrastructure.js";

const GLUE_MARKER = "; --- MatuHost NS glue (auto) ---";
const DELEGATION_MARKER = "; --- MatuHost child delegations (auto) ---";

function parentZoneFilePath(parentFqdn: string): string {
  if (env.PLATFORM_PARENT_ZONE_FILE?.trim()) {
    return env.PLATFORM_PARENT_ZONE_FILE.trim();
  }
  const safe = parentFqdn.replace(/\./g, "_");
  return path.join(env.DNS_ZONES_DIR, `db.${safe}`);
}

function fqdnDot(host: string, zone: string): string {
  const h = host.trim().toLowerCase();
  if (h.endsWith(".")) return h;
  if (h.includes(".")) return `${h}.`;
  return `${h}.${zone}.`;
}

/** Asegura registros glue ns1/ns2 → IP del VPS en la zona padre (matuhost.com). */
export async function syncParentZoneGlue(): Promise<void> {
  const parent = env.PLATFORM_PARENT_ZONE?.trim().toLowerCase();
  if (!parent) return;

  const zoneFile = parentZoneFilePath(parent);
  let body = "";
  try {
    body = await fs.readFile(zoneFile, "utf-8");
  } catch {
    return;
  }

  const ns1Host = env.MATUHOST_NS1.split(".")[0];
  const ns2Host = env.MATUHOST_NS2.split(".")[0];
  const ip = env.DEFAULT_SERVER_IP;
  const glueLines = [
    GLUE_MARKER,
    `${ns1Host}\tIN\tA\t${ip}`,
    `${ns2Host}\tIN\tA\t${ip}`,
  ];

  if (body.includes(GLUE_MARKER)) {
    const lines = body.split("\n");
    const start = lines.findIndex((l) => l.includes(GLUE_MARKER));
    let end = start + 1;
    while (end < lines.length && lines[end].trim() && !lines[end].startsWith("; ---")) {
      if (lines[end].includes("\tIN\tA\t")) end++;
      else break;
    }
    body = [...lines.slice(0, start), ...glueLines, "", ...lines.slice(end)].join("\n");
  } else {
    body = body.trimEnd() + "\n\n" + glueLines.join("\n") + "\n";
  }

  await fs.writeFile(zoneFile, body, "utf-8");
  await runInfrastructureCommand(env.DNS_RELOAD_CMD, "DNS reload (parent glue)");
}

/** Delega un subdominio (zona hija) en la zona padre con registros NS. */
export async function ensureChildDelegationInParent(childFqdn: string): Promise<boolean> {
  const parentFqdn = getDelegationParentFqdn(childFqdn);
  if (!parentFqdn) return false;

  const zoneFile = parentZoneFilePath(parentFqdn);
  let body = "";
  try {
    body = await fs.readFile(zoneFile, "utf-8");
  } catch {
    return false;
  }

  const label = getChildLabelInParent(childFqdn, parentFqdn);
  const owner = label === "@" ? "@" : label;
  const ns1 = fqdnDot(env.MATUHOST_NS1, parentFqdn);
  const ns2 = fqdnDot(env.MATUHOST_NS2, parentFqdn);
  const newLines = [
    `${owner}\tIN\tNS\t${ns1}`,
    `${owner}\tIN\tNS\t${ns2}`,
  ];

  if (!body.includes(DELEGATION_MARKER)) {
    body = body.trimEnd() + `\n\n${DELEGATION_MARKER}\n`;
  }

  const parts = body.split(DELEGATION_MARKER);
  let section = parts.length > 1 ? parts[1] : "\n";
  const sectionLines = section
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      if (!t || t.startsWith(";")) return true;
      return !t.startsWith(`${owner}\tIN\tNS`);
    });

  const merged = [
    parts[0].trimEnd(),
    "",
    DELEGATION_MARKER,
    ...sectionLines.filter((l) => l.trim() && !l.startsWith("; ---")),
    ...newLines,
    "",
    ...(parts[2] ? parts.slice(2).join(DELEGATION_MARKER) : "").split("\n").filter((l) => l.includes("; ---")),
  ]
    .filter(Boolean)
    .join("\n");

  await fs.writeFile(zoneFile, merged + "\n", "utf-8");
  await runInfrastructureCommand(env.DNS_RELOAD_CMD, "DNS reload (parent delegation)");
  return true;
}
