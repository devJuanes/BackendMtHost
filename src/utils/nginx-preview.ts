import { env } from "../config/env.js";

/** URL para ver la bienvenida sin DNS global (IP del VPS + ruta preview). */
export function getPreviewSiteUrl(fqdn: string): string {
  const ip = env.DEFAULT_SERVER_IP;
  const prefix = env.SITE_PREVIEW_PATH.replace(/\/$/, "");
  return `http://${ip}${prefix}/${fqdn}/`;
}
