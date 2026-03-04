import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all',
          'disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-[var(--blue)] text-white hover:bg-[#1d4ed8] shadow-sm': variant === 'primary',
            'bg-white text-[var(--ink)] border border-[var(--border)] hover:bg-gray-50': variant === 'secondary',
            'border-2 border-[var(--blue)] text-[var(--blue)] hover:bg-[var(--blue-light)]': variant === 'outline',
            'text-[var(--ink2)] hover:bg-gray-100': variant === 'ghost',
          },
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2.5 text-base': size === 'md',
            'px-6 py-3.5 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
