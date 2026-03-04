import { SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: { value: string; label: string }[]
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-semibold text-[var(--ink2)]">
            {label}
            {props.required && <span className="text-[var(--red)] ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 rounded-lg border border-[var(--border)]',
            'bg-white text-[var(--ink)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--blue)] focus:border-transparent',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            error && 'border-[var(--red)] focus:ring-[var(--red)]',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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

Select.displayName = 'Select'

export { Select }
