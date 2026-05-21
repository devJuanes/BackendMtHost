# Instalación del servidor MatuHost

## Requisitos

| Componente | Versión mínima |
|------------|----------------|
| Ubuntu / Debian | 22.04 LTS |
| Node.js | 20 LTS |
| PostgreSQL | 15+ |
| Nginx | 1.18+ |
| Certbot (producción) | latest |

## 1. MatuDB (matu-db-api)

Instala y ejecuta el servidor MatuDB (paquete `matu-db-api`) en el puerto **3001**.

Variables en `Backend/.env`:

```env
MATUDB_URL=http://localhost:3001
MATUDB_PROJECT_ID=matuhost
MATUDB_API_KEY=anon_tu_clave
MATUDB_USE_SUPABASE=false
```

Migrar esquema MatuHost vía MatuDB:

```bash
cd Backend
npm install
cp .env.example .env
npm run db:migrate
```

## Página por defecto del dominio

Al crear o activar un dominio, MatuHost genera `data/www/<dominio>/public_html/index.html` (estilo Firebase): confirma que el DNS y el dominio están bien cuando aún no hay sitio desplegado.

Regenerar para todos los dominios existentes:

```bash
npm run sites:default
```

## 2. Backend API

```bash
cd Backend
npm install
npm run dev
```

Puerto por defecto: **4000**

## 3. Frontend

```bash
cd matuhost
npm install
cp .env.local.example .env.local
npm run dev
```

Puerto: **3000**

## 4. Nginx (servidor hosting)

```bash
sudo apt install -y nginx
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
```

En `.env` del backend:

```
NGINX_VHOSTS_DIR=/etc/nginx/sites-available
NGINX_SITES_ENABLED_DIR=/etc/nginx/sites-enabled
DEFAULT_DOCUMENT_ROOT=/var/www/matuhost
```

Recargar tras habilitar vhost:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 5. Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 6. Producción con PM2

```bash
npm run build
pm2 start dist/index.js --name matuhost-api
pm2 save
```
