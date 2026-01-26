import { useState } from "react";
import { Pencil, Eraser, RotateCcw, ArrowLeft } from "lucide-react";

interface DrawingColor {
  hex: string;
  name: string;
}

const FIGMA_COLORS: DrawingColor[] = [
  { hex: "#EF4444", name: "красный" },
  { hex: "#F97316", name: "оранжевый" },
  { hex: "#EAB308", name: "жёлтый" },
  { hex: "#22C55E", name: "зелёный" },
  { hex: "#3B82F6", name: "синий" },
  { hex: "#8B5CF6", name: "фиолетовый" },
  { hex: "#EC4899", name: "розовый" },
  { hex: "#92400E", name: "коричневый" },
  { hex: "#1F2937", name: "тёмный" },
];

interface BrushSize {
  size: number;
  label: string;
}

const BRUSH_SIZES: BrushSize[] = [
  { size: 20, label: "Толстый" },
  { size: 10, label: "Средний" },
  { size: 4, label: "Тонкий" },
];

type Tool = "pencil" | "eraser";

interface SideToolbarProps {
  currentColor: string;
  currentSize: number;
  currentTool: Tool;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onToolChange: (tool: Tool) => void;
  onUndo: () => void;
  onBack: () => void;
  canUndo: boolean;
}

/**
 * Боковая панель инструментов по дизайну Figma (уровень 3)
 * Справа от холста: инструменты, цвета, толщина
 */
export const SideToolbar = ({
  currentColor,
  currentSize,
  currentTool,
  onColorChange,
  onSizeChange,
  onToolChange,
  onUndo,
  onBack,
  canUndo,
}: SideToolbarProps) => {
  return (
    <div className="w-48 bg-white rounded-2xl shadow-lg p-4 flex flex-col gap-4">
      {/* Инструменты */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Инструменты</h3>
        <div className="space-y-2">
          <button
            onClick={() => onToolChange("eraser")}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-colors ${
              currentTool === "eraser" 
                ? "bg-sky-100 text-sky-600" 
                : "hover:bg-gray-50 text-gray-600"
            }`}
          >
            <Eraser size={18} />
            <span className="text-sm">Ластик</span>
          </button>
          
          <button
            onClick={() => onToolChange("pencil")}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-colors ${
              currentTool === "pencil" 
                ? "bg-sky-100 text-sky-600" 
                : "hover:bg-gray-50 text-gray-600"
            }`}
          >
            <Pencil size={18} />
            <span className="text-sm">Карандаш</span>
          </button>
        </div>
      </div>

      {/* Цвета */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Цвета</h3>
        <div className="grid grid-cols-3 gap-2">
          {FIGMA_COLORS.map((color) => (
            <button
              key={color.hex}
              onClick={() => {
                onColorChange(color.hex);
                onToolChange("pencil");
              }}
              className={`w-10 h-10 rounded-full transition-transform ${
                currentColor === color.hex && currentTool === "pencil"
                  ? "scale-110 ring-2 ring-offset-2 ring-sky-400" 
                  : "hover:scale-105"
              }`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Толщина */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Толщина</h3>
        <div className="space-y-2">
          {BRUSH_SIZES.map((brush) => (
            <button
              key={brush.size}
              onClick={() => onSizeChange(brush.size)}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-colors ${
                currentSize === brush.size
                  ? "bg-sky-50" 
                  : "hover:bg-gray-50"
              }`}
            >
              <div
                className="rounded-full bg-sky-400"
                style={{
                  width: Math.min(brush.size * 1.2, 24),
                  height: Math.min(brush.size * 1.2, 24),
                }}
              />
              <span className="text-sm text-gray-700">{brush.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export { FIGMA_COLORS, BRUSH_SIZES };
export type { Tool };
