-- Metadatos opcionales de publicación DNS global
ALTER TABLE domains ADD COLUMN IF NOT EXISTS global_dns_status TEXT;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS global_dns_message TEXT;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS global_dns_updated_at TIMESTAMPTZ;
