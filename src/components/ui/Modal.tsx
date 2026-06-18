import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  bodyClassName?: string;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, subtitle, children, footer, bodyClassName = 'p-6', maxWidth = 'max-w-3xl' }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-on-background/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-surface rounded-xl shadow-lg w-full ${maxWidth} flex flex-col overflow-hidden max-h-[90vh] border border-outline-variant`}>
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
          <div>
            <h3 className="text-headline-md font-semibold text-on-surface">{title}</h3>
            {subtitle && <p className="text-sm text-on-surface-variant mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={`overflow-y-auto flex-1 ${bodyClassName}`}>{children}</div>
        {footer && (
          <div className="p-6 border-t border-outline-variant bg-surface-container-lowest flex justify-end gap-sm">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
