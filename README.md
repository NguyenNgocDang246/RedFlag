# RedFlag – Anti-Scam Training Platform

A platform that builds users' resistance to online scams through safe, realistic simulations of real-world attacks.

**Live demo:** [redflag.study](https://redflag.study)

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?logo=postgresql)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)

## Why

Most people learn about scams after they have already lost something. RedFlag lets them meet scams in a safe setting first. Users practice on realistic fake messages and get surprise test emails, so spotting a scam becomes a habit, not something they only read about. The product is written for everyday users, including people who are not comfortable with technology.

## Key features

### Scam-detection training
- Interactive simulations of email, SMS, chat, web pages, QR codes and app screens.
- Users decide whether a message is a scam or safe, then point out the red flags they noticed.
- Each answer is graded per red flag (caught, missed, wrongly flagged), not only right or wrong.
- An adaptive picker serves unseen scenarios first, then ones the user previously got wrong.

### Phishing simulation by real email
- Users who opt in receive surprise test emails at random times, inside their local daytime hours and at the frequency they chose.
- Clicking a test link opens a teaching page that shows which warning signs were missed.
- Users can report a suspicious email by forwarding it, which counts as a correct catch.
- Pausing or unsubscribing takes effect immediately.

### Also included
- Scenario library and a handbook of official brand channels
- Timed contests with scoring
- Personal progress page
- Admin panel for content editing, with an audit log, plus a CLI that applies the same validation rules

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, CSS Modules |
| Backend | NestJS 11, Prisma, PostgreSQL |
| Email | Resend (sending + inbound webhooks), SMTP / Mailpit for local dev |
| Infra | pnpm monorepo, Docker Compose (local), Vercel (serverless API + cron) |
| Testing | Vitest |

## Architecture

The backend is a **modular monolith**: one deployable app split into modules along business boundaries (identity, training, delivery, contest, progress, admin). Types shared by the web app and the API live in `packages/shared`.

```
 Browser ──▶ Web (Next.js) ──/api/*──▶ API (NestJS) ──▶ PostgreSQL
                                          ▲     │
            Vercel Cron ──daily───────────┘     ├──▶ Resend (test emails)
            Resend Inbound ──webhook (reports)──┘
```

See [plan/architecture.md](plan/architecture.md) for the full design.

## Engineering highlights

- **Pure, unit-tested domain logic:** grading, send-window scheduling, quiz picking and contest scoring are pure functions with no I/O, covered by Vitest.
- **Idempotent scheduler:** each user has at most one pending test, so running a planning pass twice is harmless.
- **Secure sessions:** short-lived access JWT plus rotating refresh tokens stored in the database, both in httpOnly cookies.
- **Verified webhooks:** inbound report emails are accepted only after their Svix signature is checked against the raw request body.
- **Content as data:** adding a new scam type means adding data through the admin panel or the CLI, not changing engine code.

## Getting started

Requirements: Node.js 20+, pnpm 10+, Docker.

```bash
pnpm install
cp .env.example .env
pnpm infra:up                                   # Postgres, Redis, Mailpit
pnpm --filter @redflag/api prisma:migrate
pnpm --filter @redflag/api db:seed
pnpm dev                                        # web + api in watch mode
```

- Web: http://localhost:4001
- API: http://localhost:4000/api/health
- Mailpit (local inbox): http://localhost:8025

Full setup, API list and data CLI: [docs/development.md](docs/development.md).

## Project structure

```
apps/
  web/        Next.js frontend (training, library, contests, profile, admin)
  api/        NestJS API, background worker and data CLI
packages/
  shared/     Types and enums shared by web and api
docs/         Development, deployment and content-authoring guides
plan/         Product rules and architecture
```

## Documentation

- [Development guide](docs/development.md)
- [Deploying to Vercel](docs/deploy-vercel.md)
- [Writing quiz scenarios](docs/quiz-authoring.md)
- [Architecture](plan/architecture.md)
