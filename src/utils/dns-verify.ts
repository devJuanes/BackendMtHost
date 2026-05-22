import dns from "dns/promises";

export interface DnsVerifyResult {
  verified: boolean;
  resolved_ips: string[];
  message: string;
}

/** Comprueba si el dominio (y opcionalmente www) resuelve a la IP del servidor. */
export async function verifyDomainDns(fqdn: string, expectedIp: string): Promise<DnsVerifyResult> {
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
        resolved_ips: [...allIps],
        message: `Error DNS (${host}): ${(err as Error).message}`,
      };
    }
  }

  if (allIps.size === 0) {
    return {
      verified: false,
      resolved_ips: [],
      message:
        "El dominio no resuelve en Internet (NXDOMAIN). Crea registros A en tu registrador apuntando a la IP del servidor.",
    };
  }

  const verified = allIps.has(expected);
  return {
    verified,
    resolved_ips: [...allIps],
    message: verified
      ? `DNS correcto: apunta a ${expected}`
      : `DNS resuelve a ${[...allIps].join(", ")} pero se esperaba ${expected}. Actualiza el registro A en tu registrador.`,
  };
}
