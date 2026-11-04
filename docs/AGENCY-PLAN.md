# Sendprova — Ajans Odaklı Yol Haritası

Tarih: 3 Kasım 2026
Hedef: Ajansların (ve kurum içi e-posta ekiplerinin) mailing üretim, onay ve teslim sürecini uçtan uca Sendprova içinde çözmek. Rakipler "render test" satıyor; biz "müşteriyle birlikte üretim" satacağız.

---

## 1. Araştırma: ajanslar nerede zaman kaybediyor

| Sorun | Kaynak | Bizim cevabımız |
|---|---|---|
| **Onay, en büyük darboğaz.** Litmus'un 2025 ajans raporunda e-posta pazarlamacılarının %35'i "geri bildirim toplamak" en büyük engel diyor. | Litmus Agencies Playbook | Hesap gerektirmeyen onay sayfası, pin'li yorum, tek tıkla onay |
| **Geri bildirim dağınık:** e-posta zinciri, Slack, WhatsApp, Zoom notu. Ne kabul edildiğinin kaydı yok. | Apaya, MSPAA, SocialPilot | Tüm yorumlar versiyona bağlı tek yerde, çözüldü/çözülmedi, onay kaydı kim-ne zaman |
| **Versiyon karmaşası:** müşteri eski linke bakıp eski versiyona yorum yapıyor; onaydan sonra fiyat/legal değişiyor, yeniden onay gerekiyor. | Gain, SocialPilot | Paylaşım linki hep son versiyonu gösterir; eski versiyon izleme "bu eski bir versiyon" uyarısı; görsel diff ile "ne değişti" |
| **Revizyon turu sınırı ve deadline** ajansların kârlılık aracı; 2 tur, 48 saat gibi kurallar var ama takip edilmiyor. | Stripo, Sequenzy | Proje başına tur sayacı, onay deadline'ı ve hatırlatma e-postası |
| **Brief/asset eksikleri** HTML aşamasında rework yaratıyor: logo yok, görsel oranı yanlış, legal metin onaysız. | The Better Creative | Müşteri bazlı marka kiti (logo, renk, footer, legal metin) ve otomatik "marka uyumu" kontrolü |
| **Test gönderimi için insan aramak:** "Outlook'u olan var mı?" diye Slack'te soruluyor. | Litmus | Kayıtlı alıcı grupları zaten var; üstüne cihaz/istemci etiketli "seed list" ve kim-nerede-açtı takibi |
| **Koltuk başı fiyat** ajansı müşteri ekledikçe cezalandırıyor; white-label ayrı ücret ya da kaldırılmış. | Swydo, Warmy, LocalImpact | Çalışma alanı başı sabit fiyat, sınırsız müşteri ve sınırsız gözden geçiren; white-label onay sayfası dahil |
| **Genel proofing araçları** (Filestage, Ziflow, Markup.io) e-postayı bilmiyor: istemci render'ı, dark mode, link kontrolü yok; Ziflow öğrenmesi zor, hepsi kullanıcı başı. | Filestage/Ziflow karşılaştırmaları | E-posta farkındalığı olan proofing: yorum pin'i cihaz görünümüne, kontrol sonuçları onay sayfasında |
| **Pre-send checklist** her ajansta manuel: UTM, unsubscribe, fiziksel adres, legal metin, marka. Tek araç yok. | Litmus 29-madde checklist, Klaviyo, Stensul | Otomatik "gönderime hazır" skoru: teknik + marka + legal + izleme maddeleri |

### Rakipler bu alanda ne sunuyor

- **Litmus Proof**: yorum ve onay var ama her gözden geçiren koltuk; Core 500$/ay'dan başlıyor, self-serve yok.
- **Parcel**: onay akışı ve paylaşım linki var, Pro 29$/kullanıcı/ay; yorumlar önizleme üzerine pin'lenmiyor, marka kiti yok, white-label yok.
- **Postdrop / Minty / Testi.at**: işbirliği yok denecek kadar az.
- **Filestage / Ziflow / Markup.io**: güçlü pin'li yorum, ama e-posta istemcisi farkındalığı sıfır; kullanıcı başı ya da öğe başı fiyat.

**Boşluk:** "E-posta bilen proofing + müşteri bazlı marka kiti + otomatik pre-send checklist + sabit fiyat" dörtlüsünü kimse tek üründe vermiyor.

---

## 2. Ürün ilkeleri (ajans için)

