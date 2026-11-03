import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CoinsIcon,
  FolderUpIcon,
  Link2Icon,
  MailCheckIcon,
  MonitorSmartphoneIcon,
  MoonIcon,
  SendIcon,
  ServerIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

const STEPS = [
  { n: "01", title: "Drop your files", text: "HTML, MJML, a zip or the whole export folder. Images are hosted automatically and every relative path is rewritten." },
  { n: "02", title: "Preview everywhere", text: "Desktop, tablet and mobile frames with real client scaling, in light and dark." },
  { n: "03", title: "Pass the checks", text: "Gmail's 102 KB clip, broken links, unreachable images, missing alt text, charset problems." },
  { n: "04", title: "Send a real test", text: "Through your own SMTP to saved recipient groups, with per-recipient delivery status." },
];

const FEATURES = [
  { Icon: FolderUpIcon, title: "Folder and zip upload", text: "Sliced Photoshop exports, MJML sources or plain HTML. No manual image hosting, no URL rewriting by hand." },
  { Icon: MonitorSmartphoneIcon, title: "Device previews", text: "Fixed-width emails are shrunk the way iOS Mail and the Gmail app do it, so what you see is what the phone shows." },
  { Icon: CheckCircle2Icon, title: "Pre-flight checks", text: "Every link and image is fetched. Size limits, placeholders and encoding are flagged before a single email goes out." },
  { Icon: SendIcon, title: "Your SMTP, your sender", text: "Gmail, Amazon SES, Resend or any SMTP host. Saved sender profiles and recipient groups, one-click resend." },
  { Icon: Link2Icon, title: "Client-ready share links", text: "A read-only preview page that needs no account. Revoke it any time, see how often it was opened." },
  { Icon: MoonIcon, title: "Dark mode ready", text: "Switch the app and the preview frame independently. Client dark-mode simulation is on the roadmap." },
];

// Evaluated once per server start; good enough for a copyright year.
const YEAR = new Date().getFullYear();

