# Deploying Sendprova

The app is one Node process (Next.js 16) plus Postgres and an S3-compatible bucket. Chromium is bundled in the Docker image for snapshots, diffs and PDF reports, so the host must run containers; serverless platforms (Vercel functions) will not work for those features.

Pick one of the two paths below. Both use the same `Dockerfile`.

## What you need before starting

| Item | Where |
|---|---|
| A domain for the app, e.g. `app.sendprova.com` | your DNS provider |
| Cloudflare R2 bucket with public access + API token | already created; reuse the values from `.env` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `ADMIN_EMAIL` | the email you will sign up with first |

Env reference: `.env.production.example`.

---

## Path A — Railway (fastest, ~15 minutes)

1. **Create project**: railway.app → New Project → *Deploy from GitHub repo* → `batuhanilgarr/Sendprova`. Railway detects the `Dockerfile` and builds it.
2. **Add Postgres**: in the project, *+ New* → *Database* → *PostgreSQL*. Open the Postgres service → *Variables* → copy `DATABASE_URL` (the public one if the app runs in another region, otherwise the private one).
3. **Set variables** on the app service (*Variables* → *Raw Editor*), from `.env.production.example`:
   - `DATABASE_URL` → paste from step 2 (append `?schema=public` if missing)
   - `APP_URL`, `BETTER_AUTH_URL` → `https://<your-domain>` (use the Railway-generated domain first, switch to yours after step 5)
   - `BETTER_AUTH_SECRET`, `ADMIN_EMAIL`
   - `STORAGE_DRIVER=s3` and the `S3_*` values from your local `.env`
4. **Deploy**: Railway redeploys on every push to `main`. The container runs `prisma migrate deploy` on start, so the schema is applied automatically. Check `https://<domain>/api/health` returns `{"ok":true}`.
5. **Custom domain**: app service → *Settings* → *Networking* → *Custom Domain* → add `app.sendprova.com`; create the CNAME Railway shows at your DNS. Then update `APP_URL` and `BETTER_AUTH_URL` to the custom domain and redeploy.
6. **First admin**: open the site, *Sign up* with `ADMIN_EMAIL`. That account gets the admin role.

Cost: Hobby plan covers this comfortably; the Playwright image is ~1.5 GB, so give the service at least 1 GB RAM.

---

## Path B — your own server (Docker Compose)

Any Linux box with Docker (Hetzner CX22 is plenty).

```bash
git clone https://github.com/batuhanilgarr/Sendprova.git && cd Sendprova
cp .env.production.example .env.production
# edit .env.production: APP_URL, BETTER_AUTH_URL, BETTER_AUTH_SECRET, ADMIN_EMAIL, S3_*, POSTGRES_PASSWORD
docker compose -f docker-compose.prod.yml up -d --build
curl -s localhost:3000/api/health
```

Put TLS in front. With Caddy (`/etc/caddy/Caddyfile`):

```
app.sendprova.com {
    reverse_proxy localhost:3000
}
```

Caddy obtains the certificate automatically. Updates: `git pull && docker compose -f docker-compose.prod.yml up -d --build`.

---

## After the first deploy

- **R2 public URL**: keep `pub-….r2.dev` or attach a custom domain to the bucket (R2 → Settings → Custom Domains) and set `S3_PUBLIC_URL` accordingly. Email clients load images from here.
- **Move local data** (optional): if you want the projects you created locally in production, dump and restore Postgres:
  ```bash
  docker compose exec -T postgres pg_dump -U mailing mailing > sendprova.sql
  psql "$PROD_DATABASE_URL" < sendprova.sql
  ```
  Assets are already in R2, so nothing else moves.
- **Notification emails**: each workspace sends from its own sender profile. Set the `SMTP_*` variables only if you want a platform-wide fallback.
- **Open pixels and share links** use `APP_URL`; once that is the public domain, opens are recorded from real inboxes.

## Agency review domain (later)

`reviewDomain` on a workspace is stored but not routed yet. When needed: point `review.agency.com` CNAME at the app and add host-based routing in `src/proxy.ts` that rewrites `/` on that host to the client portal. Tracked in the agency plan.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `/api/health` returns `db: down` | `DATABASE_URL` wrong or Postgres not reachable from the app's network |
| Sign-in loops or cookies not set | `BETTER_AUTH_URL` must exactly match the public origin (https, no trailing slash) |
| Snapshots / PDF fail with "browser not found" | the image must be built from this `Dockerfile` (Playwright base); check the Playwright version in `package.json` matches the `FROM` tag |
| Images missing in Gmail | `S3_PUBLIC_URL` not public, or `STORAGE_DRIVER` still `local` |
