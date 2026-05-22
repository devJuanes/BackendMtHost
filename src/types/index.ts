export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "user" | "admin";
  created_at: string;
  updated_at: string;
}

export interface Domain {
  id: string;
  user_id: string;
  fqdn: string;
  tld: string;
  status: "pending" | "active" | "expired" | "suspended";
  is_simulated: boolean;
  platform_managed?: boolean;
  registration_source?: string;
  expires_at: string | null;
  server_ip: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DnsZone {
  id: string;
  domain_id: string;
  fqdn: string;
  zone_file: string;
  serial: number;
  nameserver_1: string;
  nameserver_2: string;
  status: "pending" | "active" | "error";
  created_at: string;
  updated_at: string;
}

export interface HostingAccount {
  id: string;
  user_id: string;
  domain_id: string | null;
  label: string;
  username: string;
  document_root: string;
  status: "provisioning" | "active" | "suspended" | "deleted";
  disk_quota_mb: number;
  created_at: string;
  updated_at: string;
}

export interface Subdomain {
  id: string;
  user_id: string;
  domain_id: string;
  hostname: string;
  target_path: string;
  status: "active" | "disabled";
  created_at: string;
}

export interface DnsRecord {
  id: string;
  user_id: string;
  domain_id: string;
  type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS";
  name: string;
  content: string;
  ttl: number;
  priority: number | null;
  created_at: string;
  updated_at: string;
}

export interface NginxVhost {
  id: string;
  user_id: string;
  domain_id: string | null;
  hosting_account_id: string | null;
  server_name: string;
  config_path: string;
  enabled: boolean;
  status: "draft" | "generated" | "enabled" | "disabled" | "error";
  created_at: string;
  updated_at: string;
}

export interface SslCertificate {
  id: string;
  user_id: string;
  domain_id: string;
  vhost_id: string | null;
  status: "none" | "pending" | "active" | "expired" | "failed";
  issuer: string | null;
  expires_at: string | null;
  auto_renew: boolean;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  domains: { total: number; active: number; pending: number };
  hosting: { total: number; active: number };
  ssl: { total: number; active: number; pending: number; failed: number };
  dns: { total: number };
  nginx: { total: number; enabled: number };
  bandwidth_gb: number;
  uptime_percent: number;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
      user?: User;
    }
  }
}
