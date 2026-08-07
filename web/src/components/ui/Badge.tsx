interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'muted'
}

export function Badge({ children, variant = 'primary' }: BadgeProps) {
  const styles =
    variant === 'primary'
      ? 'bg-primary text-white'
      : 'bg-gray-100 text-gray-700'

  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-sm font-medium ${styles}`}>
      {children}
    </span>
  )
}
