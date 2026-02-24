import { useState, useRef, useEffect } from "react";
import { Eraser, Pencil, Undo, Palette, Paintbrush, ChevronRight } from "lucide-react";

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

const BRUSH_SIZES = [
  { size: 20, label: "Толстый" },
  { size: 10, label: "Средний" },
  { size: 4, label: "Тонкий" },
];

type ActivePanel = "none" | "tool" | "color" | "size";

interface MediumToolbarProps {
  currentColor: string;
  currentSize: number;
  isEraser: boolean;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onEraserToggle: (eraser: boolean) => void;
  onUndo: () => void;
  canUndo: boolean;
}

export const MediumToolbar = ({
  currentColor,
  currentSize,
  isEraser,
  onColorChange,
  onSizeChange,
  onEraserToggle,
  onUndo,
  canUndo,
}: MediumToolbarProps) => {
  const [activePanel, setActivePanel] = useState<ActivePanel>("none");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActivePanel("none");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel(prev => prev === panel ? "none" : panel);
  };

  return (
    <div ref={containerRef} className="flex items-start gap-2 relative z-10">
      {/* Left menu buttons */}
      <div className="flex flex-col gap-2">
        {/* Выбрать инструмент */}
        <button
          onClick={() => togglePanel("tool")}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap ${
            activePanel === "tool" 
              ? "bg-sky-100 text-sky-700" 
              : "bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-white"
          }`}
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <Eraser size={16} className="text-sky-500" />
          <span>Выбрать инструмент</span>
          <ChevronRight size={14} className="ml-1 text-gray-400" />
        </button>

        {/* Выбрать цвет */}
        <button
          onClick={() => togglePanel("color")}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap ${
            activePanel === "color" 
              ? "bg-sky-100 text-sky-700" 
              : "bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-white"
          }`}
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <Palette size={16} className="text-sky-400" />
          <span>Выбрать цвет</span>
          <ChevronRight size={14} className="ml-1 text-gray-400" />
        </button>

        {/* Выбрать толщину */}
        <button
          onClick={() => togglePanel("size")}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap ${
            activePanel === "size" 
              ? "bg-sky-100 text-sky-700" 
              : "bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-white"
          }`}
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <Paintbrush size={16} className="text-sky-500" />
          <span>Выбрать толщину</span>
          <ChevronRight size={14} className="ml-1 text-gray-400" />
        </button>
      </div>

      {/* Popup panels */}
      {activePanel === "tool" && (
        <div className="absolute left-full ml-2 top-0 bg-white rounded-xl shadow-lg p-3 space-y-1 min-w-[140px]"
          style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
          <button
            onClick={() => { onEraserToggle(true); setActivePanel("none"); }}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
              isEraser ? "bg-sky-50 text-sky-600" : "hover:bg-gray-50 text-gray-600"
            }`}
          >
            <Eraser size={16} />
            <span>Ластик</span>
          </button>
          <button
            onClick={() => { onUndo(); setActivePanel("none"); }}
            disabled={!canUndo}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-gray-50 text-gray-600 disabled:opacity-40"
          >
            <Undo size={16} />
            <span>Вернуть</span>
          </button>
          <button
            onClick={() => { onEraserToggle(false); setActivePanel("none"); }}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
              !isEraser ? "bg-sky-50 text-sky-600" : "hover:bg-gray-50 text-gray-600"
            }`}
          >
            <Pencil size={16} />
            <span>Карандаш</span>
          </button>
        </div>
      )}

      {activePanel === "color" && (
        <div className="absolute left-full ml-2 top-0 bg-white rounded-xl shadow-lg p-3"
          style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
          <div className="grid grid-cols-3 gap-2">
            {FIGMA_COLORS.map((color) => (
              <button
                key={color.hex}
                onClick={() => { onColorChange(color.hex); onEraserToggle(false); setActivePanel("none"); }}
                className={`w-10 h-10 rounded-full transition-transform ${
                  currentColor === color.hex && !isEraser
                    ? "scale-110 ring-2 ring-offset-2 ring-sky-400"
                    : "hover:scale-105"
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      )}

      {activePanel === "size" && (
        <div className="absolute left-full ml-2 top-0 bg-white rounded-xl shadow-lg p-3 space-y-1 min-w-[140px]"
          style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
          {BRUSH_SIZES.map((brush) => (
            <button
              key={brush.size}
              onClick={() => { onSizeChange(brush.size); setActivePanel("none"); }}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                currentSize === brush.size ? "bg-sky-50 text-sky-600" : "hover:bg-gray-50 text-gray-600"
              }`}
            >
              <div
                className="rounded-full bg-sky-400"
                style={{
                  width: Math.min(brush.size * 1.2, 24),
                  height: Math.min(brush.size * 1.2, 24),
                }}
              />
              <span>{brush.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
