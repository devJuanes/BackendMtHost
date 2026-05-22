import dns from "dns/promises";
import { env } from "../config/env.js";

export interface DnsVerifyResult {
  /** Listo para servir desde MatuHost (BIND + IP correcta). */
  verified: boolean;
  authoritative: boolean;
  /** Resuelve desde DNS público (Google, ISP, etc.). */
  public_resolved: boolean;
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
      /* sin registro en este host */
    }
  }
  return [...ips];
}

export function isUnderPlatformApex(fqdn: string): boolean {
  const apex = env.PLATFORM_APEX_DOMAIN?.trim().toLowerCase();
  if (!apex) return false;
  const f = fqdn.toLowerCase();
  return f === apex || f.endsWith(`.${apex}`);
}

function authoritativeResolvers(): string[] {
  const seen = new Set<string>();
  for (const ip of ["127.0.0.1", "::1", env.DNS_SERVER_IP, env.DEFAULT_SERVER_IP]) {
    if (ip && !seen.has(ip)) seen.add(ip);
  }
  return [...seen];
}

/** Consulta el DNS autoritativo de MatuHost (BIND en el VPS). */
export async function verifyDomainDnsAuthoritative(
  fqdn: string,
  expectedIp: string
): Promise<DnsVerifyResult> {
  const expected = expectedIp.trim();
  let ips: string[] = [];
  let usedResolver = "";

  for (const server of authoritativeResolvers()) {
    const answers = await resolveAt(fqdn, server);
    if (answers.length > 0) {
      ips = answers;
      usedResolver = server;
      break;
    }
  }

  if (ips.length === 0) {
    return {
      verified: false,
      authoritative: false,
      public_resolved: false,
      resolved_ips: [],
      message:
        "BIND no responde en este servidor. Ejecuta: sudo systemctl status named · npm run dns:sync · dig @127.0.0.1 " +
        fqdn +
        " A +short",
    };
  }

  const ok = ips.includes(expected);
  return {
    verified: ok,
    authoritative: ok,
    public_resolved: false,
    resolved_ips: ips,
    message: ok
      ? `Activo en MatuHost (DNS ${usedResolver}) → ${expected}. Sitio: http://${fqdn}`
      : `BIND (${usedResolver}) devuelve ${ips.join(", ")}; se esperaba ${expected}`,
  };
}

/** Resolución pública global (opcional; no bloquea el panel). */
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
        public_resolved: false,
        resolved_ips: [...allIps],
        message: `Error DNS público (${host}): ${(err as Error).message}`,
      };
    }
  }

  if (allIps.size === 0) {
    return {
      verified: false,
      authoritative: false,
      public_resolved: false,
      resolved_ips: [],
      message: isUnderPlatformApex(fqdn)
        ? "DNS global: propagando. La delegación en la zona padre MatuHost ya se publicó."
        : "DNS global: propagando. El API del registrador publicó NS/A; puede tardar unos minutos.",
    };
  }

  const ok = allIps.has(expected);
  return {
    verified: ok,
    authoritative: false,
    public_resolved: ok,
    resolved_ips: [...allIps],
    message: ok
      ? `DNS público global OK → ${expected}`
      : `DNS público: ${[...allIps].join(", ")} (esperado ${expected})`,
  };
}

/**
 * Verificación completa: MatuHost autoritativo = en línea en la plataforma.
 * Público global es informativo adicional.
 */
export async function verifyDomainDns(fqdn: string, expectedIp: string): Promise<DnsVerifyResult> {
  const auth = await verifyDomainDnsAuthoritative(fqdn, expectedIp);
  const pub = await verifyDomainDnsPublic(fqdn, expectedIp);

  if (auth.verified) {
    const message = pub.public_resolved
      ? `${auth.message} · ${pub.message}`
      : `${auth.message} · DNS global propagando (reintenta verificar en 2–5 min).`;
    return {
      verified: true,
      authoritative: true,
      public_resolved: pub.public_resolved,
      resolved_ips: auth.resolved_ips.length ? auth.resolved_ips : pub.resolved_ips,
      message,
    };
  }

  if (pub.public_resolved) {
    return { ...pub, verified: true };
  }

  return {
    verified: false,
    authoritative: auth.authoritative,
    public_resolved: false,
    resolved_ips: auth.resolved_ips.length ? auth.resolved_ips : pub.resolved_ips,
    message: auth.message || pub.message,
  };
}
