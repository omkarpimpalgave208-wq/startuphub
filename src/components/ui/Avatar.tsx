import { cn } from '../../lib/utils';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ src, alt = '', size = 'md', className }: AvatarProps) {
  const sizeClasses = {
    xs: 'w-6 h-6 min-w-[24px] min-h-[24px]',
    sm: 'w-8 h-8 min-w-[32px] min-h-[32px]',
    md: 'w-10 h-10 min-w-[40px] min-h-[40px]',
    lg: 'w-12 h-12 min-w-[48px] min-h-[48px]',
    xl: 'w-20 h-20 min-w-[80px] min-h-[80px]' // w-20 is 80px
  };

  const initials = alt 
    ? alt.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div
      className={cn(
        sizeClasses[size],
        'rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800',
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover object-center"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-medium text-xs">
          {initials}
        </div>
      )}
    </div>
  );
}