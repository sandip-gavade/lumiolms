import clsx from 'clsx';

export function ProgressBar({
  percent,
  className,
  trackClassName,
}: {
  percent: number;
  className?: string;
  trackClassName?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={clsx('h-2 bg-brand-50 rounded-full overflow-hidden', trackClassName)}>
      <div
        className={clsx('h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700', className)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
