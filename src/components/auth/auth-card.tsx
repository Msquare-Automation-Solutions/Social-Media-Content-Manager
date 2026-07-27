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
    <div
      className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-10"
      style={{
        backgroundImage:
          "linear-gradient(155deg, #12b39f 0%, #0b7d71 26%, #084b44 52%, #05201d 78%, #020707 100%)",
      }}
    >
      {/* Ambient depth over the gradient. */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-[-8rem] h-[30rem] w-[30rem] rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />

      <div className="relative w-[400px] max-w-full animate-fade-up">
        {/* Brand mark, centered above the card. */}
        <div className="mb-6 flex flex-col items-center gap-2.5 text-white">
          <span className="grid h-12 w-12 place-items-center rounded-[15px] bg-white/15 text-xl shadow-glow-sm backdrop-blur-sm">
            ◆
          </span>
          <span className="font-display text-[17px] font-bold tracking-tight">
            Social Media Content Manager
          </span>
        </div>

        <div className="rounded-xl2 border border-line/70 bg-card p-8 shadow-lift">
          <h1 className="font-display text-[22px] tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mb-6 mt-1 text-[13px] leading-relaxed text-slate">{subtitle}</p>
          )}
          {children}
        </div>

        <div className="mt-6 space-y-0.5 text-center text-[11.5px] text-white/55">
          <div>
            Built by <span className="font-semibold text-white/80">Msquare Automation Solutions</span>
          </div>
          <div className="text-white/40">© 2026 · Social Media Content Manager</div>
        </div>
      </div>
    </div>
  );
}
