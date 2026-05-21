# SSL en MatuHost

## MVP (simulado)

El panel muestra estados: `none`, `pending`, `active`, `expired`, `failed`.

Flujo:

1. `POST /api/ssl/request` con `domain_id`
2. Dominio debe estar `active` para auto-emisión simulada
3. `POST /api/ssl/:id/check` verifica y emite si aplica
4. `POST /api/ssl/:id/issue` fuerza emisión simulada

## Producción (Let's Encrypt)

### HTTP-01 (recomendado)

Requisitos:

- Registro **A** apunta a tu IP
- Puerto 80 accesible
- Vhost Nginx habilitado

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ejemplo.com -d www.ejemplo.com
```

Renovación automática:

```bash
sudo certbot renew --dry-run
```

### Integración futura en backend

- Worker cron llama Certbot tras `domain.status = active`
- Actualiza `ssl_certificates.status` y `expires_at`
- Añade bloque `listen 443 ssl` al vhost generado

## Estados visuales en el panel

| Estado | Color | Acción usuario |
|--------|-------|----------------|
| none | gris | Solicitar certificado |
| pending | amarillo | Esperar / verificar DNS |
| active | verde | Certificado OK |
| expired | naranja | Renovar |
| failed | rojo | Revisar DNS y reintentar |
