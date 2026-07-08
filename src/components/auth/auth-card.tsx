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
    <div className="fixed inset-0 grid place-items-center bg-gradient-to-b from-[#eef4f6] via-teal-soft to-[#cfe9f2] p-4">
      <div className="w-[380px] max-w-[92vw] rounded-[22px] bg-card p-8 shadow-card">
        <div className="mx-auto mb-3.5 grid h-[46px] w-[46px] place-items-center rounded-[14px] bg-gradient-to-br from-teal to-[#0b6f88] text-xl text-white">
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
