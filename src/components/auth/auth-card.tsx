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
    <div className="fixed inset-0 grid place-items-center overflow-hidden bg-gradient-to-br from-[#eaf3f4] via-teal-soft to-[#cfe4f2] p-4">
      {/* soft ambient glows */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-teal/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-violet/20 blur-3xl" />
      <div className="relative w-[380px] max-w-[92vw] animate-fade-up rounded-xl2 border border-white/70 bg-card/95 p-8 shadow-lift backdrop-blur-sm">
        <div className="mx-auto mb-3.5 grid h-[48px] w-[48px] place-items-center rounded-[14px] bg-brand-teal text-xl text-white shadow-glow">
          ◆
        </div>
        <h1 className="text-center font-display text-xl">{title}</h1>
        {subtitle && (
          <p className="mb-5 mt-1 text-center text-[12.5px] leading-relaxed text-slate">
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
