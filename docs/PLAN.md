# Mailing Test & Preview Platformu — Araştırma ve Plan

Tarih: 3 Kasım 2026
Amaç: PutsMail'in kapanmasıyla boşalan "HTML mailing'i gönder, önizle, kontrol et" ihtiyacını, piyasadaki araçlardan daha iyi bir kendi sistemimizle karşılamak. Sistem kadar tasarım da birinci sınıf olacak.

---

## 1. Mevcut durum (bizim tarafta)

`NitelikliYatirimciMailing` projesi tipik bir iş akışını gösteriyor:

- Photoshop slice'tan çıkmış, `table` tabanlı, 975px sabit genişlikli, tamamen görsel dilimli (index_01.png … index_20.png + spacer.gif) HTML.
- Görseller **relative path** ile referanslanıyor. PutsMail'in en büyük derdi tam da buydu: önce görselleri bir yere yükleyip URL'leri elle değiştirmek gerekiyordu.
- `{unsubscribelink}` gibi ESP placeholder'ları var; test gönderiminde bunların ham haliyle gitmesi veya kırık link olması normal.
- Bunun yanında MJML ve başka framework'lerle de üretim yapılıyor. Yani araç hem "ham HTML + klasör" hem de "MJML kaynak" kabul etmeli.

**Bu akıştan çıkan zorunlu gereksinimler**

1. HTML + görselleri klasör/zip olarak sürükle-bırak; görseller otomatik CDN'e yüklensin, `src` değerleri otomatik yeniden yazılsın.
2. MJML'i sunucu tarafında derle, hem kaynağı hem çıktı HTML'i sakla.
3. Placeholder'ları tanı; test gönderiminde örnek değerle doldur veya olduğu gibi bırak (seçmeli).
4. Kendi SMTP/ESP'mizle gönder (PutsMail'in gönderici adresi sorunları olmasın).

---

## 2. Piyasa araştırması

### 2.1 Kapanan / değişen araçlar

| Araç | Durum |
|---|---|
| **PutsMail** (Litmus) | putsmail.com artık "Litmus PutsMail has now been retired" diyor, tarih ve alternatif vermiyor. Rakip siteler 2025'te kapandığını yazıyor. |
| **Litmus** | Validity'ye geçti, "Validity Engage" içinde. Fiyat sayfası kaldırıldı, sadece "contact sales". Üçüncü parti kaynaklar Core planın Ağu 2025'te 199$'dan 500$/ay'a çıktığını yazıyor. |
| **Email on Acid** | Mailgun'a geçti, adı **Mailgun Inspect** oldu. Fiyat yine yayımlanmıyor, "contact sales". |

Sonuç: Piyasanın iki büyük oyuncusu enterprise'a kaydı, self-serve ve ucuz segment boşaldı. PutsMail'in kullanıcı kitlesi (ajans, in-house tasarımcı, tek kişilik ekipler) ortada kaldı.

### 2.2 Aktif alternatifler ve sınırları

| Araç | Ne yapıyor | Fiyat | Eksik / zayıf yön |
|---|---|---|---|
| **Parcel** (parcel.io) | En güçlü editör. HTML/MJML/AMP, canlı önizleme, click-to-inspect, SpamAssassin, erişilebilirlik, link/görsel validatör, 80+ inbox preview (ek ücret), paylaşım linki, onay akışı | Community 0$ (50 e-posta, sadece sen), Pro 29$/kullanıcı/ay, Business 56$/kullanıcı/ay. Inbox preview: 500 adet 49$ | Kullanıcı başı fiyat, inbox preview ayrı ücret, bulut zorunlu (self-host yok), ekip için pahalılaşıyor |
| **Postdrop** (postdrop.io) | HTML editör, test gönderim, desktop/mobil/dark önizleme, CSS inliner, ESP'ye export | Free 10 test/gün ve 3 şablon, Solo 29$/ay, Pro 79$/ay | Günlük test gönderim limiti, canlı client render sadece ücretli, 1 kullanıcı (Solo) |
| **Minty Email Tester** | PutsMail'in doğrudan "mirasçısı" iddiasında: Gmail/Outlook/Yahoo'ya test gönderim, CSS inliner, alt/role/tag kontrolleri, dosya boyutu | Pro 9$/ay | 10 kayıtlı test hesabı sınırı, önizleme sadece tarayıcı render, çok basit UI |
| **htmltest.email** | Ücretsiz test gönderim | 0$ | Tek sabit gönderici adresi, her alıcı önce onay vermeli, önizleme yok |
| **Testi.at** | Ucuz screenshot preview, spam test | Fiyat sayfada yok | ~30 client (Litmus 90+), eski arayüz |
| **Mailtrap** | Dev sandbox (SMTP yakalama), HTML analizi, spam skoru | Free 50–100 e-posta/ay | Pazarlama mailing akışı için değil, gerçek inbox'a göndermek ana özellik değil |
| **Mailpit** (açık kaynak) | Self-host SMTP yakalayıcı, web UI, HTML uyumluluk skoru, link check, SpamAssassin entegrasyonu, screenshot, REST API | 0$ | Gelen kutusu simülatörü; gerçek gönderim, cihaz önizleme, editör, ekip özellikleri yok. Ama **arka planda bileşen olarak kullanılabilir** |
| **Mailing** (mailing.run, açık kaynak) | React/MJML şablon preview sunucusu, hot reload, Nodemailer ile gönderim | 0$ | Sadece Node projesi içinden çalışır, ham HTML yükleme akışı yok, bakımı belirsiz |
| **react-email** preview | Localhost preview, desktop/mobil toggle, test send | 0$ | Sadece React şablonları; tasarımcının slice HTML'i ile alakasız |

