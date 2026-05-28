import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, children, align = 'right', className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div className={cn(
          'absolute z-50 mt-2 w-56 rounded-xl bg-white dark:bg-zinc-900 shadow-lg border border-zinc-200 dark:border-zinc-800 py-1',
          align === 'right' ? 'right-0' : 'left-0',
          className
        )}>
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ 
  children, 
  onClick, 
  icon,
  danger 
}: { 
  children: React.ReactNode; 
  onClick?: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-colors',
        danger 
          ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' 
          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
      )}
    >
      {icon && <span className="text-zinc-400">{icon}</span>}
      {children}
    </button>
  );
}

export function DropdownDivider() {
  return <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />;
}