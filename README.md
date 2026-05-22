# MatuHost Backend

API REST para el mini hosting MatuHost. Base de datos y auth vía **MatuDB** (`@devjuanes/matuclient`).

## Repositorio

**https://github.com/devJuanes/BackendMtHost** — desde aquí se trabaja y despliega el backend.

Despliegue en VPS: [docs/08-server-production.md](docs/08-server-production.md)

## Inicio rápido (local)

```bash
git clone https://github.com/devJuanes/BackendMtHost.git
cd BackendMtHost
cp .env.example .env
npm install
npm run db:migrate
npm run db:sync-users
npm run dev
```

`npm run dev` — **tsx watch** recarga al guardar; `predev` libera el puerto 4000. Si hay conflicto: `npm run dev:restart`.

API: `http://localhost:4000/api`

## Documentación

Ver carpeta `docs/`:

- [Instalación](docs/01-installation.md)
- [Infraestructura](docs/02-infrastructure.md)
- [Nginx](docs/03-nginx.md)
- [SSL](docs/04-ssl.md)
- [Dominios](docs/05-domains.md)
- [Hosting](docs/06-hosting.md)
- [API](docs/07-api-reference.md)
- [Servidor producción](docs/08-server-production.md)
- [DNS autoritativo (BIND)](docs/09-dns-authoritative.md)
- [Arquitectura](docs/10-architecture.md)
