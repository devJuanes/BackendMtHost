# Dominios

## Flujo real (producción)

1. **Crear dominio** en el panel → el servidor genera `public_html`, vhost Nginx y lo habilita.
2. **DNS en tu registrador** (no solo en el panel MatuHost): registro **A** `@` y `www` → IP del VPS (`DEFAULT_SERVER_IP`).
3. **Verificar DNS** en el panel (botón ↻) → si resuelve bien, el tipo pasa a **En línea** (`is_simulated: false`).
4. Abrir `http://tudominio.com` → página de bienvenida MatuHost (estilo Firebase).

`NXDOMAIN` = el dominio no existe en DNS público; compra/registra el dominio y crea los registros A.

Opcional en `.env` del servidor:

```env
NGINX_RELOAD_CMD=sudo nginx -t && sudo systemctl reload nginx
```

## API

- `POST /domains/:id/verify-dns` — comprueba DNS público y marca **En línea** si apunta al VPS
- `POST /domains/:id/provision` — regenera vhost + página por defecto

## Comportamiento

- Al crear: aprovisiona Nginx + `index.html` de bienvenida en el servidor
- `is_simulated: false` solo cuando el DNS público resuelve a `DEFAULT_SERVER_IP`
- Registros DNS del panel = plantilla; el registrador real es obligatorio para que cargue en el navegador

## Campos

| Campo | Descripción |
|-------|-------------|
| fqdn | Nombre completo |
| tld | Extensión extraída |
| status | pending / active / expired / suspended |
| server_ip | IP del hosting (env `DEFAULT_SERVER_IP`) |
| expires_at | +1 año simulado |

## Integración futura

- API registrador (Porkbun, Namecheap, etc.)
- Webhook de compra
- Sincronización WHOIS y renovaciones
