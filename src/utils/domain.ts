const FQDN_REGEX =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export function parseFqdn(fqdn: string): { fqdn: string; tld: string } | null {
  const normalized = fqdn.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!FQDN_REGEX.test(normalized)) return null;
  const parts = normalized.split(".");
  const tld = parts.slice(-1)[0];
  return { fqdn: normalized, tld };
}

export function isValidSubdomain(hostname: string, domainFqdn: string): boolean {
  const h = hostname.trim().toLowerCase();
  return h.endsWith(`.${domainFqdn}`) && h !== domainFqdn;
}
