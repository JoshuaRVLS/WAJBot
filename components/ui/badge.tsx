import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em]',
  {
    variants: {
      variant: {
        neutral: 'border-white/10 bg-white/8 text-[color:var(--muted-foreground)]',
        online: 'border-emerald-500/20 bg-emerald-500/12 text-emerald-300',
        connecting: 'border-amber-500/20 bg-amber-500/12 text-amber-200',
        error: 'border-rose-500/20 bg-rose-500/12 text-rose-200',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
