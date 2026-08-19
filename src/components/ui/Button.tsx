import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
type Size = 'sm' | 'md' | 'lg';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
};

const variants: Record<Variant, string> = {
  primary: 'bg-fuchsia-600 text-white hover:bg-fuchsia-700 active:bg-fuchsia-800 shadow-sm shadow-fuchsia-600/20',
  secondary: 'bg-white text-fuchsia-700 border border-fuchsia-200 hover:bg-fuchsia-50 active:bg-fuchsia-100',
  ghost: 'bg-transparent text-fuchsia-700 hover:bg-fuchsia-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800',
  outline: 'bg-transparent text-gray-700 border border-gray-300 hover:bg-gray-50',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-xl',
  md: 'h-11 px-4 text-sm rounded-2xl',
  lg: 'h-14 px-6 text-base rounded-2xl',
};

export function Button({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none select-none ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
