import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export function Card({ children, className, noPadding }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-[var(--border)] shadow-sm',
        !noPadding && 'p-6',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mb-4', className)}>{children}</div>
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-xl font-bold text-[var(--ink)]', className)}>{children}</h3>
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-sm text-[var(--muted)] mt-1', className)}>{children}</p>
}
