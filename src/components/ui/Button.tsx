import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-white text-black hover:bg-neutral-200',
  secondary: 'bg-neutral-800 text-white hover:bg-neutral-700',
  danger: 'bg-red-600 text-white hover:bg-red-500',
  ghost: 'bg-transparent text-white hover:bg-white/10',
};

export function Button({ children, variant = 'secondary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded px-2 py-1 text-sm font-medium transition ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
