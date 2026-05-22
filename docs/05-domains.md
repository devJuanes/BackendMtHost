# Dominios — mini registrador MatuHost

## Flujo (todo desde el panel)

1. **Buscar** disponibilidad → `GET /domains/check?fqdn=`
2. **Registrar** → `POST /domains` ejecuta automáticamente:
   - Registro en MatuDB
   - Registros DNS (NS MatuHost, A, www)
   - Zona BIND en el VPS
   - Vhost Nginx + página de bienvenida
   - Verificación DNS autoritativa
3. **Verificar** de nuevo → `POST /domains/:id/verify-dns`

## API

| Método | Ruta |
|--------|------|
| GET | `/domains/check?fqdn=` |
| POST | `/domains` |
| POST | `/domains/:id/verify-dns` |
| POST | `/domains/:id/provision` |

Ver [09-dns-authoritative.md](09-dns-authoritative.md) y [10-architecture.md](10-architecture.md).
