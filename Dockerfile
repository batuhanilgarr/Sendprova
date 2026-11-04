# Sendprova production image.
# Based on the official Playwright image so Chromium (snapshots, diffs, PDF
# reports) works without extra setup. Version must match package.json.
FROM mcr.microsoft.com/playwright:v1.64.1-noble AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1 CI=1
RUN npm install -g pnpm@11.5.3
WORKDIR /app

# ---- dependencies (cached while the lockfile is unchanged)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Playwright browsers already exist in the base image; skip the download.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN pnpm install --frozen-lockfile

# ---- build
FROM deps AS build
COPY . .
RUN pnpm prisma generate && pnpm build

# ---- runtime
FROM base AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app ./
# Keep uploaded assets on a volume when STORAGE_DRIVER=local.
VOLUME ["/app/.data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD curl -fsS http://localhost:3000/api/health || exit 1
# Apply pending migrations, then start Next.
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]
