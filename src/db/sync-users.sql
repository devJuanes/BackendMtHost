-- Sincroniza profiles → users (requerido por FK domains.user_id → users.id)
INSERT INTO users (id, email, password_hash, full_name)
SELECT p.id, p.email, 'matuhost-auth-managed', p.full_name
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.id);
