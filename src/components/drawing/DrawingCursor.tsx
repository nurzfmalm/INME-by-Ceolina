import { useEffect, useState } from "react";

interface DrawingCursorProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  color: string;
  size: number;
  isEraser: boolean;
  visible?: boolean;
}

/**
 * Кастомный курсор для рисования
 * Соответствует выбранному цвету и размеру кисти
 * Чёткое понимание, где пользователь рисует
 */
export const DrawingCursor = ({
  canvasRef,
  color,
  size,
  isEraser,
  visible = true
}: DrawingCursorProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Проверяем, находится ли курсор над холстом
      const isOverCanvas = 
        x >= 0 && x <= rect.width && 
        y >= 0 && y <= rect.height;
      
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(isOverCanvas && visible);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [canvasRef, visible]);

  if (!isVisible) return null;

  const cursorSize = Math.max(size, 8);

  return (
    <div
      className="fixed pointer-events-none z-50 transition-transform duration-[16ms]"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Внешний круг - граница */}
      <div
        className="rounded-full border-2"
        style={{
          width: `${cursorSize}px`,
          height: `${cursorSize}px`,
          borderColor: isEraser ? "#EF4444" : "rgba(255,255,255,0.9)",
          backgroundColor: isEraser ? "transparent" : color,
          boxShadow: isEraser 
            ? "inset 0 0 4px rgba(239, 68, 68, 0.5)"
            : "0 2px 8px rgba(0,0,0,0.2)",
        }}
      />
      
      {/* Перекрестие для ластика */}
      {isEraser && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[60%] h-0.5 bg-red-400 rounded-full" />
          <div className="absolute w-0.5 h-[60%] bg-red-400 rounded-full" />
        </div>
      )}
    </div>
  );
};
