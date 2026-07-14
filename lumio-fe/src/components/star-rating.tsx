import { Star } from 'lucide-react';
import clsx from 'clsx';

export function StarRating({
  rating,
  size = 14,
  showValue = false,
}: {
  rating: number;
  size?: number;
  showValue?: boolean;
}) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-1">
      {showValue && <span className="font-bold text-amber-700 text-[13.5px]">{rating.toFixed(1)}</span>}
      <span className="inline-flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={size}
            className={clsx(i < rounded ? 'text-amber-500 fill-amber-500' : 'text-ink-200 fill-ink-200')}
          />
        ))}
      </span>
    </span>
  );
}

export function InteractiveStarRating({
  value,
  onChange,
  size = 26,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(starValue)}
            className="cursor-pointer"
            aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
          >
            <Star
              size={size}
              className={clsx(
                starValue <= value ? 'text-amber-500 fill-amber-500' : 'text-ink-200 fill-ink-200',
              )}
            />
          </button>
        );
      })}
    </span>
  );
}
