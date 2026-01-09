interface BrushOption {
  size: number;
  label: string;
}

interface BrushSizeSelectorProps {
  sizes: BrushOption[];
  currentSize: number;
  onSizeChange: (size: number) => void;
  currentColor: string;
  className?: string;
}

/**
 * Селектор размера кисти
 * Визуально показывает реальный размер линии
 */
export const BrushSizeSelector = ({
  sizes,
  currentSize,
  onSizeChange,
  currentColor,
  className = ""
}: BrushSizeSelectorProps) => {
  return (
    <div className={`flex items-center gap-2 p-2 bg-white/80 backdrop-blur-sm rounded-2xl ${className}`}>
      {sizes.map((option) => {
        const isSelected = currentSize === option.size;
        
        return (
          <button
            key={option.size}
            onClick={() => onSizeChange(option.size)}
            className={`
              flex flex-col items-center justify-center
              w-14 h-14 rounded-xl
              transition-all duration-200
              touch-manipulation
              ${isSelected 
                ? "bg-primary/10 ring-2 ring-primary shadow-sm" 
                : "bg-white hover:bg-gray-50"
              }
            `}
            title={option.label}
          >
            {/* Визуализация размера кисти */}
            <div 
              className="rounded-full transition-colors"
              style={{ 
                width: `${Math.min(option.size * 1.5, 32)}px`,
                height: `${Math.min(option.size * 1.5, 32)}px`,
                backgroundColor: isSelected ? currentColor : "#9CA3AF",
              }}
            />
            <span className="text-[10px] text-muted-foreground mt-1 font-medium">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export const DEFAULT_BRUSH_SIZES: BrushOption[] = [
  { size: 4, label: "Тонкая" },
  { size: 10, label: "Средняя" },
  { size: 20, label: "Толстая" },
];
