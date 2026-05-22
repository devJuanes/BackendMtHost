import { env } from "../config/env.js";

const FQDN_REGEX =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

const LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

/** Convierte "miweb" → "miweb.hosts.matuhost.com" si hay PLATFORM_APEX_DOMAIN. */
export function normalizeRegistrationFqdn(input: string): string {
  const raw = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const apex = env.PLATFORM_APEX_DOMAIN?.trim().toLowerCase();
  if (!apex) return raw;
  if (raw.includes(".")) return raw;
  if (!LABEL_REGEX.test(raw)) return raw;
  return `${raw}.${apex}`;
}

export function parseFqdn(fqdn: string): { fqdn: string; tld: string } | null {
  const normalized = normalizeRegistrationFqdn(fqdn);
  if (!FQDN_REGEX.test(normalized)) return null;
  const parts = normalized.split(".");
  const tld = parts.slice(-1)[0];
  return { fqdn: normalized, tld };
}

export function isValidSubdomain(hostname: string, domainFqdn: string): boolean {
  const h = hostname.trim().toLowerCase();
  return h.endsWith(`.${domainFqdn}`) && h !== domainFqdn;
}
