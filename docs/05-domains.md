# Dominios (MVP simulado)

## Comportamiento actual

- No hay registro real con registrador
- `is_simulated: true` en todos los dominios creados desde el panel
- Validación de formato FQDN en backend
- Al crear dominio se insertan registros DNS por defecto (A @, A www, TXT SPF)

## Flujo usuario

1. Dashboard → Dominios → Agregar dominio
2. Introduce `midominio.com`
3. Estado inicial: `pending`
4. Botón **Activar** → `active` (simula propagación)
5. Solicitar SSL cuando esté activo

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
