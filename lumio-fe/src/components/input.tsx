import clsx from 'clsx';
import { forwardRef } from 'react';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={clsx(
        'w-full border border-ink-200 rounded-[11px] px-3.5 py-3 text-[15px] outline-none transition-shadow',
        'focus:border-brand-600 focus:shadow-[0_0_0_3px_#EEF2FF]',
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...rest }, ref) => (
  <textarea
    ref={ref}
    className={clsx(
      'w-full border border-ink-200 rounded-xl px-3.5 py-3 text-[14.5px] outline-none transition-shadow resize-y',
      'focus:border-brand-600 focus:shadow-[0_0_0_3px_#EEF2FF]',
      className,
    )}
    {...rest}
  />
));
Textarea.displayName = 'Textarea';

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-semibold text-ink-700 mb-1.5">{children}</label>;
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="text-[12.5px] text-danger mt-1.5">{children}</p>;
}