1. **Müşteri hiçbir zaman hesap açmaz.** Link alır, bakar, yorumlar, onaylar. E-posta adresini sadece "kim onayladı" kaydı için ister.
2. **Her şey versiyona bağlı.** Yorum, onay, kontrol sonucu, test gönderimi: hepsi v3'e aittir, v4'e taşınmaz.
3. **Müşteri = çalışma alanı içinde "Client".** Marka kiti, alıcı grupları, gönderici profili müşteriye bağlı; proje bir müşteriye ait.
4. **Sayma yok.** Sınırsız müşteri, proje, gözden geçiren. Kredi sadece test gönderiminde.
5. **Ajansın markası önde.** Onay sayfasında ajansın logosu ve rengi; "Sendprova" küçük bir "powered by".

---

## 3. Özellikler, sprint sırasıyla

> Durum (4 Kasım 2026): Sprint 1–6 tamamlandı ve main dalında. Kalanlar "Sonrası" bölümünde.

Her sprint tek başına değer üretir ve bir önceki üstüne biner. Tahminler tek geliştirici için.

### Sprint 1 — Onay ve yorum (1 hafta)  ← buradan başlıyoruz
Ajansın bugün en çok canını yakan şey.
- **Client** modeli: çalışma alanı altında müşteri (ad, logo, renk). Proje müşteriye bağlanır. Proje listesi müşteriye göre gruplanır.
- **Review sayfası** (`/r/<token>`): mevcut paylaşım sayfasının üstüne
  - Gözden geçiren adını ve e-postasını bir kez girer (cookie'de kalır), hesap yok.
  - **Pin'li yorum**: önizleme üzerinde tıkla → nokta + yorum. Cihaz görünümü ve koordinat kaydedilir; ajans panelde aynı noktayı görür.
  - **Yorum dizisi**: cevap, "çözüldü" işareti, çözülmemiş sayacı.
  - **Karar**: "Onayla" / "Revizyon iste" butonu; kim, ne zaman, hangi versiyon.
  - Eski versiyon açılırsa sarı şerit: "Bu v2. Güncel versiyon v3."
- **Ajans tarafı**: çalışma ekranında "Yorumlar" sekmesi; proje durumu rozeti: Taslak → İncelemede → Revizyon → Onaylandı.
- **Bildirim**: yeni yorum ve onayda ajansa e-posta (kendi SMTP'sinden); müşteriye "yeni versiyon hazır" e-postası tek tıkla.
- Şema: `Client`, `Review` (token, versiyon, durum), `Comment` (x, y, device, body, author, resolvedAt), `Approval`.

### Sprint 2 — Versiyon diff ve revizyon takibi (3-4 gün)
"Sadece başlığı değiştirmiştik" tartışmasını bitirir.
- Her versiyon için Playwright ile masaüstü ve mobil ekran görüntüsü (R2'ye).
- **Görsel diff**: v(n-1) vs v(n), pixelmatch ile fark maskesi; slider ve "sadece değişenleri göster".
- **Metin diff**: HTML'den çıkarılan düz metnin satır diff'i (fiyat, tarih, legal metin değişti mi).
- Review sayfasında "Önceki versiyondan farklar" bölümü; müşteri sadece değişeni inceler.
- **Revizyon sayacı**: proje başına "tur 2/2" rozeti, ajans sınırı ayarlar; deadline tarihi ve hatırlatma.

### Sprint 3 — Marka kiti ve "gönderime hazır" skoru (1 hafta)
Pre-send checklist'i otomatikleştirir.
- **Marka kiti** (müşteri başına): logo dosyası, renk paleti, font listesi, zorunlu footer metni, fiziksel adres, unsubscribe placeholder'ı, zorunlu UTM şablonu (`utm_source=newsletter&utm_medium=email&utm_campaign={proje}`).
- **Marka kontrolleri**: HTML'de kit dışı renk, kit logosu yok, footer metni eksik, adres eksik, unsubscribe yok, linklerde UTM eksik/yanlış, `{placeholder}` ham kalmış.
- **Gönderime hazır skoru**: teknik (boyut, link, görsel, alt) + marka + legal + izleme; 0-100 ve kırmızı maddeler. Review sayfasında müşteri de görür.
- **Checklist dışa aktarımı**: PDF "pre-flight raporu", ajansın logosuyla; onay dosyasına eklenir.

### Sprint 4 — White-label ve müşteri portalı (3-4 gün)
Ajansın markasını öne çıkarır.
- Çalışma alanı ayarları: ajans logosu, rengi, özel alan adı (`review.ajans.com` CNAME) ve "powered by" gizleme.
- **Müşteri portalı**: `/r/client/<token>` altında o müşterinin tüm projeleri, durumları, onay geçmişi; tek link.
- E-posta bildirimleri ajansın gönderici profilinden ve markasıyla çıkar.

### Sprint 5 — Seed list ve açılış takibi (3-4 gün)
"Outlook'u olan var mı?" sorusunu bitirir.
- Alıcı grubunda her alıcıya cihaz/istemci etiketi (Outlook 365 Win, iPhone Mail, Gmail Android).
- Test gönderiminde açılış pikseli: kim, hangi istemci (User-Agent), ne zaman açtı. Panelde "3/5 alıcı açtı, Outlook henüz açmadı".
- Tek tıkla "seed list'e gönder" ve sonuç matrisi.

### Sprint 6 — ESP export ve teslim paketi (3 gün)
Onaylanan işi müşterinin ESP'sine sorunsuz taşır.
- Mailchimp / Brevo / SFMC / Customer.io / HubSpot profilleri: placeholder sözdizimi dönüşümü, CSS inline, görseller R2'de.
- "Teslim paketi" zip: HTML, görseller, düz metin versiyonu, pre-flight raporu, onay kaydı PDF'i.
- Müşteriye "teslim edildi" e-postası ve portalde arşiv.

### Sonrası (talebe göre)
- Webmail gerçek render (Gmail/Outlook.com/Yahoo screenshot) ve dark mode simülasyonu.
- Can I Email CSS lint.
- Ekip üyeleri ve roller (ajans içinde tasarımcı / hesap yöneticisi).
- Stripe ile kredi paketi ve ajans planı.
- API ve CLI (`sendprova push`).

---

## 4. Fiyatlandırma çerçevesi (ajans)

| Plan | Fiyat | İçerik |
|---|---|---|
| Free | 0 | 1 müşteri, 50 kredi, review sayfası (Sendprova markalı) |
| Studio | sabit aylık | sınırsız müşteri ve proje, pin'li yorum, diff, marka kiti, aylık kredi |
| Agency | sabit aylık | + white-label, özel alan adı, müşteri portalı, seed list açılış takibi, daha fazla kredi |
| Self-hosted | yıllık lisans | her şey, kendi sunucunda |

Koltuk sayılmaz, gözden geçiren sayılmaz. Rakiplerin kullanıcı başı modeline doğrudan karşı konumlanır.

---

## 5. Başarı ölçütleri

- Onay süresi: ilk paylaşımdan "Onaylandı"ya geçen saat.
- Tur sayısı: proje başına revizyon turu (hedef ≤ 2).
- Yorum çözüm süresi.
- Gönderime hazır skoru ortalaması ve kırmızı madde sayısı.
- Müşteri başına aktif proje, ajans başına müşteri sayısı.

---

## Kaynaklar

- Litmus, Email Marketing for Agencies 2025 Playbook: https://www.litmus.com/blog/email-marketing-for-agencies-guide
- Stripo, Email marketing for agencies: https://stripo.email/blog/email-marketing-for-agencies-the-complete-guide/
- Stripo, Email production workflows: https://stripo.email/blog/email-production-workflows-how-enterprise-teams-ship-campaigns-faster/
- Gain, Why your email approval workflow isn't working: https://blog.gainapp.com/email-approval/
- SocialPilot, Fixing client approval workflows: https://www.socialpilot.co/blog/fix-client-approval-workflows
- Apaya, Approval workflows for agencies: https://apaya.com/blog/social-media-approval-workflows-for-agencies
- The Better Creative, Email design briefs: https://www.thebettercreative.com/email-design-blog/email-design-briefs-stop-production-rework
- Sequenzy, HTML email builders for agencies: https://www.sequenzy.com/blog/best-html-email-builders-for-agencies
- Filestage vs Ziflow: https://filestage.io/filestage-vs-ziflow/ , https://www.ziflow.com/blog/ziflow-vs-filestage
- Markup.io ve proofing araçları: https://filestage.io/blog/online-proofing-tools/
- White-label ve koltuk fiyatı şikayetleri: https://www.swydo.com/blog/best-white-label-reporting-tools/ , https://localimpact.com/blog/white-label-review-software
- Litmus, 29 maddelik pre-send checklist: https://www.litmus.com/blog/the-ultimate-email-checklist-24-things-to-check-before-you-send/
- Klaviyo pre-send checklist: https://www.klaviyo.com/blog/email-checklist-before-sending
- Stensul (marka guardrail): https://stensul.com/
