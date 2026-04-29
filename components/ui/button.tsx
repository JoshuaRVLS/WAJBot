import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]',
  {
    variants: {
      variant: {
        default: 'bg-[color:var(--accent)] px-4 py-2.5 text-[color:var(--accent-foreground)] shadow-[0_12px_30px_rgba(255,91,46,0.24)] hover:translate-y-[-1px] hover:shadow-[0_18px_44px_rgba(255,91,46,0.32)]',
        secondary: 'bg-white/8 px-4 py-2.5 text-[color:var(--foreground)] ring-1 ring-white/12 hover:bg-white/12',
        ghost: 'px-3 py-2 text-[color:var(--muted-foreground)] hover:bg-white/8 hover:text-[color:var(--foreground)]',
        destructive: 'bg-[color:var(--danger)] px-4 py-2.5 text-white shadow-[0_12px_30px_rgba(255,92,92,0.28)] hover:bg-[color:var(--danger-strong)]',
      },
      size: {
        default: 'h-10',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-11 px-5 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
