import type { CSSProperties, ReactNode } from 'react'

type ResizeDirection = 'vertical' | 'horizontal' | 'both'

interface ResizableBlockProps {
  children: ReactNode
  direction?: ResizeDirection
  defaultSize?: { width?: number; height?: number }
  minSize?: { width?: number; height?: number }
  maxSize?: { width?: number; height?: number }
  className?: string
}

const resizeClasses: Record<ResizeDirection, string> = {
  vertical: 'resize-y',
  horizontal: 'resize-x',
  both: 'resize',
}

export function ResizableBlock({
  children,
  direction = 'vertical',
  defaultSize,
  minSize,
  maxSize,
  className = '',
}: ResizableBlockProps) {
  const style: CSSProperties = {
    width: defaultSize?.width,
    height: defaultSize?.height,
    minWidth: minSize?.width,
    minHeight: minSize?.height,
    maxWidth: maxSize?.width,
    maxHeight: maxSize?.height,
  }

  return (
    <div
      className={`overflow-auto ${resizeClasses[direction]} ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}
