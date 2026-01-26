import { useState, useRef, useEffect } from "react";
import { Pencil, Palette, Droplet } from "lucide-react";

interface BrushSize {
  size: number;
  label: string;
}

const BRUSH_SIZES: BrushSize[] = [
  { size: 20, label: "Толстый" },
  { size: 10, label: "Средний" },
  { size: 4, label: "Тонкий" },
];

interface ColorItem {
  hex: string;
  name: string;
}

const DEFAULT_COLORS: ColorItem[] = [
  { hex: "#3B82F6", name: "синий" },
  { hex: "#EF4444", name: "красный" },
  { hex: "#22C55E", name: "зелёный" },
  { hex: "#F59E0B", name: "жёлтый" },
  { hex: "#8B5CF6", name: "фиолетовый" },
  { hex: "#EC4899", name: "розовый" },
  { hex: "#06B6D4", name: "голубой" },
  { hex: "#F97316", name: "оранжевый" },
  { hex: "#000000", name: "чёрный" },
  { hex: "#6B7280", name: "серый" },
];

interface FigmaToolbarProps {
  currentColor: string;
  currentSize: number;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onBack: () => void;
}

type ActivePopup = "none" | "brush" | "palette";

/**
 * Минималистичная панель инструментов по дизайну Figma
 * Иконки снизу: карандаш, палитра, кисть
 * Popup для выбора толщины и цвета
 */
export const FigmaToolbar = ({
  currentColor,
  currentSize,
  onColorChange,
  onSizeChange,
  onBack,
}: FigmaToolbarProps) => {
  const [activePopup, setActivePopup] = useState<ActivePopup>("none");
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Закрытие popup при клике вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setActivePopup("none");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const togglePopup = (popup: ActivePopup) => {
    setActivePopup(activePopup === popup ? "none" : popup);
  };

  return (
    <div ref={toolbarRef} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      {/* Brush Size Popup */}
      {activePopup === "brush" && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl p-4 min-w-[180px] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="space-y-4">
            {BRUSH_SIZES.map((brush) => (
              <button
                key={brush.size}
                onClick={() => {
                  onSizeChange(brush.size);
                  setActivePopup("none");
                }}
                className={`
                  flex items-center gap-4 w-full p-2 rounded-xl transition-colors
                  ${currentSize === brush.size ? "bg-sky-50" : "hover:bg-gray-50"}
                `}
              >
                <div
                  className="rounded-full bg-sky-400"
                  style={{
                    width: brush.size * 1.5,
                    height: brush.size * 1.5,
                    minWidth: 8,
                    minHeight: 8,
                  }}
                />
                <span className="font-medium text-gray-700">{brush.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color Palette Popup */}
      {activePopup === "palette" && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="grid grid-cols-5 gap-3">
            {DEFAULT_COLORS.map((color) => (
              <button
                key={color.hex}
                onClick={() => {
                  onColorChange(color.hex);
                  setActivePopup("none");
                }}
                className={`
                  w-10 h-10 rounded-full transition-transform touch-manipulation
                  ${currentColor === color.hex ? "scale-125 ring-2 ring-sky-400 ring-offset-2" : "hover:scale-110"}
                `}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Toolbar */}
      <div className="flex items-center gap-2 bg-white rounded-full shadow-xl px-4 py-3">
        {/* Pencil/Drawing tool */}
        <button
          className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center transition-colors hover:bg-sky-200"
          title="Карандаш"
        >
          <Pencil size={24} className="text-sky-500" />
        </button>

        {/* Color Palette */}
        <button
          onClick={() => togglePopup("palette")}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center transition-colors
            ${activePopup === "palette" ? "bg-sky-100" : "bg-gray-50 hover:bg-gray-100"}
          `}
          title="Палитра"
        >
          <Palette size={24} className="text-gray-500" />
        </button>

        {/* Brush Size */}
        <button
          onClick={() => togglePopup("brush")}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center transition-colors
            ${activePopup === "brush" ? "bg-sky-100" : "bg-gray-50 hover:bg-gray-100"}
          `}
          title="Толщина кисти"
        >
          <Droplet size={24} className="text-sky-400" fill="currentColor" />
        </button>
      </div>
    </div>
  );
};

export { DEFAULT_COLORS as FIGMA_COLORS, BRUSH_SIZES };
