# Hosting en MatuHost

## Cuentas de hosting

Cada cuenta tiene:

- `label` — nombre visible
- `username` — identificador único por usuario
- `document_root` — carpeta de archivos
- `domain_id` — opcional, vincula a un dominio

Al crear cuenta:

1. Se crea directorio en `DEFAULT_DOCUMENT_ROOT`
2. Se genera `index.html` de bienvenida
3. Estado `active`

## Subdominios

- Vinculados a un `domain_id`
- Crean registro CNAME en DNS automáticamente
- Ejemplo: `blog.ejemplo.com`

## Panel propio

Todo el control está en el frontend MatuHost:

- Sin cPanel / HestiaCP
- API Express orquesta archivos y DB
- Nginx configs generados por código

## Cuotas (futuro)

Campo `disk_quota_mb` preparado para límites por plan.