const CHECKS = [
  "HTML size vs. Gmail's 102 KB clipping limit",
  "Every link answers with a 2xx status",
  "Every image is reachable and its weight is summed",
  "Visible images carry alt text",
  "UTF-8 charset is declared",
  "ESP placeholders are detected and listed",
  "Relative asset paths all resolved to hosted files",
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
        <nav className="hidden sm:flex items-center gap-1 ml-6 text-muted-foreground">
          <a href="#how" className="px-2 py-1 rounded-md hover:text-foreground">
            How it works
          </a>
          <a href="#features" className="px-2 py-1 rounded-md hover:text-foreground">
            Features
          </a>
          <a href="#pricing" className="px-2 py-1 rounded-md hover:text-foreground">
            Pricing
          </a>
        </nav>
        <nav className="ml-auto flex items-center gap-1">
          <Suspense fallback={null}>
            <AuthButtons />
          </Suspense>
          <ThemeToggle />
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-12 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground mb-6">
            <span className="size-1.5 rounded-full bg-ok" />
            PutsMail is gone. Sendprova picks up where it left off.
          </p>
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05] max-w-3xl mx-auto">
            Rehearse your email <span className="text-primary">before you send it.</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg mt-5 max-w-xl mx-auto">
            Drop an HTML or MJML mailing, preview it on every device, run the checks, then send a real test from your own SMTP to a real inbox.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
              Start free
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/login" />}>
              Sign in
            </Button>
          </div>
          <p className="text-muted-foreground text-xs mt-3">50 credits on sign-up. No card required. 1 credit = 1 recipient in one test send.</p>
        </section>

        {/* Product mock: a real-looking workbench built from CSS, no fake data */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <div className="rounded-2xl border bg-card shadow-[0_30px_80px_-40px_rgba(0,0,0,.5)] overflow-hidden">
            <div className="h-10 border-b flex items-center gap-2 px-3">
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <div className="ml-3 flex gap-1 rounded-lg bg-muted p-0.5 text-[11px]">
                <span className="rounded-md bg-background px-2 py-0.5 shadow-sm">Desktop 1000</span>
                <span className="px-2 py-0.5 text-muted-foreground">Tablet 768</span>
                <span className="px-2 py-0.5 text-muted-foreground">Mobile 390</span>
              </div>
              <div className="ml-auto flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-ok" />7
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-warn" />1
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-err" />0
                </span>
              </div>
            </div>
            <div className="grid lg:grid-cols-[1fr_280px]">
              <div className="canvas-grid p-6 sm:p-10 min-h-72">
                <div className="mx-auto max-w-md rounded-md border bg-white shadow-sm overflow-hidden" aria-hidden>
                  <div className="h-9 bg-zinc-100 flex items-center px-4">
                    <span className="h-2 w-16 rounded bg-zinc-300" />
                  </div>
                  <div className="h-28 bg-gradient-to-br from-indigo-500 to-violet-600" />
                  <div className="p-5 flex flex-col gap-2">
                    <span className="h-3 w-3/4 rounded bg-zinc-800" />
                    <span className="h-2 w-full rounded bg-zinc-300" />
                    <span className="h-2 w-11/12 rounded bg-zinc-300" />
                    <span className="h-2 w-2/3 rounded bg-zinc-300" />
                    <span className="mt-2 h-8 w-32 rounded-full bg-pink-600" />
                  </div>
                </div>
              </div>
              <aside className="border-t lg:border-t-0 lg:border-l p-4 text-left">
                <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">Checks</h3>
                <ul className="flex flex-col gap-2">
                  {CHECKS.slice(0, 5).map((c, i) => (
                    <li key={c} className="flex gap-2">
                      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${i === 3 ? "bg-warn" : "bg-ok"}`} />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
                <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mt-5 mb-2">Send test</h3>
                <div className="flex flex-col gap-2">
                  <div className="h-8 rounded-lg border px-2.5 flex items-center text-muted-foreground text-xs">Subject</div>
                  <div className="h-8 rounded-lg border px-2.5 flex items-center text-muted-foreground text-xs">Sender · your SMTP</div>
                  <div className="h-8 rounded-lg bg-primary text-primary-foreground px-2.5 flex items-center gap-1.5 text-xs font-medium w-fit">
                    <SendIcon className="size-3.5" /> Send test
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center">From export folder to inbox in four steps</h2>
            <ol className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STEPS.map((s) => (
                <li key={s.n} className="rounded-2xl border bg-card p-5">
                  <span className="font-mono text-xs text-primary">{s.n}</span>
                  <h3 className="font-medium text-[15px] mt-2">{s.title}</h3>
                  <p className="text-muted-foreground mt-1">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center">Everything PutsMail never had</h2>
          <p className="text-muted-foreground text-center mt-2 max-w-xl mx-auto">Built for people who ship sliced HTML, MJML and hand-coded templates every week.</p>
          <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ Icon, title, text }) => (
              <li key={title} className="rounded-2xl border bg-card p-5">
                <div className="size-9 rounded-lg bg-muted grid place-items-center text-foreground mb-3">
                  <Icon className="size-4" />
                </div>
                <h3 className="font-medium text-[15px]">{title}</h3>
                <p className="text-muted-foreground mt-1">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Checks list */}
        <section className="border-t bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Checks that catch what a glance misses</h2>
              <p className="text-muted-foreground mt-3">
                A preview tells you how it looks. The checks tell you whether it will arrive intact. Both run on every version you upload, and the results stay with that version.
              </p>
            </div>
            <ul className="rounded-2xl border bg-card divide-y">
              {CHECKS.map((c) => (
                <li key={c} className="flex items-center gap-3 px-4 py-3">
                  <MailCheckIcon className="size-4 text-ok shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center">Simple, usage-based pricing</h2>
          <p className="text-muted-foreground text-center mt-2 max-w-xl mx-auto">
            One credit is one recipient in one test send. Previews, checks and share links are always free.
          </p>
          <div className="mt-10 grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-center gap-2">
                <CoinsIcon className="size-4 text-primary" />
                <h3 className="font-medium text-[15px]">Free</h3>
              </div>
              <p className="text-3xl font-semibold tracking-tight mt-3">
                50 <span className="text-muted-foreground text-base font-normal">credits on sign-up</span>
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-muted-foreground">
                <li>Unlimited projects and versions</li>
                <li>Unlimited previews and checks</li>
                <li>Unlimited share links</li>
                <li>Your own SMTP senders</li>
              </ul>
              <Button className="mt-6 w-full" nativeButton={false} render={<Link href="/register" />}>
                Create account
              </Button>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-center gap-2">
                <ServerIcon className="size-4 text-primary" />
                <h3 className="font-medium text-[15px]">Credit packs and self-hosting</h3>
              </div>
              <p className="text-muted-foreground mt-3">
                Top-ups for agencies and teams, and a self-hosted edition for companies whose mailings cannot leave their own infrastructure. Pricing is being finalised; get in touch and we will set you up by hand.
              </p>
              <Button variant="outline" className="mt-6 w-full" nativeButton={false} render={<a href="mailto:hello@sendprova.com" />}>
                Contact us
              </Button>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-t">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-3 gap-6 text-center">
            <div>
              <ShieldCheckIcon className="size-5 mx-auto text-muted-foreground" />
              <p className="mt-2 font-medium">Your data stays yours</p>
              <p className="text-muted-foreground">Templates and images are stored per workspace and never used for anything else.</p>
            </div>
            <div>
              <ServerIcon className="size-5 mx-auto text-muted-foreground" />
              <p className="mt-2 font-medium">Bring your own SMTP</p>
              <p className="text-muted-foreground">Test emails leave from your domain, with your SPF and DKIM, not from a shared sender.</p>
            </div>
            <div>
              <Link2Icon className="size-5 mx-auto text-muted-foreground" />
              <p className="mt-2 font-medium">Open source core</p>
              <p className="text-muted-foreground">The engine is public on GitHub. Run it yourself or let us host it.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center gap-3 text-muted-foreground text-xs">
          <span>© {YEAR} Sendprova · Email testing and preview</span>
          <nav className="sm:ml-auto flex gap-4">
            <a href="https://github.com/batuhanilgarr/Sendprova" target="_blank" rel="noreferrer" className="hover:text-foreground">
              GitHub
            </a>
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <Link href="/register" className="hover:text-foreground">
              Sign up
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}

async function AuthButtons() {
  await connection();
  const session = await getSession();
  if (session) {
    return (
      <Button size="sm" nativeButton={false} render={<Link href="/app" />}>
        Open app
      </Button>
    );
  }
  return (
    <>
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login" />}>
        Sign in
      </Button>
      <Button size="sm" nativeButton={false} render={<Link href="/register" />}>
        Sign up
      </Button>
    </>
  );
}
