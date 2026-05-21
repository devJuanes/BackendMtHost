import fs from "fs/promises";
import path from "path";
import { env } from "../config/env.js";
import { renderDefaultSiteHtml } from "../templates/default-site.js";

const MARKER = "<!-- matuhost-default-site -->";

export function getDomainDocumentRoot(fqdn: string): string {
  return path.join(env.DEFAULT_DOCUMENT_ROOT, fqdn, "public_html");
}

export function getPanelUrl(): string {
  const origin = env.CORS_ORIGIN.split(",")[0]?.trim() ?? "http://localhost:3000";
  return `${origin.replace(/\/$/, "")}/dashboard`;
}

/** Escribe index.html de marca si no existe o sigue siendo la página por defecto anterior. */
export async function ensureDefaultSite(fqdn: string): Promise<string> {
  const documentRoot = getDomainDocumentRoot(fqdn);
  const indexPath = path.join(documentRoot, "index.html");

  await fs.mkdir(documentRoot, { recursive: true });

  let shouldWrite = true;
  try {
    const existing = await fs.readFile(indexPath, "utf-8");
    if (!existing.includes(MARKER) && !existing.includes("MatuHost — Sitio en preparación")) {
      shouldWrite = false;
    }
  } catch {
    /* no existe → crear */
  }

  const html =
    MARKER +
    "\n" +
    renderDefaultSiteHtml({
      fqdn,
      panelUrl: getPanelUrl(),
      docsUrl: `${getPanelUrl()}/hosting`,
    });

  if (shouldWrite) {
    await fs.writeFile(indexPath, html, "utf-8");
  }

  return documentRoot;
}