### 2.3 Rendering "gerçeği"

- Gerçek client screenshot'ı (Litmus/Inspect) = gerçek Outlook/iOS/Android cihazlarda açıp fotoğraflamak. Bunu kurmak VM parkı ve ciddi operasyon ister; emailr.dev'in self-host analizi de "significant operational overhead" diyor.
- Çoğu "preview" aracı aslında tarayıcı render'ıdır; Outlook Windows (Word motoru), Gmail'in 102KB clipping'i, dark mode dönüşümleri bunlarla yakalanmaz.
- **Dark mode** üç farklı davranış: Apple Mail `color-scheme` meta'ya uyar; Gmail ve Outlook kendi algoritmasını zorla uygular. darkmodechecker.org gibi araçlar bu algoritmaları (CIELAB tabanlı eşik/ters çevirme) tarayıcıda simüle ediyor. Bu simülasyon açık kaynak mantıkla yazılabilir.
- **Can I Email** verisi `https://www.caniemail.com/api/data.json` adresinden açık JSON olarak geliyor (feature → client family → platform → versiyon → y/n/a/u). CSS uyumluluk lint'i için hazır temel.

---

## 3. Eksik analizi: piyasada olmayan veya kötü yapılan şeyler

| # | Eksik | Kim yapıyor / nasıl | Bizim avantajımız |
|---|---|---|---|
| 1 | **Klasör/zip sürükle-bırak + otomatik görsel barındırma + src yeniden yazma** | Hiçbiri tam yapmıyor. Parcel'de görsel yüklemek ayrı adım, Minty "merge" ile yarım yapıyor | Slice tabanlı iş akışında en büyük zaman kaybını sıfırlar |
| 2 | **Sınırsız, kotasız test gönderimi** | Postdrop günlük limit, Minty 10 hesap, Parcel 5–20 alıcı | Kendi SMTP/SES'imiz, sadece maliyet = gönderim ücreti |
| 3 | **Self-host / veri bizde** | Sadece Mailpit ve Mailing; ikisi de ürün değil | Banka ve kurumsal müşteri mailing'leri üçüncü parti buluta çıkmaz (KVKK/uyum açısından satış argümanı) |
| 4 | **Gerçek webmail render'ı ücretsiz** | Litmus/Inspect ücretli; diğerleri tarayıcı render | Playwright ile kendi test hesaplarımızda (Gmail web, Outlook.com, Yahoo web) e-postayı açıp screenshot: Litmus'un en çok kullanılan 3 client'ı sıfır lisans maliyetiyle |
| 5 | **Dark mode simülasyonu + yan yana karşılaştırma** | darkmodechecker, Postdrop (basit) | Light/Dark, Desktop/Tablet/Mobil aynı ekranda grid |
| 6 | **Versiyon karşılaştırma (visual diff)** | Parcel'de versiyon geçmişi var ama görsel diff yok | v3 vs v4 pixel-diff; müşteri "ne değişti" diye sormaz |
| 7 | **Türkçe karakter / encoding kontrolü** | Hiçbiri | `charset`, `ğüşıöç` entity kontrolü, subject'te UTF-8 encode |
| 8 | **Placeholder farkındalığı** | Minty kısmen | `{unsubscribelink}`, `*|FNAME|*`, `{{ }}` tanıma; test gönderiminde örnek değer |
| 9 | **Müşteri onay linki** | Parcel, Postdrop | Giriş gerektirmeyen, yorum bırakılabilen, "Onayla" butonlu, markalı sayfa |
| 10 | **Tasarım kalitesi** | Minty/htmltest/Testi.at 2012 görünümlü, Parcel iyi ama yoğun | Linear/Vercel/Resend seviyesinde arayüz; bu alanda farklılaşma kolay |
| 11 | **Gönderici alan adı sağlığı** | Litmus/Inspect | SPF/DKIM/DMARC kontrolü, Gmail 102KB clip uyarısı, görsel ağırlık uyarısı |
| 12 | **ESP export** | Postdrop | Inline CSS'li, mutlak URL'li, ESP'ye özel placeholder'larla "kopyala-yapıştır" çıktı |

