import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/20 ${className}`}
      {...props}
    />
  );
}
