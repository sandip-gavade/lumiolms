export function EmptyState({
  icon = '📚',
  title,
  description,
  action,
  dashed = false,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  dashed?: boolean;
}) {
  return (
    <div
      className={`text-center py-16 px-5 rounded-2xl ${
        dashed ? 'border border-dashed border-ink-300 bg-white' : 'bg-white border border-ink-200'
      }`}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <div className="font-bold text-ink-700 text-base mb-1.5">{title}</div>
      {description && <div className="text-ink-400 text-sm mb-4">{description}</div>}
      {action}
    </div>
  );
}