Konumlandırma cümlesi: **"PutsMail'in sadeliği + Parcel'in editörü + Litmus'un önizlemesi, self-host ve kotasız."**

---

## 4. Ürün tanımı

### 4.1 Çekirdek akış (tek ekran, 3 panel)

```
┌──────────────┬──────────────────────────────┬──────────────────┐
│  Kaynak      │  Önizleme                    │  Kontroller      │
│  (Monaco)    │  [Desktop][Tablet][Mobil]    │  ✓ 14 link OK    │
│  HTML / MJML │  [Light][Dark]  [Gmail][OL]  │  ⚠ 2 alt boş     │
│  + Assets    │                              │  ⚠ 118KB > 102KB │
│              │  cihaz çerçevesi, zoom,      │  ✓ Türkçe karakt.│
│              │  click-to-inspect            │  ✓ SPF/DKIM      │
└──────────────┴──────────────────────────────┴──────────────────┘
   [Test gönder ▾]  [Paylaş linki]  [Export ▾]  [Versiyon: v4 ▾]
```

### 4.2 Özellikler, öncelik sırasıyla

**MVP (v0.1) — PutsMail'in yerini doldur, daha iyisini yap**
- Proje oluştur; HTML yapıştır **veya** klasör/zip bırak (`index.html` + görseller).
- Görseller otomatik olarak object storage'a (R2/S3/MinIO) yüklenir, `src`/`background` değerleri mutlak URL'ye çevrilir. Orijinal relative hali de saklanır.
- MJML kaynak yüklenirse sunucuda derlenir; iki sekme: MJML / çıktı HTML.
- Önizleme: Desktop (gerçek genişlik), Tablet 768, Mobil 375; Light/Dark simülasyonu.
- Test gönderimi: subject, from name, alıcı listesi (kayıtlı gruplar: "Ekip", "Müşteri X"), kendi SMTP/SES/Resend transport'u. Gönderim logu ve durumu.
- Kontroller: link check (HTTP durumu), görsel erişilebilirlik, boş alt, dosya boyutu (Gmail 102KB), `charset`, Türkçe karakter, placeholder listesi.
- Paylaşım linki (giriş gerektirmez, salt okunur önizleme).
- Versiyonlama: her kaydet = yeni versiyon, geri dön.

**v0.2 — Litmus'un ucuz alternatifi**
- Webmail gerçek render: Playwright worker, kendi test hesaplarında (Gmail, Outlook.com, Yahoo) e-postayı açar, light+dark screenshot alır. Desktop ve mobil viewport.
- Can I Email tabanlı CSS/HTML lint: "Bu `border-radius` Outlook Windows'ta çalışmaz" gibi satır bazlı uyarı.
- SpamAssassin / rspamd skoru (Mailpit veya doğrudan daemon).
- Dark mode algoritması: Gmail ve Outlook davranışını simüle eden CSS filter + renk dönüşümü (darkmodechecker mantığı).
- Görsel diff: iki versiyon arasında pixel karşılaştırma.

**v0.3 — Ekip ve müşteri**
- Çalışma alanları (marka/müşteri bazlı), üyeler, roller.
- Onay akışı: müşteriye markalı link, yorum pin'leme (önizleme üzerinde nokta bırak), "Onayla/Revize iste".
- ESP export: Mailchimp, Brevo, SendGrid, Customer.io için inline CSS + placeholder dönüşümü.
- Yorum ve değişiklik bildirimleri (e-posta/Slack).

