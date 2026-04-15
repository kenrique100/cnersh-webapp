# CNERSH Webapp - Database Migration & Deployment Guide

## Overview

This project uses **Prisma ORM** with **PostgreSQL**. The database schema is managed through Prisma migrations to ensure safe, versioned schema changes in production without data loss.

---

## Quick Reference - All Commands

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. For EXISTING databases (already has tables from prisma db push):
#    Mark the baseline migration as already applied!
npx prisma migrate resolve --applied 0_init

# 4. For NEW databases (fresh setup):
#    Run all migrations
npx prisma migrate deploy

# 5. Seed the database (optional, creates admin user)
npm run db:seed
```

---

## Detailed Deployment Scenarios

### Scenario 1: Deploying to Production for the FIRST TIME (Fresh Database)

If your production database is **empty** (no tables yet):

```bash
# Step 1: Set your environment variables
export DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require&pgbouncer=true"
export DIRECT_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# Step 2: Generate the Prisma client
npx prisma generate

# Step 3: Run all migrations (creates all tables)
npx prisma migrate deploy

# Step 4: Seed the database with admin user
npm run db:seed
```

### Scenario 2: Deploying to Production with EXISTING Data (Already Using `prisma db push`)

If your production database **already has tables** created by `prisma db push`:

```bash
# Step 1: Set your environment variables
export DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require&pgbouncer=true"
export DIRECT_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# Step 2: Generate the Prisma client
npx prisma generate

# Step 3: Mark the baseline migration as already applied
# This tells Prisma "the 0_init migration is already reflected in the database"
# so it won't try to create tables that already exist
npx prisma migrate resolve --applied 0_init

# Step 4: Verify migration status
npx prisma migrate status
```

> ** IMPORTANT**: Step 3 is critical! Without it, `prisma migrate deploy` would try to
> create tables that already exist and fail. The `--applied` flag tells Prisma that this
> migration has already been applied to the database.

### Scenario 3: Adding Future Schema Changes

After the baseline is set up, all future changes follow the standard migration workflow:

```bash
# Step 1: Edit prisma/schema.prisma with your changes

# Step 2: Create a new migration (development only)
npx prisma migrate dev --name describe_your_change

# Step 3: Commit the migration files to git

# Step 4: Deploy to production
npx prisma migrate deploy
```

---

## Environment Variables Required

```env
# Pooled connection (used by the app at runtime)
DATABASE_URL="postgresql://user:password@host:5432/dbname?pgbouncer=true&sslmode=require"

# Direct connection (used for migrations - bypasses connection pooler)
DIRECT_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
```

> **Note**: `DIRECT_URL` is used by Prisma for migrations because connection poolers
> (like PgBouncer/Supavisor) don't support the DDL operations that migrations require.

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `npx prisma generate` | Generate Prisma client from schema |
| `npx prisma migrate dev` | Create & apply migration (development) |
| `npx prisma migrate deploy` | Apply pending migrations (production) |
| `npx prisma migrate status` | Check migration status |
| `npx prisma migrate resolve --applied <name>` | Mark migration as applied |
| `npx prisma migrate reset` | Reset database & reapply all migrations (**️ destroys data**) |
| `npx prisma db push` | Push schema without migration (development only) |
| `npx prisma studio` | Open database browser GUI |
| `npm run db:seed` | Seed database with admin user |

---

## CI/CD Integration

Add this to your deployment pipeline (e.g., Vercel, Railway, Docker):

```bash
# Build step
npx prisma generate
npm run build

# Release/deploy step (runs migrations)
npx prisma migrate deploy
```

### Vercel Configuration

If deploying on Vercel, add to your `package.json`:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && next build"
  }
}
```

And set `DATABASE_URL` and `DIRECT_URL` as environment variables in the Vercel dashboard.

---

## Troubleshooting

### "Migration has already been applied"
This is expected for the baseline migration on existing databases. Use:
```bash
npx prisma migrate resolve --applied 0_init
```

### "Tables already exist"
You need to baseline first:
```bash
npx prisma migrate resolve --applied 0_init
```

### "Migration failed - relation does not exist"
Your database might be empty. Run:
```bash
npx prisma migrate deploy
```

### Checking current migration status
```bash
npx prisma migrate status
```
