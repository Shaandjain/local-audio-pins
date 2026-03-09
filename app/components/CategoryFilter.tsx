'use client';

const CATEGORIES = [
  { key: 'ALL', label: 'All' },
  { key: 'GENERAL', label: 'General' },
  { key: 'FOOD', label: 'Food' },
  { key: 'HISTORY', label: 'History' },
  { key: 'NATURE', label: 'Nature' },
  { key: 'CULTURE', label: 'Culture' },
  { key: 'ARCHITECTURE', label: 'Architecture' },
] as const;

interface CategoryFilterProps {
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const handleToggle = (key: string) => {
    if (key === 'ALL') {
      onChange(new Set());
      return;
    }

    const next = new Set(selected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(next);
  };

  const isAllSelected = selected.size === 0;

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar">
      {CATEGORIES.map(({ key, label }) => {
        const isActive = key === 'ALL' ? isAllSelected : selected.has(key);
        return (
          <button
            key={key}
            onClick={() => handleToggle(key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
              isActive
                ? 'bg-foreground text-white'
                : 'bg-white/80 text-muted hover:bg-white hover:text-foreground border border-border'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
