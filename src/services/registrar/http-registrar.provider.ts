import { env } from "../../config/env.js";
import { getZoneNameserverHosts } from "../../utils/domain-dns.js";

export interface RegistrarPublishResult {
  ok: boolean;
  method: string;
  message: string;
}

async function postJson(url: string, body: unknown): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.REGISTRAR_API_KEY?.trim()) {
    headers.Authorization = `Bearer ${env.REGISTRAR_API_KEY.trim()}`;
    headers["X-Api-Key"] = env.REGISTRAR_API_KEY.trim();
  }
  return fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
}

/** Publica NS y/o registro A en el registrador vía API HTTP genérica. */
export async function publishViaRegistrarApi(fqdn: string): Promise<RegistrarPublishResult> {
  const base = env.REGISTRAR_API_URL?.trim();
  if (!base) {
    return { ok: false, method: "none", message: "REGISTRAR_API_URL no configurada" };
  }

  const { ns1, ns2 } = getZoneNameserverHosts(fqdn);
  const ip = env.DEFAULT_SERVER_IP;
  const mode = env.REGISTRAR_PUBLISH_MODE;
  const messages: string[] = [];
  let ok = false;

  if (mode === "nameservers" || mode === "both") {
    const nsPath =
      env.REGISTRAR_API_NS_PATH?.replace("{fqdn}", fqdn) ?? `/domains/${fqdn}/nameservers`;
    const url = `${base.replace(/\/$/, "")}${nsPath.startsWith("/") ? nsPath : `/${nsPath}`}`;
    try {
      const res = await postJson(url, { fqdn, nameservers: [ns1, ns2] });
      if (res.ok) {
        ok = true;
        messages.push(`NS publicados en registrador (${ns1}, ${ns2})`);
      } else {
        messages.push(`NS API ${res.status}: ${await res.text()}`);
      }
    } catch (err) {
      messages.push(`NS API error: ${(err as Error).message}`);
    }
  }

  if (mode === "a-record" || mode === "both") {
    const aPath = env.REGISTRAR_API_A_PATH?.replace("{fqdn}", fqdn) ?? `/domains/${fqdn}/dns`;
    const url = `${base.replace(/\/$/, "")}${aPath.startsWith("/") ? aPath : `/${aPath}`}`;
    try {
      const res = await postJson(url, {
        fqdn,
        records: [
          { type: "A", name: "@", content: ip, ttl: 3600 },
          { type: "A", name: "www", content: ip, ttl: 3600 },
        ],
      });
      if (res.ok) {
        ok = true;
        messages.push(`Registros A publicados en registrador → ${ip}`);
      } else {
        messages.push(`A API ${res.status}: ${await res.text()}`);
      }
    } catch (err) {
      messages.push(`A API error: ${(err as Error).message}`);
    }
  }

  return {
    ok,
    method: "http-registrar",
    message: messages.join(" · ") || "Sin cambios en registrador",
  };
}
