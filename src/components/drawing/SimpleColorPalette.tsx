import { useState } from "react";

interface ColorItem {
  hex: string;
  name: string;
  category?: "warm" | "cool" | "neutral";
}

interface SimpleColorPaletteProps {
  colors: ColorItem[];
  currentColor: string;
  onColorChange: (color: string) => void;
  compact?: boolean;
  className?: string;
}

/**
 * Структурированная палитра цветов
 * Крупные цветовые элементы, чёткое различие
 * Направляет выбор, не провоцирует хаос
 */
export const SimpleColorPalette = ({
  colors,
  currentColor,
  onColorChange,
  compact = false,
  className = ""
}: SimpleColorPaletteProps) => {
  const [expanded, setExpanded] = useState(!compact);

  // Группируем цвета по категориям если есть
  const warmColors = colors.filter(c => c.category === "warm");
  const coolColors = colors.filter(c => c.category === "cool");
  const neutralColors = colors.filter(c => c.category === "neutral");
  const ungrouped = colors.filter(c => !c.category);

  const renderColorButton = (color: ColorItem) => {
    const isSelected = currentColor === color.hex;
    
    return (
      <button
        key={color.hex}
        onClick={() => onColorChange(color.hex)}
        className={`
          rounded-full transition-all duration-300 touch-manipulation
          ${compact ? "w-10 h-10" : "w-12 h-12"}
          ${isSelected ? "scale-125 ring-4 ring-white shadow-lg z-10" : "hover:scale-110"}
        `}
        style={{ 
          backgroundColor: color.hex,
          boxShadow: isSelected ? `0 0 20px ${color.hex}80` : undefined
        }}
        aria-label={color.name}
        title={color.name}
      />
    );
  };

  // Простой вариант — все цвета в ряд
  if (ungrouped.length > 0 || (warmColors.length === 0 && coolColors.length === 0)) {
    const allColors = ungrouped.length > 0 ? ungrouped : colors;
    
    return (
      <div className={`${className}`}>
        {compact && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full py-2 text-center text-muted-foreground text-sm"
          >
            {expanded ? "Скрыть цвета" : "Показать цвета"}
          </button>
        )}
        
        {(!compact || expanded) && (
          <div className="flex justify-center gap-2 flex-wrap py-2 px-4">
            {allColors.map(renderColorButton)}
          </div>
        )}
      </div>
    );
  }

  // Сгруппированный вариант
  return (
    <div className={`space-y-3 ${className}`}>
      {warmColors.length > 0 && (
        <div className="flex justify-center gap-2 flex-wrap">
          {warmColors.map(renderColorButton)}
        </div>
      )}
      
      {coolColors.length > 0 && (
        <div className="flex justify-center gap-2 flex-wrap">
          {coolColors.map(renderColorButton)}
        </div>
      )}
      
      {neutralColors.length > 0 && (
        <div className="flex justify-center gap-2 flex-wrap">
          {neutralColors.map(renderColorButton)}
        </div>
      )}
    </div>
  );
};

/**
 * Базовая терапевтическая палитра
 * 10 спокойных цветов без неона и кислотных оттенков
 */
export const THERAPEUTIC_COLORS: ColorItem[] = [
  { hex: "#F9E79F", name: "жёлтый", category: "warm" },
  { hex: "#F5CBA7", name: "персиковый", category: "warm" },
  { hex: "#F5B7B1", name: "розовый", category: "warm" },
  { hex: "#F8C8B8", name: "коралловый", category: "warm" },
  { hex: "#ABEBC6", name: "зелёный", category: "cool" },
  { hex: "#A9DFBF", name: "мятный", category: "cool" },
  { hex: "#AED6F1", name: "голубой", category: "cool" },
  { hex: "#D7BDE2", name: "сиреневый", category: "cool" },
  { hex: "#E8DAEF", name: "лавандовый", category: "neutral" },
  { hex: "#D5DBDB", name: "серый", category: "neutral" },
];
