# Sendprova

HTML / MJML mailing'leri önizle, kontrol et, test gönder. PutsMail'in yerine, self-host.
Plan ve araştırma: [docs/PLAN.md](docs/PLAN.md).

## Kurulum

```bash
pnpm install
cp .env.example .env
docker compose up -d        # Postgres :5433, Redis :6379, Mailpit :8025 (UI) / :1025 (SMTP)
pnpm prisma migrate dev
pnpm dev
```

http://localhost:3000 açılır. Bir `.html`/`.mjml` dosyası, görselleriyle birlikte bir klasör
ya da zip bırak; görseller `.data/assets` altına yazılır, `src` yolları otomatik mutlak URL'ye çevrilir.

## Yapı

| Yol | Ne |
|---|---|
| `src/lib/ingest.ts` | Zip açma, kaynak seçme, asset yükleme, MJML derleme, URL rewrite, versiyon kaydı |
| `src/lib/html/rewrite.ts` | Relative `src` / `background` / `url()` → barındırılan URL; placeholder tespiti |
| `src/lib/storage.ts` | `local` (disk) veya `s3` (R2/S3) depolama sürücüsü |
| `src/app/api/ingest` | Yükleme endpoint'i (multipart) |
| `src/app/p/[id]` | Çalışma ekranı: cihaz çerçeveli önizleme + kontroller |
| `prisma/schema.prisma` | Workspace, Project, Version, Asset, SenderProfile, RecipientGroup, TestSend |

## Sırada

Hafta 4 hedefi: gönderici profili (SMTP/SES/Resend), alıcı grupları, kuyruklu test gönderimi.