**v1.0 — Ürünleştirme**
- Self-host Docker Compose paketi (tek `docker compose up`).
- Bulut sürüm (opsiyonel SaaS): kullanıcı başı değil, çalışma alanı başı sabit fiyat; test gönderimi kotasız.
- API + CLI: `mailtest push ./build --project X --send ekip` ile CI'dan test gönderimi.
- Şablon bileşen kütüphanesi (header/footer blokları).

**Bilinçli olarak dışarıda tutulanlar**
- Gerçek Outlook Windows / iOS Mail / Android Gmail uygulaması screenshot'ları (VM parkı gerekir). Bunun yerine: v0.2'de webmail; ileride BrowserStack/LambdaTest entegrasyonu veya Inspect API ile "ihtiyaç halinde satın al".
- Drag-drop e-posta tasarım editörü (Stripo/Unlayer alanı). Hedef kitle kod/slice ile üretiyor.
- Toplu kampanya gönderimi. Bu bir test aracı, ESP değil.

---

## 5. Mimari

```
                ┌─────────────────────────┐
  Tarayıcı ───▶ │  Web (Next.js 15, App   │
                │  Router, Tailwind,      │
                │  shadcn/ui, Monaco)     │
                └──────────┬──────────────┘
                           │ tRPC / Route Handlers
                ┌──────────▼──────────────┐      ┌──────────────┐
                │  API + Auth (Auth.js)   │────▶ │ Postgres     │
                │  Prisma / Drizzle       │      │ (projeler,   │
                └──────────┬──────────────┘      │ versiyonlar, │
                           │ BullMQ (Redis)      │ gönderimler) │
      ┌────────────────────┼────────────────┐    └──────────────┘
┌─────▼──────┐   ┌─────────▼─────┐   ┌──────▼───────┐   ┌──────────────┐
│ Render     │   │ Send worker   │   │ Check worker │   │ Object store │
│ worker     │   │ Nodemailer →  │   │ link/alt/    │   │ R2 / S3 /    │
│ Playwright │   │ SMTP/SES/     │   │ caniemail/   │   │ MinIO        │
│ (chromium, │   │ Resend        │   │ spam (rspamd)│   │ (assets +    │
│ webmail    │   │               │   │ SPF/DKIM     │   │ screenshots) │
│ login)     │   │               │   │              │   │              │
└────────────┘   └───────────────┘   └──────────────┘   └──────────────┘
```

**Teknoloji kararları ve gerekçeleri**
- **Next.js + TypeScript**: tek repo, SSR'lı paylaşım sayfaları, Vercel veya Docker.
- **Monaco editor**: VS Code hissi, HTML/MJML syntax, Emmet, çoklu imleç. Parcel'in editörüyle aynı sınıf.
- **mjml** npm paketi sunucu tarafında; **juice** ile CSS inlining; **cheerio** ile URL rewrite ve analiz.
- **Playwright**: önizleme screenshot'ları, webmail render, görsel diff (`pixelmatch`).
- **Nodemailer**: SMTP, SES, Resend transport'ları tek arayüz. DKIM imzalama destekler.
- **BullMQ + Redis**: gönderim ve screenshot işleri kuyruğa; UI anında döner, durum websocket/SSE ile güncellenir.
- **Postgres**: Prisma veya Drizzle. Self-host'ta Docker içinde, bulutta Neon/Supabase.
- **Object storage**: Cloudflare R2 (egress ücretsiz, görseller test e-postalarında dışarıdan çekilecek). Self-host'ta MinIO.
- **Mailpit**: Docker Compose'da opsiyonel "sandbox inbox" servisi; e-postayı gerçek alıcıya göndermeden önce yakalayıp HTML skoru ve SpamAssassin sonucu alır.
- **Can I Email** JSON'u gece cron ile cache'lenir; lint kuralları buradan üretilir.

**Veri modeli (özet)**
```
Workspace ─< Project ─< Version ─< Asset
                         │
                         ├─< TestSend ─< Delivery (alıcı, durum, messageId)
                         ├─< CheckRun (link, alt, size, css-lint, spam, dns)
                         ├─< Screenshot (client, mode, viewport, url)
                         └─< Comment (x, y, body, author, resolved)
RecipientGroup ─< Recipient
SenderProfile (from, transport, dkim)
```

