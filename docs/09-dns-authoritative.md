# DNS autoritativo MatuHost (real)

MatuHost **no es una plantilla visual**: el panel escribe zonas BIND9 reales en el VPS.

## Arquitectura

```
Panel → API → MatuDB (dns_records)
              ↓
         dns-zone.service
              ↓
    /etc/bind/zones/matuhost/db.<dominio>
              ↓
         BIND9 (puerto 53) + rndc reload
              ↓
    Nginx vhost + /var/www/matuhost/<dominio>
```

## Instalación en el VPS

```bash
sudo bash scripts/install-bind-matuhost.sh
cd ~/apps/BackendMtHost
npm run db:migrate:dns
```

`.env` producción:

```env
DNS_ZONES_DIR=/etc/bind/zones/matuhost
DNS_NAMED_CONF_SNIPPET=/etc/bind/matuhost-zones.conf
DNS_SERVER_IP=187.124.241.122
DEFAULT_SERVER_IP=187.124.241.122
MATUHOST_NS1=ns1.matuhost.com
MATUHOST_NS2=ns2.matuhost.com
DNS_RELOAD_CMD=sudo rndc reload
NGINX_RELOAD_CMD=sudo nginx -t && sudo systemctl reload nginx
```

Firewall:

```bash
sudo ufw allow 53/tcp
sudo ufw allow 53/udp
```

## Flujo automático al crear dominio

1. Registro interno en MatuDB (`platform_managed: true`)
2. Registros DNS creados por la plataforma (NS, A, www, TXT)
3. Archivo de zona BIND generado y cargado
4. Nginx vhost habilitado
5. Página de bienvenida en `public_html`
6. Verificación DNS contra **tu servidor** (`DNS_SERVER_IP`)

## Comprobar DNS en el servidor

```bash
dig @127.0.0.1 landatech.ai A +short
dig @187.124.241.122 landatech.ai NS +short
npm run dns:sync
```

## En línea vs propagación global

| Estado | Significado |
|--------|-------------|
| **Activo MatuHost** | BIND en tu VPS responde con la IP correcta → sitio + Nginx listos |
| **En línea** | Además resuelve en DNS público global |

El panel **no bloquea** por falta de DNS público: si MatuHost DNS autoritativo OK, el dominio queda activo.

## Dominios sin pasos manuales (recomendado MVP)

Configura en `.env`:

```env
PLATFORM_APEX_DOMAIN=hosts.matuhost.com
```

El usuario registra `miweb` → la plataforma crea `miweb.hosts.matuhost.com` con zona BIND automática.

Delega **una sola vez** en el registrador del apex `matuhost.com` los NS hacia MatuHost; los subdominios de clientes no requieren GoDaddy.

## Dominios apex propios (.ai, .com)

La **zona BIND** se crea igual desde el panel. La API de registrador (futuro) asignará NS a `ns1.matuhost.com` / `ns2.matuhost.com` sin intervención del usuario.

## API

| Método | Ruta | Acción |
|--------|------|--------|
| GET | `/domains/check?fqdn=` | Disponibilidad en plataforma |
| POST | `/domains` | Registro + provision completo |
| POST | `/domains/:id/verify-dns` | Re-verificar y sincronizar |
| POST | `/dns/domain/:id/sync` | Regenerar zona BIND |
| GET | `/dns/domain/:id/zone` | Metadatos de zona |
