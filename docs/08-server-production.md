# Despliegue en servidor real (VPS)

Guía para clonar **BackendMtHost** en un VPS y conectarlo a MatuDB cloud y al panel frontend.

## 1. Clonar en el servidor

```bash
cd /opt   # o tu carpeta preferida
git clone https://github.com/devJuanes/BackendMtHost.git
cd BackendMtHost
```

## 2. Variables de entorno (producción)

```bash
cp .env.example .env
nano .env
```

Ejemplo con **MatuDB cloud** (como en desarrollo):

```env
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://tu-panel.matudb.com,http://localhost:3000

MATUDB_URL=https://db.matudb.com
MATUDB_PROJECT_ID=tu-project-id
MATUDB_API_KEY=mb_tu_clave
MATUDB_USE_SUPABASE=false

# IP pública del VPS (la que apuntan los registros A de los dominios)
DEFAULT_SERVER_IP=203.0.113.10

# Rutas reales en el servidor
NGINX_VHOSTS_DIR=/etc/nginx/sites-available
NGINX_SITES_ENABLED_DIR=/etc/nginx/sites-enabled
DEFAULT_DOCUMENT_ROOT=/var/www/matuhost
```

Crea las carpetas:

```bash
sudo mkdir -p /var/www/matuhost /etc/nginx/sites-available /etc/nginx/sites-enabled
sudo chown -R $USER:$USER /var/www/matuhost
mkdir -p data/nginx/sites-available data/nginx/sites-enabled
```

> Si usas las rutas de `/etc/nginx`, alinea `NGINX_*` en `.env` con esas rutas (ver [01-installation.md](01-installation.md)).

## 3. Base de datos y usuarios

```bash
npm install
npm run build
npm run db:migrate
npm run db:sync-users
```

`db:sync-users` crea filas en `users` desde `profiles` (requerido por la FK de `domains`).

## 4. Arrancar la API con PM2

```bash
npm install -g pm2
pm2 start dist/index.js --name matuhost-api
pm2 save
pm2 startup
```

Comprobar:

```bash
curl http://127.0.0.1:4000/api/dashboard/stats
# Sin token devolverá 401 — eso confirma que la API responde
```

## 5. Nginx del sistema + reverse proxy API (opcional)

Sitios de clientes: los vhosts generados en `sites-available` / `sites-enabled`.

Proxy del panel hacia la API (ejemplo):

```nginx
server {
    listen 80;
    server_name api.tudominio.com;

    location /api {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 6. Frontend (otro repo / carpeta)

En el servidor o en Vercel, configura el panel:

```env
NEXT_PUBLIC_API_URL=https://api.tudominio.com/api
```

(o `http://IP_VPS:4000/api` mientras pruebas).

## 7. Checklist “ya es real”

| Paso | Comando / acción |
|------|------------------|
| Dominio en panel | Crear dominio → DNS A → `DEFAULT_SERVER_IP` |
| Activar dominio | Botón Activate en el panel |
| Página por defecto | `npm run sites:default` o abrir `https://dominio` |
| Hosting | Crear cuenta hosting vinculada al dominio |
| Vhost Nginx | Crear vhost en panel → Enable → `sudo nginx -t && reload` |
| SSL | Flujo simulado en panel; Certbot real cuando integres Let's Encrypt |

## 8. Actualizar el servidor

```bash
cd /opt/BackendMtHost
git pull
npm install
npm run build
pm2 restart matuhost-api
```

## Desarrollo local

Sigue siendo válido `npm run dev` (tsx watch). El repo canónico del backend es **BackendMtHost**, no la carpeta `Backend` dentro del monorepo MatuHost (si aún la tienes, sincroniza cambios hacia BackendMtHost antes de commit).
