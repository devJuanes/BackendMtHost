import { env } from "../config/env.js";
import { getZoneNameserverHosts } from "./domain-dns.js";
import { isUnderPlatformApex } from "./dns-verify.js";
import { getDelegationParentFqdn } from "./domain-dns.js";

export interface ManualDnsInstructions {
  fqdn: string;
  server_ip: string;
  mode: "a-records" | "nameservers" | "platform-parent";
  steps: string[];
  a_records: { name: string; type: string; value: string }[];
  nameservers: string[];
}

/** Pasos para activar DNS global manualmente en el registrador del dominio. */
export function getManualDnsInstructions(fqdn: string): ManualDnsInstructions {
  const ip = env.DEFAULT_SERVER_IP;
  const { ns1, ns2 } = getZoneNameserverHosts(fqdn);
  const parent = getDelegationParentFqdn(fqdn);

  if (isUnderPlatformApex(fqdn) || parent) {
    return {
      fqdn,
      server_ip: ip,
      mode: "platform-parent",
      nameservers: [env.MATUHOST_NS1, env.MATUHOST_NS2],
      a_records: [],
      steps: [
        `En el registrador de ${env.PLATFORM_PARENT_ZONE ?? "tu zona padre"}, delega ${env.PLATFORM_APEX_DOMAIN ?? "el subdominio plataforma"} a:`,
        `  ${env.MATUHOST_NS1}`,
        `  ${env.MATUHOST_NS2}`,
        `Glue (A) de esos NS en la zona padre → ${ip}`,
        `Luego pulsa ↻ en el panel.`,
      ],
    };
  }

  return {
    fqdn,
    server_ip: ip,
    mode: "a-records",
    nameservers: [ns1, ns2],
    a_records: [
      { name: "@", type: "A", value: ip },
      { name: "www", type: "A", value: ip },
    ],
    steps: [
      `Opción rápida (recomendada): en el registrador de ${fqdn} crea registros A:`,
      `  @  →  ${ip}`,
      `  www  →  ${ip}`,
      `Espera 5–30 min y pulsa ↻ en el panel.`,
      `Opción NS (avanzada): nameservers ${ns1} y ${ns2}, con glue A de cada uno → ${ip}`,
    ],
  };
}

export function formatManualDnsMessage(fqdn: string): string {
  const m = getManualDnsInstructions(fqdn);
  return m.steps.join("\n");
}
