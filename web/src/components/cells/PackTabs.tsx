interface PackTabsProps {
  packs: { label: string }[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export function PackTabs({ packs, selectedIndex, onSelect }: PackTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {packs.map((pack, index) => (
        <button
          key={pack.label}
          type="button"
          onClick={() => onSelect(index)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedIndex === index
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {pack.label}
        </button>
      ))}
    </div>
  )
}
