# MatuHost Backend

API REST para el mini hosting MatuHost. Base de datos y auth vía **MatuDB** (`@devjuanes/matuclient`).

## Inicio rápido

```bash
cd Backend
cp .env.example .env
npm install
npm run db:migrate
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
