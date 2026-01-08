import { Button } from "@/components/ui/button";
import { 
  Home, 
  RotateCcw, 
  Save, 
  Trash2, 
  Eraser,
  Undo,
  ChevronRight,
  Check
} from "lucide-react";

type ToolAction = 
  | "back"
  | "clear"
  | "save"
  | "eraser"
  | "undo"
  | "next"
  | "repeat"
  | "check";

interface ToolButton {
  action: ToolAction;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: "primary" | "secondary" | "outline";
}

interface MinimalToolbarProps {
  buttons: ToolButton[];
  className?: string;
}

const TOOL_ICONS: Record<ToolAction, React.ReactNode> = {
  back: <Home size={28} />,
  clear: <Trash2 size={28} />,
  save: <Save size={28} />,
  eraser: <Eraser size={28} />,
  undo: <Undo size={28} />,
  next: <ChevronRight size={28} />,
  repeat: <RotateCcw size={28} />,
  check: <Check size={28} />
};

/**
 * Минимальная панель инструментов
 * Крупные кнопки без текста — только иконки
 * Одна кнопка = одно действие
 */
export const MinimalToolbar = ({ buttons, className = "" }: MinimalToolbarProps) => {
  return (
    <div className={`flex gap-3 justify-center ${className}`}>
      {buttons.map((btn, idx) => {
        const isPrimary = btn.variant === "primary";
        const isSecondary = btn.variant === "secondary";
        
        return (
          <Button
            key={idx}
            variant={isPrimary ? "default" : isSecondary ? "secondary" : "outline"}
            size="lg"
            onClick={btn.onClick}
            disabled={btn.disabled}
            className={`
              w-16 h-16 rounded-2xl p-0
              transition-all duration-300
              ${btn.active ? "ring-4 ring-primary/50 scale-110" : ""}
              ${isPrimary ? "bg-primary hover:bg-primary/90" : ""}
            `}
            aria-label={btn.action}
          >
            {TOOL_ICONS[btn.action]}
          </Button>
        );
      })}
    </div>
  );
};
