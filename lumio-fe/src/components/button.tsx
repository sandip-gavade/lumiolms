import clsx from 'clsx';
import { forwardRef } from 'react';
import { Spinner } from './spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-brand-sm hover:bg-brand-700 disabled:hover:bg-brand-600',
  secondary:
    'bg-white text-brand-600 border border-brand-200 hover:bg-brand-50 disabled:hover:bg-white',
  ghost: 'bg-transparent text-ink-600 hover:bg-ink-100 disabled:hover:bg-transparent',
  danger: 'bg-danger-light text-danger-dark hover:bg-danger-lighter',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-[13px] rounded-[9px]',
  md: 'px-5 py-3 text-[14.5px] rounded-[11px]',
  lg: 'px-6 py-3.5 text-[15.5px] rounded-[11px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center gap-2 font-display font-bold cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...rest}
      >
        {loading && <Spinner size={16} className={variant === 'primary' ? 'text-white' : undefined} />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
