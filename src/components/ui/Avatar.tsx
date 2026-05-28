import { cn } from '../../lib/utils';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ src, alt = '', size = 'md', className }: AvatarProps) {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const initials = alt 
    ? alt.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (!src) {
    return (
      <div className={cn(
        sizeClasses[size],
        'rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-medium text-xs',
        className
      )}>
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        sizeClasses[size],
        'rounded-full object-cover bg-zinc-100 dark:bg-zinc-800',
        className
      )}
    />
  );
}