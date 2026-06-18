type BadgeVariant = 'success' | 'error' | 'info' | 'warning';

interface BadgeProps {
  variant: BadgeVariant;
  icon?: string;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-secondary/10 text-secondary border-secondary/20',
  error: 'bg-error/10 text-error border-error/20',
  info: 'bg-primary-container text-on-primary-container border-primary/20',
  warning: 'bg-tertiary/10 text-tertiary border-tertiary/20',
};

export function Badge({ variant, icon, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantClasses[variant]}`}
    >
      {icon && <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{icon}</span>}
      {children}
    </span>
  );
}