**Güvenlik notları**
- Yüklenen HTML iframe'de `sandbox` ile render edilir; script'ler çalışmaz.
- SMTP şifreleri ve webmail test hesabı cookie'leri şifreli (libsodium/KMS) saklanır.
- Paylaşım linkleri imzalı, süreli, iptal edilebilir.
- Rate limit: workspace başına dakikada N test gönderimi (spam kaynağı olmamak için).

---

## 6. Tasarım konsepti

Hedef: "Linear/Vercel/Resend" sınıfı, sakin, yoğun ama okunur. Rakiplerin tamamı burada zayıf; bu ürünün ilk 10 saniyedeki farkı tasarım olacak.

**İlkeler**
1. **Önizleme kahramandır.** Editör ve kontroller yan paneldir, isteyince daralır (`⌘B`). Önizleme ortada, cihaz çerçevesi gerçek piksel ölçeğinde.
2. **Tek ekran.** Yükle → gör → kontrol et → gönder, sayfa geçişi olmadan.
3. **Durum her zaman görünür.** Sağ üstte kontrol özeti rozeti (3 yeşil, 2 sarı, 0 kırmızı). Tıklayınca sağ panel açılır.
4. **Klavye önce.** `⌘K` komut paleti: "Test gönder → Ekip", "Dark mode", "Mobil", "v3 ile karşılaştır".
5. **Light ve Dark tema**, sistem tercihini izler. E-posta önizlemesinin dark modu ile uygulamanın dark teması bağımsızdır (kafa karışıklığı olmasın diye önizleme çerçevesinde açık etiket).

**Görsel dil**
- Tipografi: Inter (UI) + JetBrains Mono (kod). 13px temel, sıkı satır aralığı.
- Renk: nötr gri ölçeği (zinc), tek vurgu rengi (indigo veya marka rengi), durum renkleri yalnızca kontrol rozetlerinde.
- Cihaz çerçeveleri: ince, gerçek köşe yarıçapı; iPhone/iPad/Mac çerçeve seti; `scale-to-fit` ve %100 görünüm arası geçiş.
- Önizleme arka planı: hafif noktalı grid (e-postanın kenarları nerede biter, belli olsun).
- Mikro etkileşimler: gönderim ilerleme çubuğu alıcı bazlı; screenshot gelince kart "fade-in"; kontrol tamamlanınca rozet sayacı animasyonlu.

**Ana ekranlar**
1. **Projeler**: kart grid, son önizleme küçük resmi, versiyon ve son gönderim bilgisi, arama.
2. **Çalışma ekranı** (3 panel, yukarıdaki şema).
3. **Önizleme grid'i**: Desktop/Tablet/Mobil × Light/Dark × (Gmail/Outlook/Yahoo) tek sayfada; hücreye tıkla, tam ekran incele.
4. **Gönderim geçmişi**: zaman çizelgesi; alıcı, durum, messageId, "tekrar gönder".
5. **Paylaşım / onay sayfası**: markalı, sade; cihaz seçimi, yorum pin'leri, "Onayla".
6. **Ayarlar**: gönderici profilleri, alıcı grupları, webmail test hesapları, workspace.

**Boş durumlar ve ilk deneyim**
- İlk açılışta tek büyük sürükle-bırak alanı: "HTML, MJML veya klasörü buraya bırak". Örnek proje butonu.
- Gönderici profili yoksa "Test gönder" butonu açıklayıcı tooltip ile pasif, kurulum iki adım.

**Figma**: Ayrıntılı ekranlar için önce bir Figma dosyası üretilecek (tasarım sistemi + 6 ana ekran). Bu dosya 2. haftanın çıktısı.

---

## 7. Yol haritası (10 hafta, tek geliştirici + tasarım)

