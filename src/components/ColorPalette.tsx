/**
 * Улучшенная цветовая палитра для рисования
 * Визуально аккуратная, минималистичная, удобная
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ColorItem {
  name: string;
  color: string;
  emotion?: string;
  category?: string;
  note?: string;
}

interface ColorPaletteProps {
  colors: ColorItem[];
  currentColor: string;
  onColorSelect: (color: string) => void;
  compact?: boolean;
}

export const ColorPalette = ({
  colors,
  currentColor,
  onColorSelect,
  compact = false,
}: ColorPaletteProps) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [hoveredColor, setHoveredColor] = useState<ColorItem | null>(null);

  const selectedColorInfo = colors.find((c) => c.color === currentColor);

  return (
    <Card className="border-0 bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-900 dark:to-purple-950/30 shadow-lg overflow-hidden">
      {/* Заголовок */}
      <div
        className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Palette className="text-purple-600" size={20} />
            <div
              className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
              style={{ backgroundColor: currentColor }}
            />
          </div>
          <div>
            <h3 className="font-semibold text-sm">
              Палитра эмоций
            </h3>
            {selectedColorInfo && (
              <p className="text-xs text-muted-foreground">
                {selectedColorInfo.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {colors.length} цветов
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>
      </div>

      {/* Палитра */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Текущий цвет - превью */}
          {selectedColorInfo && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 p-3 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl shadow-lg border-4 border-white dark:border-slate-800 flex-shrink-0"
                  style={{ backgroundColor: currentColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{selectedColorInfo.name}</p>
                  {selectedColorInfo.emotion && (
                    <p className="text-xs text-muted-foreground">
                      Эмоция: {selectedColorInfo.emotion}
                    </p>
                  )}
                  {selectedColorInfo.note && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {selectedColorInfo.note}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Сетка цветов */}
          <div className="relative">
            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-14 xl:grid-cols-16 gap-2 max-h-48 overflow-y-auto p-2 bg-white dark:bg-slate-900 rounded-lg">
              {colors.map((item) => {
                const isSelected = currentColor === item.color;
                return (
                  <button
                    key={item.color}
                    onClick={() => onColorSelect(item.color)}
                    onMouseEnter={() => setHoveredColor(item)}
                    onMouseLeave={() => setHoveredColor(null)}
                    className={`
                      relative group transition-all duration-200
                      ${isSelected ? "scale-125 z-20" : "hover:scale-110 z-10"}
                      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                      rounded-full
                    `}
                    title={item.name}
                    aria-label={`Выбрать цвет ${item.name}`}
                  >
                    {/* Цветной круг */}
                    <div
                      className={`
                        w-9 h-9 rounded-full shadow-md
                        ${isSelected ? "shadow-lg" : ""}
                        transition-shadow duration-200
                      `}
                      style={{ backgroundColor: item.color }}
                    />

                    {/* Индикатор выбора */}
                    {isSelected && (
                      <>
                        <div className="absolute inset-0 rounded-full border-3 border-white dark:border-slate-800 animate-pulse" />
                        <div className="absolute inset-0 rounded-full border-2 border-purple-500" />
                      </>
                    )}

                    {/* Hover эффект */}
                    {!isSelected && (
                      <div className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-purple-300 transition-colors" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Hover tooltip */}
            {hoveredColor && !compact && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-30 pointer-events-none">
                <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs max-w-xs">
                  <p className="font-semibold">{hoveredColor.name}</p>
                  {hoveredColor.emotion && (
                    <p className="text-slate-300">Эмоция: {hoveredColor.emotion}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Счетчик использованных цветов */}
          {!compact && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Нажмите на цвет, чтобы начать рисовать
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
