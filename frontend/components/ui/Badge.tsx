import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  className?: string
}

const variantStyles = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-[var(--green-light)] text-[var(--green)]',
  warning: 'bg-[var(--amber-light)] text-[var(--amber)]',
  error: 'bg-[var(--red-light)] text-[var(--red)]',
  info: 'bg-[var(--blue-light)] text-[var(--blue)]',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function ReservationStatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'warning' | 'info' | 'default' | 'success' | 'error'> = {
    EN_ATTENTE: 'warning',
    ASSIGNEE: 'info',
    EN_COURS: 'default',
    TERMINEE: 'success',
    ANNULEE: 'error',
  }

  const labels: Record<string, string> = {
    EN_ATTENTE: 'En attente',
    ASSIGNEE: 'Assignée',
    EN_COURS: 'En cours',
    TERMINEE: 'Terminée',
    ANNULEE: 'Annulée',
  }

  return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>
}
