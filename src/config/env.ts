import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  MATUDB_URL: z.string().url().default("http://localhost:3001"),
  MATUDB_PROJECT_ID: z.string().min(1, "MATUDB_PROJECT_ID is required"),
  MATUDB_API_KEY: z.string().min(1, "MATUDB_API_KEY is required"),
  MATUDB_USE_SUPABASE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  NGINX_VHOSTS_DIR: z.string().default("./data/nginx/sites-available"),
  NGINX_SITES_ENABLED_DIR: z.string().default("./data/nginx/sites-enabled"),
  DEFAULT_SERVER_IP: z.string().default("127.0.0.1"),
  DEFAULT_DOCUMENT_ROOT: z.string().default("./data/www"),
  DNS_ZONES_DIR: z.string().default("./data/dns/zones"),
  DNS_NAMED_CONF_SNIPPET: z.string().default("./data/dns/matuhost-zones.conf"),
  DNS_SERVER_IP: z.string().optional(),
  MATUHOST_NS1: z.string().default("ns1.matuhost.com"),
  MATUHOST_NS2: z.string().default("ns2.matuhost.com"),
  DNS_ADMIN_EMAIL: z.string().default("hostmaster.matuhost.com"),
  DNS_RELOAD_CMD: z.string().optional(),
  NGINX_RELOAD_CMD: z.string().optional(),
  CERTBOT_CMD: z.string().optional(),
  /** Dominio apex de la plataforma (ej. hosts.matuhost.com). Registro "miweb" → miweb.hosts.matuhost.com */
  PLATFORM_APEX_DOMAIN: z.string().optional(),
  /** Zona padre con glue (ej. matuhost.com) */
  PLATFORM_PARENT_ZONE: z.string().optional(),
  PLATFORM_PARENT_ZONE_FILE: z.string().optional(),
  /** platform = ns1.matuhost.com · in-zone = ns1.tudominio.com (apex) */
  MATUHOST_NS_MODE: z.enum(["platform", "in-zone"]).default("platform"),
  REGISTRAR_API_URL: z.string().optional(),
  REGISTRAR_API_KEY: z.string().optional(),
  REGISTRAR_PUBLISH_MODE: z.enum(["nameservers", "a-record", "both"]).default("both"),
  REGISTRAR_API_NS_PATH: z.string().optional(),
  REGISTRAR_API_A_PATH: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

export const env = {
  ...data,
  DNS_SERVER_IP: data.DNS_SERVER_IP ?? data.DEFAULT_SERVER_IP,
};
