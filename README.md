# Sendprova

Preview, check and test-send HTML / MJML email campaigns. A self-hostable replacement for PutsMail with accounts, credits and an admin panel.
Research and roadmap (Turkish): [docs/PLAN.md](docs/PLAN.md).

## Setup

```bash
pnpm install
cp .env.example .env            # set BETTER_AUTH_SECRET and ADMIN_EMAIL
docker compose up -d            # Postgres :5433, Redis :6379, Mailpit :8025 (UI) / :1025 (SMTP)
pnpm prisma migrate deploy
pnpm dev
```

Open http://localhost:3000, sign up with the `ADMIN_EMAIL` address to become the first admin, then drop an `.html`/`.mjml` file, a folder with its images, or a zip.
Images are written to `.data/assets` (or S3/R2 with `STORAGE_DRIVER=s3`) and every relative `src` is rewritten to an absolute URL.

## Structure

| Path | What |
|---|---|
| `src/app/page.tsx` | Landing page |
| `src/app/(auth)` | Sign-in / sign-up |
| `src/app/app` | The product: projects, workbench (`p/[id]`), settings |
| `src/app/admin` | Admin panel: members, credits, suspensions |
| `src/app/s/[token]` | Public read-only share page |
| `src/lib/auth.ts` | Better Auth config (email + password, admin plugin, workspace creation hook) |
| `src/lib/ingest.ts` | Zip expansion, source pick, asset upload, MJML compile, URL rewrite, version row |
| `src/lib/html/rewrite.ts` | Relative `src` / `background` / `url()` → hosted URL; placeholder detection |
| `src/lib/mailer.ts` | Nodemailer SMTP transport, credit reservation, per-recipient delivery |
| `src/lib/checks.ts` | Link / image reachability and alt-text checks |
| `prisma/schema.prisma` | Workspace, Project, Version, Asset, SenderProfile, RecipientGroup, TestSend, CheckRun, ShareLink, CreditLedger, auth tables |

## Credits

1 credit = 1 recipient in one test send. New accounts get 50. Credits are reserved in a transaction before sending and refunded for failed deliveries; every movement is a `CreditLedger` row. Admins top up from `/admin`.
