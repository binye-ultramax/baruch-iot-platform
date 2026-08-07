interface ProgressBarProps {
  value: number
  className?: string
  barClassName?: string
}

export function ProgressBar({ value, className = '', barClassName = 'bg-primary' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-gray-100 ${className}`}>
      <div
        className={`h-full rounded-full transition-all ${barClassName}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
