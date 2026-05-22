import fs from "fs/promises";
import path from "path";
import { env } from "../config/env.js";
import { renderMatuHostServerLandingHtml } from "../templates/matuhost-server-landing.js";

const DEFAULT_CONF = "matuhost-default-server.conf";

/** Reemplaza la página "Welcome to nginx" al visitar la IP del VPS. */
export async function ensureNginxDefaultSite(): Promise<void> {
  const root = path.join(env.DEFAULT_DOCUMENT_ROOT, "_matuhost_default");
  const indexPath = path.join(root, "index.html");
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(indexPath, renderMatuHostServerLandingHtml(env.DEFAULT_SERVER_IP), "utf-8");

  const conf = `# MatuHost — default_server (IP del VPS)
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root ${root.replace(/\\/g, "/")};
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
`;

  const dir = env.NGINX_SITES_ENABLED_DIR;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, DEFAULT_CONF), conf, "utf-8");
  await fs.mkdir(env.NGINX_VHOSTS_DIR, { recursive: true });
  await fs.writeFile(path.join(env.NGINX_VHOSTS_DIR, DEFAULT_CONF), conf, "utf-8");
}
