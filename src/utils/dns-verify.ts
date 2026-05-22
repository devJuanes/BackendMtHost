import dns from "dns/promises";
import { env } from "../config/env.js";

export interface DnsVerifyResult {
  verified: boolean;
  authoritative: boolean;
  resolved_ips: string[];
  message: string;
}

async function resolveAt(fqdn: string, nameserverIp: string): Promise<string[]> {
  const resolver = new dns.Resolver();
  resolver.setServers([nameserverIp]);
  const hosts = [fqdn, `www.${fqdn}`];
  const ips = new Set<string>();
  for (const host of hosts) {
    try {
      const answers = await resolver.resolve4(host);
      answers.forEach((ip) => ips.add(ip));
    } catch {
      /* host sin registro */
    }
  }
  return [...ips];
}

/** Consulta el DNS autoritativo de MatuHost (BIND en el VPS). */
export async function verifyDomainDnsAuthoritative(
  fqdn: string,
  expectedIp: string
): Promise<DnsVerifyResult> {
  const server = env.DNS_SERVER_IP || env.DEFAULT_SERVER_IP;
  const ips = await resolveAt(fqdn, server);

  if (ips.length === 0) {
    return {
      verified: false,
      authoritative: false,
      resolved_ips: [],
      message:
        "La zona existe en MatuHost pero BIND aún no responde. Ejecuta en el servidor: npm run dns:sync y verifica que el puerto 53 esté abierto.",
    };
  }

  const verified = ips.includes(expectedIp.trim());
  return {
    verified,
    authoritative: true,
    resolved_ips: ips,
    message: verified
      ? `DNS MatuHost activo (${server}): el dominio apunta a ${expectedIp}`
      : `DNS MatuHost responde ${ips.join(", ")} pero se esperaba ${expectedIp}`,
  };
}

/** Resolución pública (Internet) — requiere delegación NS hacia MatuHost o registro en TLD padre. */
export async function verifyDomainDnsPublic(
  fqdn: string,
  expectedIp: string
): Promise<DnsVerifyResult> {
  const expected = expectedIp.trim();
  const hosts = [fqdn, `www.${fqdn}`];
  const allIps = new Set<string>();

  for (const host of hosts) {
    try {
      const ips = await dns.resolve4(host);
      ips.forEach((ip) => allIps.add(ip));
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOTFOUND" || code === "ENODATA") continue;
      return {
        verified: false,
        authoritative: false,
        resolved_ips: [...allIps],
        message: `Error DNS público (${host}): ${(err as Error).message}`,
      };
    }
  }

  if (allIps.size === 0) {
    return {
      verified: false,
      authoritative: false,
      resolved_ips: [],
      message: `Sin resolución pública. Delega NS a ${env.MATUHOST_NS1} y ${env.MATUHOST_NS2} en el registrador del TLD (futuro: API registrador MatuHost).`,
    };
  }

  const verified = allIps.has(expected);
  return {
    verified,
    authoritative: false,
    resolved_ips: [...allIps],
    message: verified
      ? `DNS público OK: ${expected}`
      : `DNS público resuelve a ${[...allIps].join(", ")} (esperado ${expected})`,
  };
}

/** Autoritativo primero; si OK, dominio en línea en la plataforma. */
export async function verifyDomainDns(fqdn: string, expectedIp: string): Promise<DnsVerifyResult> {
  const auth = await verifyDomainDnsAuthoritative(fqdn, expectedIp);
  if (auth.verified) return auth;

  const pub = await verifyDomainDnsPublic(fqdn, expectedIp);
  if (pub.verified) return pub;

  return auth.resolved_ips.length > 0 ? auth : pub;
}
