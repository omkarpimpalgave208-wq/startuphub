import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'outline';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    primary: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    secondary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    outline: 'border border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300'
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}