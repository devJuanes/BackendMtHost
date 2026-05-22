import { env } from "../config/env.js";
import { isUnderPlatformApex } from "./dns-verify.js";

/** Dominio apex (ej. landatech.ai, matuhost.com). */
export function isApexFqdn(fqdn: string): boolean {
  const parts = fqdn.toLowerCase().split(".");
  return parts.length === 2;
}

/** Zona padre donde debemos delegar (ej. miweb.hosts.matuhost.com → hosts.matuhost.com). */
export function getDelegationParentFqdn(fqdn: string): string | null {
  const f = fqdn.toLowerCase();
  const platformParent = env.PLATFORM_PARENT_ZONE?.trim().toLowerCase();
  const platformApex = env.PLATFORM_APEX_DOMAIN?.trim().toLowerCase();

  if (platformApex && f.endsWith(`.${platformApex}`) && f !== platformApex) {
    return platformApex;
  }
  if (platformParent && platformApex && f === platformApex) {
    return platformParent;
  }
  if (platformParent && f.endsWith(`.${platformParent}`) && f !== platformParent) {
    return platformParent;
  }
  return null;
}

export function getChildLabelInParent(childFqdn: string, parentFqdn: string): string {
  const suffix = `.${parentFqdn.toLowerCase()}`;
  const label = childFqdn.toLowerCase().replace(suffix, "");
  return label || "@";
}

/** Nameservers publicados en la zona del dominio. */
export function getZoneNameserverHosts(fqdn: string): { ns1: string; ns2: string } {
  const mode = env.MATUHOST_NS_MODE;
  if (mode === "in-zone" || (isApexFqdn(fqdn) && !isUnderPlatformApex(fqdn) && !getDelegationParentFqdn(fqdn))) {
    return { ns1: `ns1.${fqdn}`, ns2: `ns2.${fqdn}` };
  }
  return { ns1: env.MATUHOST_NS1, ns2: env.MATUHOST_NS2 };
}
