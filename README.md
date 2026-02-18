# CNERSH Web Application

A secure, scalable, production-grade web platform designed for government institutions to manage public project submissions, community engagement, administrative review workflows, and project validation with full auditability, role-based access control, notifications, and long-term maintainability.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) 16 (App Router)
- **Auth**: [Better Auth](https://www.better-auth.com/) with Google OAuth, role-based access
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/) (driver adapter via `@prisma/adapter-pg`)
- **UI**: [shadcn/ui](https://ui.shadcn.com/), Tailwind CSS, Radix UI
- **File Uploads**: [UploadThing](https://uploadthing.com/)
- **Email**: [Resend](https://resend.com/) + React Email

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (local or hosted, e.g. Neon, Supabase)

### 1. Install Dependencies

```bash
npm install
```

This automatically runs `prisma generate` via the `postinstall` script.

### 2. Configure Environment Variables

Create a `.env` file with the following:

```env
# Pooled connection (used by the application at runtime)
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
# Direct connection (used for migrations - often a non-pooled URL)
# If your provider uses connection pooling (e.g. Neon, Supabase), use the direct/non-pooled URL here
DIRECT_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
RESEND_API_KEY="your-resend-api-key"
UPLOADTHING_TOKEN="your-uploadthing-token"
```

> **Note**: If your database password contains special characters (e.g. `/`, `?`, `@`, `#`),
> they are automatically URL-encoded by the application. You can paste the connection string
> as-is from your Supabase or Neon dashboard.

### 3. Set Up the Database

Push the Prisma schema to your database to create all tables:

```bash
npm run db:push
```

> **Important**: `prisma generate` only creates the TypeScript client. You must run `db:push` (or `db:migrate`) to actually create/update the database tables. Without this step, you will see errors like:
> `The column (not available) does not exist in the current database.`

### 4. Create Admin User

Run the seed script to create your admin account:

```bash
npm run db:seed
```

**Default admin credentials:**
- Email: `admin@cnec.cm`
- Password: `Admin@CNEC2026`

To use custom credentials, set these in your `.env` before seeding:

```env
ADMIN_EMAIL="your-email@example.com"
ADMIN_PASSWORD="YourSecurePassword123"
ADMIN_NAME="Your Name"
```

Or run setup + seed together:

```bash
npm run db:setup
```

> **Tip**: You can also promote any existing user to admin via Prisma Studio (`npm run db:studio`) by changing the `role` field to `admin`.

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client (TypeScript types only) |
| `npm run db:push` | Push schema to database (create/update tables) |
| `npm run db:push:force` | Push schema with `--accept-data-loss` (drops removed columns) |
| `npm run db:reset` | Reset database completely (`--force-reset`) — ⚠️ deletes all data |
| `npm run db:migrate` | Run pending migrations (production) |
| `npm run db:migrate:dev` | Create and run migrations (development) |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
| `npm run db:seed` | Create admin user (configurable via env vars) |
| `npm run db:setup` | Generate client + push schema + seed admin (first-time setup) |

## Troubleshooting

### "The column (not available) does not exist in the current database"

This error means the database tables are out of sync with the Prisma schema. Run:

```bash
npm run db:push
```

### "Cannot read properties of undefined (reading 'findMany')"

This usually means the Prisma client was not generated. Run:

```bash
npm run db:generate
```

### "twoFactorEnabled" column appears in SQL queries

This means the old `twoFactorEnabled` column still exists in your database from a previous schema version. To remove it, run:

```bash
npm run db:push:force
```

This uses `--accept-data-loss` to allow dropping the removed column. If you want to fully reset the database (deletes all data):

```bash
npm run db:reset
npm run db:seed
```

### Database schema out of sync after pulling new code

If you pull code changes that modify the Prisma schema, always run:

```bash
npx prisma generate && npm run db:push:force
```

## Deploy on Vercel

The easiest way to deploy is using the [Vercel Platform](https://vercel.com/new). Make sure to:

1. Set all environment variables in the Vercel dashboard
2. The build command (`prisma generate && next build`) handles client generation automatically
3. Run `db:push` or `db:migrate` against your production database before deploying
