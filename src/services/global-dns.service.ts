import { env } from "../config/env.js";
import type { Domain } from "../types/index.js";
import { isApexFqdn, getDelegationParentFqdn, getZoneNameserverHosts } from "../utils/domain-dns.js";
import { isUnderPlatformApex } from "../utils/dns-verify.js";
import { getDb, throwIfMatuError } from "../db/matu.js";
import { syncAuthoritativeZone } from "./dns-zone.service.js";
import {
  syncParentZoneGlue,
  ensureChildDelegationInParent,
} from "./dns-parent-zone.service.js";
import { publishViaRegistrarApi } from "./registrar/http-registrar.provider.js";
export interface GlobalDnsPublishResult {
  published: boolean;
  delegation_parent: boolean;
  registrar: boolean;
  message: string;
}

/**
 * Publica DNS global: zona BIND + glue padre + delegación hijo + API registrador (apex).
 */
export async function publishGlobalDns(
  domain: Pick<Domain, "id" | "fqdn" | "user_id">
): Promise<GlobalDnsPublishResult> {
  await syncAuthoritativeZone(domain);

  const messages: string[] = ["Zona BIND sincronizada"];
  let delegationParent = false;
  let registrar = false;

  await syncParentZoneGlue();

  const parentFqdn = getDelegationParentFqdn(domain.fqdn);
  if (parentFqdn) {
    const delegated = await ensureChildDelegationInParent(domain.fqdn);
    if (delegated) {
      delegationParent = true;
      messages.push(`Delegación NS en ${parentFqdn}`);
    }
  }

  const needsRegistrar =
    isApexFqdn(domain.fqdn) &&
    !isUnderPlatformApex(domain.fqdn) &&
    !getDelegationParentFqdn(domain.fqdn);

  if (needsRegistrar && env.REGISTRAR_API_URL?.trim()) {
    const reg = await publishViaRegistrarApi(domain.fqdn);
    registrar = reg.ok;
    messages.push(reg.message);
    await saveGlobalDnsMeta(domain.id, reg.ok ? "published" : "registrar_pending", reg.message);
  } else if (needsRegistrar) {
    const { ns1, ns2 } = getZoneNameserverHosts(domain.fqdn);
    messages.push(
      `Apex ${domain.fqdn}: define REGISTRAR_API_URL en el servidor para publicar NS/A automáticamente (${ns1}, ${ns2})`
    );
    await saveGlobalDnsMeta(domain.id, "registrar_required", `NS: ${ns1}, ${ns2}`);
  } else if (isUnderPlatformApex(domain.fqdn) || delegationParent) {
    messages.push("DNS global vía zona padre MatuHost");
    await saveGlobalDnsMeta(domain.id, "published", "Delegación plataforma");
  }

  const published = delegationParent || registrar || isUnderPlatformApex(domain.fqdn);

  return {
    published,
    delegation_parent: delegationParent,
    registrar,
    message: messages.join(" · "),
  };
}

async function saveGlobalDnsMeta(
  domainId: string,
  status: string,
  message: string
): Promise<void> {
  try {
    const { error } = await getDb()
      .from("domains")
      .eq("id", domainId)
      .update({
        global_dns_status: status,
        global_dns_message: message,
        global_dns_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    throwIfMatuError(error);
  } catch {
    /* columnas opcionales si no migraste schema-global-dns.sql */
  }
}
