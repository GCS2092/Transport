import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-semibold text-[var(--ink2)]">
            {label}
            {props.required && <span className="text-[var(--red)] ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 rounded-lg border border-[var(--border)]',
            'bg-white text-[var(--ink)] placeholder:text-[var(--muted)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--blue)] focus:border-transparent',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            error && 'border-[var(--red)] focus:ring-[var(--red)]',
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-[var(--muted)]">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-[var(--red)]">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
