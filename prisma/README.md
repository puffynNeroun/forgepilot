# ForgePilot Prisma setup

ForgePilot uses Prisma with PostgreSQL for the local persistence foundation.

## Local database

Start PostgreSQL:

    docker compose up -d postgres

Generate Prisma Client:

    pnpm db:generate

Push schema to the local database:

    pnpm db:push

Seed demo data:

    pnpm db:seed

Open Prisma Studio:

    pnpm db:studio

## Verification policy

The normal verification command must stay deterministic:

    pnpm verify

It validates the Prisma schema and generates Prisma Client, but it must not require a running database.

Commands such as `db:push`, `db:seed`, and `db:studio` are manual local development commands.
