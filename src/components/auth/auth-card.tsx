import { Icon } from "@/components/ui/icons";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — always the teal gradient (brand-constant across themes). */}
      <aside className="relative hidden overflow-hidden bg-brand-teal-strong px-12 py-12 text-white md:flex md:flex-col md:justify-between">
        {/* ambient depth */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-[-6rem] h-[26rem] w-[26rem] rounded-full bg-violet/30 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />

        <div className="relative flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-white/15 text-lg backdrop-blur-sm">
            ◆
          </span>
          <span className="font-display text-[18px] font-bold tracking-tight">MediaChat</span>
        </div>

        <div className="relative max-w-[26rem]">
          <h2 className="font-display text-[30px] font-bold leading-[1.15] tracking-tight">
            Create, tag, and ship content — from one chat.
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-white/80">
            A chat-first studio for your whole team. Generate drafts, save and tag them by
            person and platform, then browse everything in one filterable library.
          </p>
          <ul className="mt-8 space-y-3.5">
            {[
              { icon: "home" as const, text: "Generate blog posts, thumbnails & scripts in chat" },
              { icon: "images" as const, text: "Save & tag by creator, type, and platform" },
              { icon: "approved" as const, text: "Review, approve, and schedule — together" },
            ].map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-[13.5px] text-white/90">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-white/15 backdrop-blur-sm">
                  <Icon name={f.icon} size={16} />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-[12px] text-white/60">© 2026 MSquare · MediaChat Studio</div>
      </aside>

      {/* Form side */}
      <main className="relative grid place-items-center bg-bg px-5 py-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-16 top-1/4 h-72 w-72 rounded-full bg-teal/10 blur-3xl" />
        </div>
        <div className="relative w-[400px] max-w-full animate-fade-up">
          {/* Compact brand mark for mobile (the panel is hidden there) */}
          <div className="mb-5 flex items-center justify-center gap-2 md:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-brand-teal text-white shadow-glow-sm">
              ◆
            </span>
            <span className="font-display text-[16px] font-bold">MediaChat</span>
          </div>

          <div className="rounded-xl2 border border-line/70 bg-card p-8 shadow-card">
            <h1 className="font-display text-[22px] tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mb-6 mt-1 text-[13px] leading-relaxed text-slate">{subtitle}</p>
            )}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
