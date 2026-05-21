-- MatuHost schema para MatuDB (PostgreSQL)
-- Auth: MatuDB db.auth — perfiles en tabla profiles

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  fqdn TEXT NOT NULL,
  tld TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'expired', 'suspended')),
  is_simulated BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  server_ip TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, fqdn)
);

CREATE TABLE IF NOT EXISTS hosting_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  username TEXT NOT NULL,
  document_root TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'provisioning'
    CHECK (status IN ('provisioning', 'active', 'suspended', 'deleted')),
  disk_quota_mb INT NOT NULL DEFAULT 1024,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, username)
);

CREATE TABLE IF NOT EXISTS subdomains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL,
  target_path TEXT NOT NULL DEFAULT '/',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (domain_id, hostname)
);

CREATE TABLE IF NOT EXISTS dns_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS')),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  ttl INT NOT NULL DEFAULT 3600,
  priority INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nginx_vhosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
  hosting_account_id UUID REFERENCES hosting_accounts(id) ON DELETE SET NULL,
  server_name TEXT NOT NULL,
  config_path TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'generated', 'enabled', 'disabled', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ssl_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  vhost_id UUID REFERENCES nginx_vhosts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'none'
    CHECK (status IN ('none', 'pending', 'active', 'expired', 'failed')),
  issuer TEXT DEFAULT 'Let''s Encrypt (simulated)',
  expires_at TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domains_user ON domains(user_id);
CREATE INDEX IF NOT EXISTS idx_hosting_user ON hosting_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_dns_domain ON dns_records(domain_id);
CREATE INDEX IF NOT EXISTS idx_vhosts_user ON nginx_vhosts(user_id);
CREATE INDEX IF NOT EXISTS idx_ssl_domain ON ssl_certificates(domain_id);
