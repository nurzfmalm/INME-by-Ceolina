import { useRef, useEffect, forwardRef, useImperativeHandle, useState } from "react";

interface DrawingCanvasProps {
  onDrawStart?: (x: number, y: number) => void;
  onDraw?: (x: number, y: number) => void;
  onDrawEnd?: () => void;
  currentColor?: string;
  lineWidth?: number;
  disabled?: boolean;
  className?: string;
  backgroundColor?: string;
}

export interface DrawingCanvasRef {
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  clear: () => void;
  getDataURL: () => string;
}

// Тип для отслеживания нескольких касаний
interface TouchPoint {
  id: number;
  x: number;
  y: number;
}

/**
 * Максимальный холст для рисования
 * Занимает 75-80% экрана согласно ТЗ
 * Минимум отвлечений, максимум пространства для творчества
 */
export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({
  onDrawStart,
  onDraw,
  onDrawEnd,
  currentColor = "#000000",
  lineWidth = 8,
  disabled = false,
  className = "",
  backgroundColor = "#FFFEF7"
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Для поддержки multi-touch
  const activetouchesRef = useRef<Map<number, TouchPoint>>(new Map());

  useImperativeHandle(ref, () => ({
    canvas: canvasRef.current,
    ctx: canvasRef.current?.getContext("2d") || null,
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    },
    getDataURL: () => canvasRef.current?.toDataURL("image/png") || ""
  }));

  // Инициализация и resize холста
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const containerRect = container.getBoundingClientRect();
      // Холст занимает минимум 80% высоты экрана (увеличено с 70%)
      const minHeight = window.innerHeight * 0.8;
      const canvasHeight = Math.max(minHeight, containerRect.height);
      
      // Сохраняем текущее изображение
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx && canvas.width > 0) {
        tempCtx.drawImage(canvas, 0, 0);
      }
      
      canvas.width = containerRect.width;
      canvas.height = canvasHeight;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        // Восстанавливаем изображение
        if (tempCanvas.width > 0) {
          ctx.drawImage(tempCanvas, 0, 0);
        }
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [backgroundColor]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, touchId?: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      // Если указан touchId, найдем соответствующее касание
      if (touchId !== undefined) {
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === touchId) {
            return {
              x: e.touches[i].clientX - rect.left,
              y: e.touches[i].clientY - rect.top
            };
          }
        }
      }
      // Иначе берем первое касание
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
    return { x: 0, y: 0 };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault(); // Предотвращаем системное выделение и другие жесты

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Поддержка multi-touch
    if ('touches' in e) {
      // Обрабатываем все касания
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const { x, y } = getCoordinates(e, touch.identifier);

        activetouchesRef.current.set(touch.identifier, { id: touch.identifier, x, y });

        ctx.strokeStyle = currentColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(x, y);

        if (i === 0) onDrawStart?.(x, y);
      }
    } else {
      // Обработка мыши
      isDrawingRef.current = true;
      const { x, y } = getCoordinates(e);
      lastPointRef.current = { x, y };

      ctx.strokeStyle = currentColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x, y);

      onDrawStart?.(x, y);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault(); // Предотвращаем скролл и другие жесты

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Поддержка multi-touch
    if ('touches' in e) {
      // Обрабатываем все активные касания
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const prevTouch = activetouchesRef.current.get(touch.identifier);

        if (prevTouch) {
          const { x, y } = getCoordinates(e, touch.identifier);

          ctx.strokeStyle = currentColor;
          ctx.lineWidth = lineWidth;
          ctx.beginPath();
          ctx.moveTo(prevTouch.x, prevTouch.y);
          ctx.lineTo(x, y);
          ctx.stroke();

          activetouchesRef.current.set(touch.identifier, { id: touch.identifier, x, y });

          if (i === 0) onDraw?.(x, y);
        }
      }
    } else {
      // Обработка мыши
      if (!isDrawingRef.current || !lastPointRef.current) return;

      const { x, y } = getCoordinates(e);

      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);

      lastPointRef.current = { x, y };
      onDraw?.(x, y);
    }
  };

  const handleEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return;

    // Поддержка multi-touch
    if ('changedTouches' in e) {
      // Удаляем завершенные касания
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        activetouchesRef.current.delete(touch.identifier);
      }

      // Если все касания завершены
      if (activetouchesRef.current.size === 0) {
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) ctx.stroke();
        onDrawEnd?.();
      }
    } else {
      // Обработка мыши
      if (!isDrawingRef.current) return;

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) ctx.stroke();

      isDrawingRef.current = false;
      lastPointRef.current = null;
      onDrawEnd?.();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex-1 rounded-3xl overflow-hidden ${className}`}
      style={{
        backgroundColor,
        minHeight: "80vh" // Увеличено с 70vh до 80vh
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
        className="w-full h-full touch-none"
        style={{
          cursor: disabled ? "default" : "crosshair",
          touchAction: "none", // Отключаем все системные жесты
          WebkitUserSelect: "none", // Отключаем выделение текста (Safari)
          userSelect: "none", // Отключаем выделение текста
          WebkitTouchCallout: "none", // Отключаем контекстное меню (iOS)
          WebkitTapHighlightColor: "transparent" // Убираем подсветку при тапе
        }}
      />
    </div>
  );
});

DrawingCanvas.displayName = "DrawingCanvas";
