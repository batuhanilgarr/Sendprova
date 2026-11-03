import { CheckCircle2Icon, LinkIcon, MonitorSmartphoneIcon, SendIcon, UploadCloudIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

const FEATURES = [
  { Icon: UploadCloudIcon, title: "Klasörü bırak, hazır", text: "HTML, MJML veya zip. Görseller otomatik barındırılır, yollar yeniden yazılır." },
  { Icon: MonitorSmartphoneIcon, title: "Masaüstü, tablet, mobil", text: "Gerçek istemci davranışıyla ölçeklenmiş önizleme, açık ve koyu tema." },
  { Icon: CheckCircle2Icon, title: "Göndermeden önce kontrol", text: "Gmail 102 KB sınırı, kırık link, yüklenmeyen görsel, eksik alt metni, Türkçe karakter." },
  { Icon: SendIcon, title: "Kendi SMTP'nle test gönder", text: "Gmail, SES, Resend… Kayıtlı alıcı grupları, alıcı bazlı teslimat durumu." },
  { Icon: LinkIcon, title: "Müşteriye tek link", text: "Giriş gerektirmeyen, iptal edilebilir salt okunur önizleme sayfası." },
];

export default function Landing() {
  return (
    <>
      <header className="h-14 flex items-center px-4 sm:px-6 gap-3 max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-[15px]">
          <span className="inline-grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground text-xs font-bold" aria-hidden>
            S
          </span>
          Sendprova
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          <Suspense fallback={null}>
            <AuthButtons />
          </Suspense>
          <ThemeToggle />
        </nav>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-28 pb-16 text-center">
          <p className="inline-block rounded-full border px-3 py-1 text-xs text-muted-foreground mb-6">PutsMail kapandı. Daha iyisi burada.</p>
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05] max-w-3xl mx-auto">
            Mailing&apos;i göndermeden önce <span className="text-primary">prova et.</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg mt-5 max-w-xl mx-auto">
            HTML veya MJML mailing&apos;ini bırak; her cihazda önizle, kontrolleri geç, kendi SMTP&apos;nle gerçek gelen kutusuna test gönder.
          </p>
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
              Ücretsiz başla
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/login" />}>
              Giriş yap
            </Button>
          </div>
          <p className="text-muted-foreground text-xs mt-3">Kayıtta 50 kredi hediye. 1 kredi = 1 alıcıya 1 test gönderimi.</p>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ Icon, title, text }) => (
              <li key={title} className="rounded-2xl border bg-card p-5">
                <div className="size-9 rounded-lg bg-muted grid place-items-center text-foreground mb-3">
                  <Icon className="size-4" />
                </div>
                <h2 className="font-medium text-[15px]">{title}</h2>
                <p className="text-muted-foreground mt-1">{text}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-muted-foreground text-xs">Sendprova · mailing test ve önizleme</footer>
    </>
  );
}

async function AuthButtons() {
  await connection();
  const session = await getSession();
  if (session) {
    return (
      <Button size="sm" nativeButton={false} render={<Link href="/app" />}>
        Uygulamaya git
      </Button>
    );
  }
  return (
    <>
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login" />}>
        Giriş
      </Button>
      <Button size="sm" nativeButton={false} render={<Link href="/register" />}>
        Kayıt ol
      </Button>
    </>
  );
}
