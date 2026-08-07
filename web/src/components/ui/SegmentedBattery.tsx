interface SegmentedBatteryProps {
  percent: number
  segments?: number
}

export function SegmentedBattery({ percent, segments = 6 }: SegmentedBatteryProps) {
  const filledSegments = Math.round((percent / 100) * segments)

  return (
    <div className="flex gap-1">
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          className={`h-3 flex-1 rounded-sm ${
            i < filledSegments ? 'bg-primary' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
}
