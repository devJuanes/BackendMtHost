# Configuración Nginx

## Cómo funciona en MatuHost

1. El usuario crea un **virtual host** desde el panel (`POST /api/nginx`).
2. El backend genera un archivo `.conf` en `NGINX_VHOSTS_DIR`.
3. Al **habilitar**, copia el config a `NGINX_SITES_ENABLED_DIR`.
4. En producción ejecutas `nginx -t && systemctl reload nginx`.

## Estructura de archivos

```
/etc/nginx/sites-available/ejemplo_com.conf
/etc/nginx/sites-enabled/ejemplo_com.conf   ← copia al habilitar
/var/www/matuhost/ejemplo.com/public_html/
```

## Config generado (ejemplo)

```nginx
server {
    listen 80;
    server_name ejemplo.com;
    root /var/www/matuhost/ejemplo.com/public_html;
    index index.html;
    location / { try_files $uri $uri/ =404; }
}
```

## Proxy al panel (opcional)

Si Next.js corre en el mismo servidor:

```nginx
server {
    listen 443 ssl;
    server_name panel.tudominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://127.0.0.1:4000;
    }
}
```

## Estados en base de datos

| status | Significado |
|--------|-------------|
| draft | Creado sin archivo |
| generated | Archivo escrito |
| enabled | Copiado a sites-enabled |
| disabled | Deshabilitado |
| error | Fallo al escribir |
