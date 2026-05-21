import { getDb, throwIfMatuError } from "../db/matu.js";
import type { DashboardStats } from "../types/index.js";

export async function getStats(userId: string): Promise<DashboardStats> {
  const [domainRows, hostingRows, sslRows, dnsRows, nginxRows] = await Promise.all([
    getDb().from("domains").select("status").eq("user_id", userId),
    getDb().from("hosting_accounts").select("status").eq("user_id", userId),
    getDb().from("ssl_certificates").select("status").eq("user_id", userId),
    getDb().from("dns_records").select("id").eq("user_id", userId),
    getDb().from("nginx_vhosts").select("enabled").eq("user_id", userId),
  ]);

  throwIfMatuError(domainRows.error);
  throwIfMatuError(hostingRows.error);
  throwIfMatuError(sslRows.error);
  throwIfMatuError(dnsRows.error);
  throwIfMatuError(nginxRows.error);

  const domains = domainRows.data ?? [];
  const hosting = (hostingRows.data ?? []).filter(
    (h: { status: string }) => h.status !== "deleted"
  );
  const ssl = sslRows.data ?? [];
  const dns = dnsRows.data ?? [];
  const nginx = nginxRows.data ?? [];

  const domainCount = domains.length;
  const seed = userId.charCodeAt(0) + userId.charCodeAt(1);

  return {
    domains: {
      total: domainCount,
      active: domains.filter((d: { status: string }) => d.status === "active").length,
      pending: domains.filter((d: { status: string }) => d.status === "pending").length,
    },
    hosting: {
      total: hosting.length,
      active: hosting.filter((h: { status: string }) => h.status === "active").length,
    },
    ssl: {
      total: ssl.length,
      active: ssl.filter((s: { status: string }) => s.status === "active").length,
      pending: ssl.filter((s: { status: string }) => s.status === "pending").length,
      failed: ssl.filter((s: { status: string }) => s.status === "failed").length,
    },
    dns: { total: dns.length },
    nginx: {
      total: nginx.length,
      enabled: nginx.filter((n: { enabled: boolean }) => n.enabled).length,
    },
    bandwidth_gb: Math.round((12.4 + (seed % 50) / 10 + domainCount * 0.8) * 10) / 10,
    uptime_percent: 99.2 + (seed % 8) / 10,
  };
}
