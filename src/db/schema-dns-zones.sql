-- Extensión DNS autoritativo MatuHost (ejecutar tras schema.sql)

CREATE TABLE IF NOT EXISTS dns_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL UNIQUE REFERENCES domains(id) ON DELETE CASCADE,
  fqdn TEXT NOT NULL UNIQUE,
  zone_file TEXT NOT NULL,
  serial BIGINT NOT NULL DEFAULT 0,
  nameserver_1 TEXT NOT NULL,
  nameserver_2 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE domains ADD COLUMN IF NOT EXISTS platform_managed BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS registration_source TEXT NOT NULL DEFAULT 'matuhost';

CREATE INDEX IF NOT EXISTS idx_dns_zones_fqdn ON dns_zones(fqdn);
