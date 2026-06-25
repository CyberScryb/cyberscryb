import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ 
  className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props 
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-mono text-xs font-bold uppercase tracking-widest transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-base disabled:pointer-events-none disabled:opacity-50 cursor-pointer';
  
  const variants = {
    primary: 'bg-accent text-white hover:bg-hover border border-accent/20 shadow-[0_0_12px_var(--color-accent-glow)] hover:shadow-[0_0_15px_var(--color-hover-glow)] hover:scale-[1.01] active:scale-[0.99]',
    secondary: 'bg-elevated border border-strong text-muted hover:text-primary hover:border-subtle hover:bg-surface hover:scale-[1.01] active:scale-[0.99]',
    ghost: 'hover:bg-surface hover:text-primary text-muted',
    destructive: 'bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20 active:scale-[0.99]'
  };

  const sizes = {
    sm: 'h-8 px-3 text-[10px]',
    md: 'h-10 px-4 py-2 text-xs',
    lg: 'h-12 px-8 text-sm',
    icon: 'h-9 w-9 text-xs',
  };

  return (
    <button 
      ref={ref} 
      className={cn(baseStyles, variants[variant], sizes[size], className)} 
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" />}
      {!isLoading && leftIcon && <span className="mr-2 inline-flex shrink-0">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2 inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
});

Button.displayName = 'Button';
