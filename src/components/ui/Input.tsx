import type { InputHTMLAttributes, ReactNode } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  icon?: ReactNode;
};

export function Input({ label, hint, icon, className = '', ...rest }: Props) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</span>}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        )}
        <input
          {...rest}
          className={`w-full h-12 rounded-2xl border border-gray-200 bg-white px-4 text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100 ${icon ? 'pl-10' : ''} ${className}`}
        />
      </div>
      {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    </label>
  );
}
