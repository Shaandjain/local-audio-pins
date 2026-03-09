'use client';

import { motion } from 'framer-motion';

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
      {CATEGORIES.map(({ key, label }, i) => {
        const isActive = key === 'ALL' ? isAllSelected : selected.has(key);
        return (
          <motion.button
            key={key}
            onClick={() => handleToggle(key)}
            className={`relative flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150 ${
              isActive
                ? 'text-white'
                : 'bg-white/80 text-muted hover:bg-white hover:text-foreground border border-border'
            }`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
            whileTap={{ scale: 1.05 }}
          >
            {isActive && (
              <motion.div
                layoutId="activeCategory"
                className="absolute inset-0 bg-foreground rounded-full"
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
            )}
            <span className="relative z-10">{label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
