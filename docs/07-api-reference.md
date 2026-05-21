# API Reference

Base URL: `http://localhost:4000/api`

Auth: `Authorization: Bearer <token>`

## Auth

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/register` | No |
| POST | `/auth/login` | No |
| GET | `/auth/me` | Sí |

## Domains

| Method | Path |
|--------|------|
| GET | `/domains` |
| POST | `/domains` |
| GET | `/domains/:id` |
| PATCH | `/domains/:id` |
| POST | `/domains/:id/activate` |
| DELETE | `/domains/:id` |

## Hosting

| Method | Path |
|--------|------|
| GET | `/hosting` |
| POST | `/hosting` |
| GET | `/hosting/:id` |
| PATCH | `/hosting/:id/suspend` |
| DELETE | `/hosting/:id` |

## Subdomains

| Method | Path |
|--------|------|
| GET | `/subdomains?domain_id=` |
| POST | `/subdomains` |
| DELETE | `/subdomains/:id` |

## DNS

| Method | Path |
|--------|------|
| GET | `/dns/domain/:domainId` |
| POST | `/dns/domain/:domainId` |
| PATCH | `/dns/:id` |
| DELETE | `/dns/:id` |

## Nginx

| Method | Path |
|--------|------|
| GET | `/nginx` |
| POST | `/nginx` |
| POST | `/nginx/:id/enable` |
| POST | `/nginx/:id/disable` |
| DELETE | `/nginx/:id` |

## SSL

| Method | Path |
|--------|------|
| GET | `/ssl` |
| GET | `/ssl/domain/:domainId` |
| POST | `/ssl/request` |
| POST | `/ssl/:id/issue` |
| POST | `/ssl/:id/check` |

## Dashboard

| Method | Path |
|--------|------|
| GET | `/dashboard/stats` |
