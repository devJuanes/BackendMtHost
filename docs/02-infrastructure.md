# Infraestructura MatuHost

## Diagrama

```
Usuario → Next.js (3000) → Express API (4000) → PostgreSQL (5432)
                              ↓
                         Archivos Nginx + www
                              ↓
                         Nginx :80/:443 → sitios clientes
```

## Servidores recomendados

| Rol | Descripción |
|-----|-------------|
| **App** | Next.js + Express (mismo VPS al inicio) |
| **DB** | PostgreSQL (mismo VPS o instancia dedicada) |
| **Web** | Nginx sirve sitios generados por el panel |

## Puertos

| Puerto | Servicio |
|--------|----------|
| 3000 | Frontend desarrollo |
| 4000 | API MatuHost |
| 5432 | PostgreSQL (solo localhost) |
| 80 | HTTP público |
| 443 | HTTPS público |

## Escalabilidad futura

- Separar API y frontend en VPS distintos
- Cola Redis para provisioning async
- Registrador real + pasarela de pago (webhooks)
- DNS autoritativo (PowerDNS) con API

## Variables críticas

Ver `Backend/.env.example` y `matuhost/.env.local.example`.