| Hafta | Çıktı |
|---|---|
| 1 | Repo iskeleti (Next.js, Prisma, Docker Compose: Postgres, Redis, MinIO, Mailpit). Auth. Proje/Version modeli. HTML yapıştır ve ham önizleme. |
| 2 | **Figma tasarım sistemi + 6 ekran.** Paralelde: klasör/zip yükleme, asset'leri R2/MinIO'ya yazma, `src` rewrite. |
| 3 | Çalışma ekranı UI (3 panel, Monaco, cihaz çerçeveleri, light/dark toggle). MJML derleme. |
| 4 | Test gönderimi: SenderProfile (SMTP/SES/Resend), RecipientGroup, BullMQ worker, gönderim logu, SSE ile durum. **Bu noktada PutsMail tamamen yerine geçer.** |
| 5 | Kontroller: link, alt, boyut, charset/Türkçe, placeholder, SPF/DKIM/DMARC. Sağ panel rozet sistemi. |
| 6 | Paylaşım linki + salt okunur önizleme sayfası. Versiyon geçmişi, geri alma. İç kullanım başlar. |
| 7 | Playwright render worker: desktop/tablet/mobil screenshot, görsel diff. |
| 8 | Webmail gerçek render (Gmail, Outlook.com, Yahoo test hesapları), dark mode simülasyonu. |
| 9 | Can I Email lint, rspamd/SpamAssassin skoru, ESP export. |
| 10 | Onay akışı ve yorum pin'leri, Docker self-host paketi, dokümantasyon, iç beta kapanışı. |

Sonrası: API/CLI, bulut sürüm ve fiyatlandırma, BrowserStack entegrasyonu, bileşen kütüphanesi.

---

## 8. Riskler ve karşı önlemler

| Risk | Önlem |
|---|---|
| Webmail test hesaplarının otomasyonla kilitlenmesi (Google/Microsoft bot tespiti) | Oturum cookie'lerini elle oluşturup saklama, düşük sıklık, hesap başına günlük limit, yedek hesaplar. Bu özellik "best effort" etiketiyle sunulur. |
| Test gönderimlerinin spam'e düşmesi | Kendi alan adı, SPF/DKIM/DMARC tam, SES/Resend gibi itibarlı transport, alıcı gruplarında "allow-list" uyarısı. |
| Gerçek Outlook Windows render'ı olmadan "Litmus kadar iyi" iddiası | Pazarlamada dürüst: "webmail gerçek, uygulama simülasyon". Lint'le Outlook kurallarını önceden yakala. |
| Tasarım kapsamının şişmesi | Figma'da 6 ekran sınırı; MVP'de yalnızca çalışma ekranı ve projeler ekranı pixel-perfect. |
| Self-host ve bulut sürümünü aynı anda taşımak | İlk 10 hafta sadece self-host (Docker). Bulut, ürün oturduktan sonra. |

---

## 9. İlk 3 somut adım

1. Repo'yu `/Users/bhan/Desktop/mailing` altında başlat: Next.js + Prisma + Docker Compose (Postgres, Redis, MinIO, Mailpit).
2. `NitelikliYatirimciMailing` klasörünü ilk test fixture'ı yap: zip yükle → görseller MinIO'ya → src rewrite → önizleme → Mailpit'e gönder. Bu uçtan uca akış 1. haftanın "done" kriteri.
3. Figma'da tasarım sistemi ve çalışma ekranını çiz; önizleme kahraman, 3 panel.

---

## Kaynaklar

- PutsMail kapanış sayfası: https://putsmail.com/
- Parcel özellikler ve fiyat: https://parcel.io/ , https://parcel.io/pricing
- Postdrop: https://postdrop.io/
- Minty Email Tester: https://mintyemailtester.com/
- htmltest.email: https://htmltest.email/
- Testi.at: https://testi.at/
- Mailgun Inspect (eski Email on Acid): https://www.mailgun.com/products/inspect/
- Litmus (Validity Engage): https://www.litmus.com/pricing
- Litmus fiyat değişikliği (üçüncü parti): https://moosend.com/blog/litmus-alternatives/ , https://coldletter.com/blog/litmus-alternatives/
- Mailpit: https://github.com/axllent/mailpit
- Mailing (açık kaynak): https://www.mailing.run/
- react-email vs MJML vs Maizzle: https://www.pkgpulse.com/guides/react-email-vs-mjml-vs-maizzle-email-template-2026
- Can I Email veri API'si: https://www.caniemail.com/api/data.json
- Dark mode simülasyonu: https://darkmodechecker.org/ , https://customer.io/tools/dark-mode-preview
- Client rendering farkları: https://dev.to/mailpeek/the-complete-guide-to-email-client-rendering-differences-in-2026-243f
- Preview araçları karşılaştırması: https://emailr.dev/en/blog/email-preview-tools/
- Litmus/EoA alternatifleri: https://www.badsender.com/en/2024/07/25/alternatives-litmus-email-on-acid/
- Outlook render sorunları: https://www.emailonacid.com/blog/article/email-development/how-to-code-emails-for-outlook/
