# Arquitectura MatuHost — mini registrador + hosting

## Visión

MatuHost es un **sistema centralizado** en tu VPS:

- Mini registrador interno (sin pagos/ICANN en MVP)
- DNS manager real (BIND9)
- Provisioning automático (zonas, Nginx, sitios)
- Preparado para APIs de registrador y SSL reales

## Módulos backend

| Módulo | Responsabilidad |
|--------|-----------------|
| `domain-registry.service` | Disponibilidad, registro interno |
| `dns-zone.service` | Zonas BIND, sync archivos, rndc |
| `provision-orchestrator.service` | Pipeline unificado |
| `nginx.service` | Virtual hosts |
| `dns.service` | CRUD registros → regenera zona |
| `utils/dns-verify` | Autoritativo + público |

## Estados del dominio

| Estado | Significado |
|--------|-------------|
| `pending` | Registrado; DNS autoritativo puede estar activo en VPS |
| `active` | Zona + Nginx OK; verificado |
| `is_simulated: false` | Gestionado por plataforma, no “demo visual” |

## Qué NO hace el MVP

- Comprar dominios en ICANN
- Cobros
- Sustituir registradores externos sin delegación NS

## Qué SÍ hace el MVP

- Crear zonas DNS reales al instante
- Servir sitios en tu IP
- Gestionar registros desde el panel (aplica BIND)
- Detectar propagación (autoritativo primero, público después)

## Roadmap integración

1. **Registrador API** → `domain-registry.service` provider interface
2. **SSL** → `CERTBOT_CMD` en `.env` tras DNS OK
3. **ns1/ns2** → subdominios de un apex que controlas (glue automático)
