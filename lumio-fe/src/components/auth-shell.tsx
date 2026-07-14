export function AuthShell({
  children,
  side,
}: {
  children: React.ReactNode;
  side: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap min-h-screen">
      <div className="flex-1 basis-[440px] flex items-center justify-center p-8 sm:p-12 lg:p-16 bg-white">
        <div className="w-full max-w-[380px] animate-fadeUp">
          <a href="/login" className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <svg width="17" height="17" viewBox="0 0 24 24">
                <path d="M8 5.5v13l11-6.5-11-6.5z" fill="#fff" />
              </svg>
            </div>
            <span className="font-display font-extrabold text-[22px] tracking-tight text-ink-800">
              lumio
            </span>
          </a>
          {children}
        </div>
      </div>
      <div className="flex-1 basis-[440px] relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-500 to-brand-400 flex items-center justify-center p-8 sm:p-12 lg:p-[72px] min-h-[320px]">
        <div className="absolute w-[420px] h-[420px] rounded-full bg-white/[0.08] -top-[120px] -right-[120px]" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-white/[0.07] -bottom-[100px] -left-[80px]" />
        <div className="relative max-w-[420px] text-white">{side}</div>
      </div>
    </div>
  );
}
