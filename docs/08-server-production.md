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
CORS_ORIGIN=https://matuhost.com,http://localhost:3000

MATUDB_URL=https://db.matudb.com
MATUDB_PROJECT_ID=05caba8c-3ae5-4405-b3d6-a121efbcc91c
MATUDB_API_KEY=mb_31ad2738a64cef16bb1c37a0e03b15ef1e40ae761793d24560201a4dd0840f47
MATUDB_USE_SUPABASE=false

# IP pública del VPS (la que apuntan los registros A de los dominios)
DEFAULT_SERVER_IP=187.124.241.122

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

PM2 no viene instalado por defecto en Ubuntu:

```bash
sudo npm install -g pm2
# o sin sudo si usas nvm: npm install -g pm2

cd ~/apps/BackendMtHost   # tu ruta del clone
pm2 start dist/index.js --name matuhost-api
pm2 logs matuhost-api     # ver que arrancó (Ctrl+C para salir)
pm2 save
pm2 startup               # copia y ejecuta el comando que te imprime (sudo ...)
```

Comprobar:

```bash
curl http://127.0.0.1:4000/api/dashboard/stats
# Sin token devolverá 401 — eso confirma que la API responde
```

## 5. Nginx: exponer la API (puerto 80, no 4000)

La API solo escucha en el VPS (`127.0.0.1:4000`). Desde tu PC **`http://IP:4000` suele hacer timeout** (firewall). Usa Nginx en el puerto 80.

**Por IP** (sin SSL — Certbot no certifica IPs). No uses `default_server` si ya hay otro sitio con ese flag (error *duplicate default server*).

```bash
sudo cp ~/apps/BackendMtHost/docs/nginx-matuhost-api.conf.example /etc/nginx/sites-available/matuhost-api.conf
sudo ln -sf /etc/nginx/sites-available/matuhost-api.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
curl http://TU_IP/api/dashboard/stats
```

Si `nginx -t` falla por duplicate default server: quita `default_server` de `matuhost-api.conf` (deja solo `listen 80;` y `server_name TU_IP;`).

**CORS** en `~/apps/BackendMtHost/.env`:

```env
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
DEFAULT_SERVER_IP=187.124.241.122
```

```bash
pm2 restart matuhost-api --update-env
```

**Vista previa del sitio (sin DNS global):** en `matuhost-api.conf` añade el bloque `location /site-preview/` del ejemplo `docs/nginx-matuhost-api.conf.example`, luego `sudo nginx -t && sudo systemctl reload nginx`. Abre `http://187.124.241.122/site-preview/tudominio.com/` para ver la página de bienvenida aunque el dominio aún devuelva NXDOMAIN en el navegador.

**Alternativa:** abrir puerto 4000: `sudo ufw allow 4000/tcp` (menos recomendado).

**Con dominio** (`api.tudominio.com` → IP del VPS): `sudo certbot --nginx -d api.tudominio.com`

## 6. Frontend (panel Next.js)

En tu PC (`matuhost/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://187.124.241.122/api
```

Reinicia `npm run dev` del frontend tras cambiar `.env.local`.

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
cd ~/apps/BackendMtHost
git pull
npm install
npm run build
pm2 restart matuhost-api
```

## Desarrollo local

Sigue siendo válido `npm run dev` (tsx watch). El repo canónico del backend es **BackendMtHost**, no la carpeta `Backend` dentro del monorepo MatuHost (si aún la tienes, sincroniza cambios hacia BackendMtHost antes de commit).
