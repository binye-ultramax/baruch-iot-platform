import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

export function MapResizeHandler() {
  const map = useMap()

  useEffect(() => {
    const invalidate = () => {
      window.requestAnimationFrame(() => {
        map.invalidateSize()
      })
    }

    invalidate()

    window.addEventListener('resize', invalidate)

    const container = map.getContainer().parentElement
    const observer =
      container &&
      new ResizeObserver(() => {
        invalidate()
      })

    if (container && observer) {
      observer.observe(container)
    }

    return () => {
      window.removeEventListener('resize', invalidate)
      observer?.disconnect()
    }
  }, [map])

  return null
}
