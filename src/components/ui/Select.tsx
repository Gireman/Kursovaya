import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  icon?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** `ghost` — borderless inline trigger (filter bars); `outlined` — bordered form field. */
  variant?: 'ghost' | 'outlined';
  /** Make a `ghost` trigger span the full width of its container. */
  block?: boolean;
  className?: string;
}

export function Select({
  icon,
  value,
  onChange,
  options,
  placeholder,
  variant = 'ghost',
  block = false,
  className = '',
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const updateRect = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  };

  useLayoutEffect(() => {
    if (open) updateRect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => updateRect();
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const label = selected ? selected.label : (placeholder ?? '');
  const isPlaceholder = !selected;

  const fullWidth = variant === 'outlined' || block;

  const triggerClass =
    variant === 'outlined'
      ? 'w-full flex items-center justify-between gap-2 rounded-lg border border-outline-variant p-2 bg-transparent hover:border-on-surface-variant focus:border-primary transition-colors cursor-pointer select-none'
      : `flex items-center gap-2 cursor-pointer select-none ${block ? 'w-full justify-between' : ''}`;

  const labelClass =
    `${variant === 'outlined' ? 'text-body-md flex-1 truncate' : `text-label-md ${block ? 'flex-1 truncate' : ''}`} ` +
    `${isPlaceholder ? 'text-on-surface-variant' : 'text-on-surface'}`;

  return (
    <div ref={triggerRef} className={`relative ${fullWidth ? 'w-full' : 'inline-block'} ${className}`}>
      <div className={triggerClass} onClick={() => setOpen((o) => !o)}>
        {icon && variant === 'ghost' && (
          <span className="material-symbols-outlined text-on-surface-variant">{icon}</span>
        )}
        <span className={labelClass}>{label}</span>
        <span
          className="material-symbols-outlined text-on-surface-variant pointer-events-none transition-transform"
          style={{ fontSize: 18, transform: open ? 'rotate(180deg)' : 'none' }}
        >
          expand_more
        </span>
      </div>
      {open && rect && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[60] bg-surface rounded-lg border border-outline-variant shadow-lg py-1 max-h-60 overflow-y-auto"
          style={{ top: rect.top, left: rect.left, width: fullWidth ? rect.width : undefined, minWidth: fullWidth ? undefined : Math.max(rect.width, 224) }}
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-body-md flex items-center justify-between gap-2 transition-colors ${
                  active ? 'bg-primary-container/30 text-on-surface' : 'text-on-surface hover:bg-surface-container'
                }`}
              >
                <span className="truncate">{o.label}</span>
                {active && (
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>check</span>
                )}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
