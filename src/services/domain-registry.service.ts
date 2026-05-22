import { getDb, throwIfMatuError } from "../db/matu.js";
import { parseFqdn } from "../utils/domain.js";
import { ValidationError, ConflictError } from "../utils/errors.js";
import { env } from "../config/env.js";
import { getZoneNameserverHosts } from "../utils/domain-dns.js";

export interface DomainAvailability {
  fqdn: string;
  available: boolean;
  reason: string;
  platform_managed: boolean;
  suggested_nameservers: string[];
}

/** Registro interno MatuHost (mini registrador — sin ICANN por ahora). */
export async function checkDomainAvailability(fqdnInput: string): Promise<DomainAvailability> {
  const parsed = parseFqdn(fqdnInput);
  if (!parsed) {
    return {
      fqdn: fqdnInput.toLowerCase(),
      available: false,
      reason: "Formato de dominio inválido",
      platform_managed: false,
      suggested_nameservers: [],
    };
  }

  const { data, error } = await getDb()
    .from("domains")
    .select("id")
    .eq("fqdn", parsed.fqdn)
    .limit(1);

  throwIfMatuError(error);

  const taken = data && data.length > 0;
  return {
    fqdn: parsed.fqdn,
    available: !taken,
    reason: taken
      ? "Ya registrado en MatuHost"
      : "Disponible para registro en la plataforma",
    platform_managed: true,
    suggested_nameservers: Object.values(getZoneNameserverHosts(parsed.fqdn)),
  };
}

export function assertDomainAvailable(fqdn: string): void {
  const check = parseFqdn(fqdn);
  if (!check) throw new ValidationError("Invalid domain name");
}

export async function assertNotRegistered(fqdn: string): Promise<void> {
  const result = await checkDomainAvailability(fqdn);
  if (!result.available) {
    throw new ConflictError(result.reason);
  }
}
