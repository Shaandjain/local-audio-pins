'use client';

interface SelectionPanelProps {
  pinCount: number;
  onGenerateTour: () => void;
  onClear: () => void;
  onExit: () => void;
  isGenerating?: boolean;
}

export default function SelectionPanel({
  pinCount,
  onGenerateTour,
  onClear,
  onExit,
  isGenerating = false,
}: SelectionPanelProps) {
  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 animate-slide-up">
      <div className="bg-white rounded-2xl px-5 py-3.5 border border-border"
           style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)' }}>
        <div className="flex items-center gap-4">
          {/* Pin Count */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-foreground rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">{pinCount}</span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {pinCount === 1 ? 'pin' : 'pins'} selected
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-border" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onGenerateTour}
              disabled={pinCount === 0 || isGenerating}
              className={`btn-primary text-sm px-4 py-2 rounded-full ${
                pinCount === 0 || isGenerating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                'Generate Tour'
              )}
            </button>

            <button
              onClick={onClear}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-hover transition-all duration-200"
              aria-label="Redraw selection"
              title="Redraw"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>

            <button
              onClick={onExit}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-hover transition-all duration-200"
              aria-label="Exit selection mode"
              title="Exit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
