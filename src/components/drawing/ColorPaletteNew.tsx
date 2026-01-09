import { useState } from "react";

export interface ColorItem {
  hex: string;
  name: string;
}

interface ColorPaletteNewProps {
  colors: ColorItem[];
  currentColor: string;
  onColorChange: (color: string) => void;
  className?: string;
}

/**
 * Минималистичная цветовая палитра
 * Аккуратные круглые кнопки с чётким индикатором выбора
 * Figma-стиль: чистый, понятный, удобный
 */
export const ColorPaletteNew = ({
  colors,
  currentColor,
  onColorChange,
  className = ""
}: ColorPaletteNewProps) => {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  return (
    <div className={`${className}`}>
      <div className="flex flex-wrap justify-center gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm">
        {colors.map((color) => {
          const isSelected = currentColor === color.hex;
          const isHovered = hoveredColor === color.hex;
          
          return (
            <button
              key={color.hex}
              onClick={() => onColorChange(color.hex)}
              onMouseEnter={() => setHoveredColor(color.hex)}
              onMouseLeave={() => setHoveredColor(null)}
              className={`
                relative w-11 h-11 rounded-full 
                transition-all duration-200 ease-out
                touch-manipulation
                ${isSelected 
                  ? "scale-110 shadow-lg" 
                  : isHovered 
                    ? "scale-105 shadow-md" 
                    : "shadow-sm hover:shadow-md"
                }
              `}
              style={{ 
                backgroundColor: color.hex,
                border: isSelected ? "3px solid white" : "2px solid rgba(255,255,255,0.6)",
                boxShadow: isSelected 
                  ? `0 0 0 3px ${color.hex}, 0 4px 12px ${color.hex}40`
                  : undefined
              }}
              aria-label={color.name}
              title={color.name}
            />
          );
        })}
      </div>
      
      {/* Подсказка с названием цвета */}
      {hoveredColor && (
        <div className="text-center mt-2 text-sm text-muted-foreground font-medium">
          {colors.find(c => c.hex === hoveredColor)?.name}
        </div>
      )}
    </div>
  );
};

/**
 * Базовая палитра для рисования
 * 9 чётких, различимых цветов
 */
export const DEFAULT_COLORS: ColorItem[] = [
  { hex: "#E74C3C", name: "Красный" },
  { hex: "#F39C12", name: "Оранжевый" },
  { hex: "#F1C40F", name: "Жёлтый" },
  { hex: "#27AE60", name: "Зелёный" },
  { hex: "#3498DB", name: "Синий" },
  { hex: "#9B59B6", name: "Фиолетовый" },
  { hex: "#E91E8C", name: "Розовый" },
  { hex: "#8B4513", name: "Коричневый" },
  { hex: "#2C3E50", name: "Чёрный" },
];
