import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Home, RotateCcw, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId, isUserAuthenticated } from "@/lib/auth-helpers";
import ceolinaCharacter from "@/assets/ceolina-character.png";

interface GuidedDrawingProps {
  onBack: () => void;
  childName: string;
  childId?: string;
}

interface ShapeScenario {
  id: string;
  nameRu: string;
  watchText: string;
  doText: string;
  completionText: string;
  getPoints: (w: number, h: number) => Point[];
}

interface Point {
  x: number;
  y: number;
}

interface AnalyticsData {
  strokeCount: number;
  colorChanges: string[];
  strokeSpeeds: number[];
  strokeReturns: number;
  strokeLengths: number[];
  startTime: number;
  endTime: number;
}

type Stage = "watch" | "do";

// Спокойная пастельная палитра - 10 цветов без неона
// Выбор цвета = данные об эмоциональном состоянии
const CALM_COLORS = [
  { hex: "#F9E79F", name: "жёлтый" },
  { hex: "#F5CBA7", name: "персиковый" },
  { hex: "#F5B7B1", name: "розовый" },
  { hex: "#ABEBC6", name: "зелёный" },
  { hex: "#AED6F1", name: "голубой" },
  { hex: "#D7BDE2", name: "сиреневый" },
  { hex: "#F8C8B8", name: "коралловый" },
  { hex: "#A9DFBF", name: "мятный" },
  { hex: "#E8DAEF", name: "лавандовый" },
  { hex: "#D5DBDB", name: "серый" },
];

// Сценарии фигур
const SCENARIOS: ShapeScenario[] = [
  {
    id: "sun",
    nameRu: "Солнце",
    watchText: "Смотри. Это солнце. Сначала круг, потом лучики",
    doText: "Теперь ты",
    completionText: "Ты нарисовал линию",
    getPoints: (w, h) => {
      const cx = w / 2, cy = h / 2;
      const radius = Math.min(w, h) * 0.12;
      const points: Point[] = [];
      // Круг
      for (let i = 0; i <= 40; i++) {
        const angle = (i / 40) * Math.PI * 2;
        points.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
      }
      // Лучи
      const innerR = radius * 1.2;
      const outerR = radius * 2;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
        points.push({ x: cx + Math.cos(angle) * innerR, y: cy + Math.sin(angle) * innerR });
        points.push({ x: cx + Math.cos(angle) * outerR, y: cy + Math.sin(angle) * outerR });
        points.push({ x: cx + Math.cos(angle) * innerR, y: cy + Math.sin(angle) * innerR });
      }
      return points;
    }
  },
  {
    id: "house",
    nameRu: "Домик",
    watchText: "Смотри. Это домик. Сначала стены, потом крыша",
    doText: "Теперь ты",
    completionText: "Ты нарисовал линию",
    getPoints: (w, h) => {
      const cx = w / 2, cy = h / 2;
      const size = Math.min(w, h) * 0.25;
      return [
        // Стены
        { x: cx - size/2, y: cy - size/4 },
        { x: cx + size/2, y: cy - size/4 },
        { x: cx + size/2, y: cy + size/2 },
        { x: cx - size/2, y: cy + size/2 },
        { x: cx - size/2, y: cy - size/4 },
        // Крыша
        { x: cx, y: cy - size/2 - size/4 },
        { x: cx + size/2, y: cy - size/4 },
      ];
    }
  },
  {
    id: "triangle",
    nameRu: "Треугольник",
    watchText: "Смотри. Это треугольник. У него три стороны",
    doText: "Теперь ты",
    completionText: "Ты нарисовал линию",
    getPoints: (w, h) => {
      const cx = w / 2, cy = h / 2;
      const size = Math.min(w, h) * 0.3;
      return [
        { x: cx, y: cy - size/2 },
        { x: cx + size/2, y: cy + size/2 },
        { x: cx - size/2, y: cy + size/2 },
        { x: cx, y: cy - size/2 },
      ];
    }
  },
  {
    id: "star",
    nameRu: "Звезда",
    watchText: "Смотри. Это звезда. У неё пять лучиков",
    doText: "Теперь ты",
    completionText: "Ты нарисовал линию",
    getPoints: (w, h) => {
      const cx = w / 2, cy = h / 2;
      const outerR = Math.min(w, h) * 0.18;
      const innerR = outerR * 0.45;
      const points: Point[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
        points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
      }
      points.push(points[0]);
      return points;
    }
  },
  {
    id: "heart",
    nameRu: "Сердце",
    watchText: "Смотри. Это сердце",
    doText: "Теперь ты",
    completionText: "Ты нарисовал линию",
    getPoints: (w, h) => {
      const cx = w / 2, cy = h / 2;
      const size = Math.min(w, h) * 0.15;
      const points: Point[] = [];
      // Левая половина
      for (let t = 0; t <= 1; t += 0.04) {
        const angle = Math.PI + t * Math.PI;
        const x = cx + Math.cos(angle) * size * 0.5 - size * 0.25;
        const y = cy - size * 0.3 + Math.sin(angle) * size * 0.5;
        points.push({ x, y });
      }
      points.push({ x: cx, y: cy + size * 0.7 });
      // Правая половина
      for (let t = 0; t <= 1; t += 0.04) {
        const angle = t * Math.PI;
        const x = cx + Math.cos(angle) * size * 0.5 + size * 0.25;
        const y = cy - size * 0.3 + Math.sin(angle) * size * 0.5;
        points.push({ x, y });
      }
      return points;
    }
  },
];

export const GuidedDrawing = ({ onBack, childName, childId }: GuidedDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [currentStage, setCurrentStage] = useState<Stage>("watch");
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(CALM_COLORS[0].hex);
  const [ceolinaMessage, setCeolinaMessage] = useState("");
  const [showNextButton, setShowNextButton] = useState(false);
  const [showScenarioSelector, setShowScenarioSelector] = useState(false);
  const [hasDrawnSomething, setHasDrawnSomething] = useState(false);
  
  // Для рисования БЕЗ КОРРЕКЦИИ - точное движение руки
  const lastPointRef = useRef<Point | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  // СКРЫТАЯ АНАЛИТИКА - собираем но не показываем ребёнку
  const analyticsRef = useRef<AnalyticsData>({
    strokeCount: 0,
    colorChanges: [],
    strokeSpeeds: [],
    strokeReturns: 0,
    strokeLengths: [],
    startTime: 0,
    endTime: 0,
  });
  const prevPointsRef = useRef<Point[]>([]);

  const scenario = SCENARIOS[currentScenarioIndex];

  // Инициализация холста - 70-80% экрана
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const resize = () => {
      const containerRect = container.getBoundingClientRect();
      // Холст занимает минимум 70% высоты окна
      const minHeight = window.innerHeight * 0.65;
      const canvasHeight = Math.max(minHeight, containerRect.height);
      
      canvas.width = containerRect.width;
      canvas.height = canvasHeight;
      
      if (!isAnimating) {
        clearCanvas();
      }
    };
    
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [isAnimating]);

  // Обработка смены этапа
  useEffect(() => {
    clearCanvas();
    setShowNextButton(false);
    setHasDrawnSomething(false);
    prevPointsRef.current = [];
    
    // Сброс аналитики для нового этапа
    analyticsRef.current = {
      strokeCount: 0,
      colorChanges: [currentColor],
      strokeSpeeds: [],
      strokeReturns: 0,
      strokeLengths: [],
      startTime: Date.now(),
      endTime: 0,
    };
    
    switch (currentStage) {
      case "watch":
        setCeolinaMessage(scenario.watchText);
        // Медленная задержка перед анимацией
        setTimeout(() => startWatchAnimation(), 2500);
        break;
      case "do":
        setCeolinaMessage(scenario.doText);
        // Показываем очень бледный шаблон
        drawVeryFaintGuide();
        break;
    }
  }, [currentStage, currentScenarioIndex]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Очень мягкий кремовый фон
    ctx.fillStyle = "#FFFEF7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // ЭТАП "СМОТРИ" - медленная анимация рисования
  // Реальная скорость, реальные паузы, плавные линии
  const startWatchAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clearCanvas();
    setIsAnimating(true);
    const points = scenario.getPoints(canvas.width, canvas.height);
    let currentIndex = 0;

    // Цвет для демонстрации
    ctx.strokeStyle = CALM_COLORS[0].hex;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    // ОЧЕНЬ медленная анимация - имитация реальной руки
    const animate = () => {
      if (currentIndex >= points.length - 1) {
        setIsAnimating(false);
        setShowNextButton(true);
        
        // После анимации оставляем трафарет видимым как образец
        drawTemplateAsReference();
        return;
      }

      currentIndex++;
      const point = points[currentIndex];
      const prevPoint = points[currentIndex - 1];
      
      // Плавная линия
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);

      // Рисуем мягкий "курсор" как указатель руки
      ctx.fillStyle = CALM_COLORS[0].hex;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Стираем курсор через небольшую задержку
      setTimeout(() => {
        ctx.fillStyle = "#FFFEF7";
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Перерисовываем линию до текущей точки
        ctx.strokeStyle = CALM_COLORS[0].hex;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i <= currentIndex; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        
        // Следующий кадр - ОЧЕНЬ МЕДЛЕННО (10+ секунд общая длительность)
        // ~200ms между точками для плавной, спокойной анимации
        animationRef.current = requestAnimationFrame(animate);
      }, 200);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [scenario, clearCanvas]);

  // Трафарет как образец после анимации - остаётся видимым
  const drawTemplateAsReference = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const points = scenario.getPoints(canvas.width, canvas.height);

    // Чёткий но не отвлекающий трафарет
    ctx.strokeStyle = "rgba(180, 180, 180, 0.5)";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  }, [scenario]);

  // Очень бледный гид для этапа "ДЕЛАЙ"
  const drawVeryFaintGuide = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clearCanvas();
    const points = scenario.getPoints(canvas.width, canvas.height);

    // Очень бледный контур - тень предыдущей фигуры
    ctx.strokeStyle = "rgba(200, 200, 200, 0.15)";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  }, [scenario, clearCanvas]);

  // Получить координаты - точные, без изменений
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e && e.touches.length > 0) {
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

  // НАЧАЛО РИСОВАНИЯ - БЕЗ КОРРЕКЦИИ
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (currentStage === "watch" || isAnimating) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const point = getCoordinates(e);
    lastPointRef.current = point;
    lastTimeRef.current = Date.now();
    prevPointsRef.current = [point];

    // Настройка кисти - НИКАКОГО snap-to-path, auto-correct, magnet
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);

    // Аналитика: новый штрих
    analyticsRef.current.strokeCount++;
  };

  // РИСОВАНИЕ - ТОЧНОЕ ДВИЖЕНИЕ РУКИ
  // ❌ Никакого сглаживания
  // ❌ Никакого подтягивания
  // ❌ Никакого исправления траектории
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const point = getCoordinates(e);
    const lastPoint = lastPointRef.current;
    const now = Date.now();

    // ПРЯМАЯ ЛИНИЯ - без quadraticCurveTo, без сглаживания
    // Линия = точное движение руки ребёнка
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);

    // СКРЫТАЯ АНАЛИТИКА
    // Скорость штриха
    const timeDelta = now - lastTimeRef.current;
    const distance = Math.sqrt((point.x - lastPoint.x) ** 2 + (point.y - lastPoint.y) ** 2);
    if (timeDelta > 0) {
      analyticsRef.current.strokeSpeeds.push(distance / timeDelta);
    }

    // Возвраты (резкие изменения направления)
    if (prevPointsRef.current.length >= 3) {
      const p1 = prevPointsRef.current[prevPointsRef.current.length - 2];
      const p2 = lastPoint;
      const p3 = point;
      const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
      const angleDiff = Math.abs(angle2 - angle1);
      if (angleDiff > Math.PI * 0.7) {
        analyticsRef.current.strokeReturns++;
      }
    }

    lastPointRef.current = point;
    lastTimeRef.current = now;
    prevPointsRef.current.push(point);
    
    if (!hasDrawnSomething) {
      setHasDrawnSomething(true);
    }
  };

  // КОНЕЦ РИСОВАНИЯ
  const stopDrawing = () => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) ctx.stroke();
    
    setIsDrawing(false);
    
    // Аналитика: длина штриха
    if (prevPointsRef.current.length > 1) {
      let length = 0;
      for (let i = 1; i < prevPointsRef.current.length; i++) {
        const p1 = prevPointsRef.current[i - 1];
        const p2 = prevPointsRef.current[i];
        length += Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
      }
      analyticsRef.current.strokeLengths.push(length);
    }
    
    lastPointRef.current = null;
    prevPointsRef.current = [];

    // Показываем кнопку "Дальше" если что-то нарисовано
    if (hasDrawnSomething || prevPointsRef.current.length > 5) {
      setShowNextButton(true);
    }
  };

  // Смена цвета - записываем в аналитику
  const handleColorChange = (color: string) => {
    setCurrentColor(color);
    analyticsRef.current.colorChanges.push(color);
  };

  // Переход на следующий этап
  const handleNextStage = async () => {
    if (currentStage === "watch") {
      setCurrentStage("do");
    } else {
      // Завершение - только факт, не оценка
      setCeolinaMessage(scenario.completionText);
      analyticsRef.current.endTime = Date.now();
      
      // Сохраняем аналитику в БД (скрыто от ребёнка)
      try {
        const userId = await getCurrentUserId();
        if (userId && await isUserAuthenticated()) {
          // Сохраняем сессию с аналитикой
          await supabase.from("session_analytics").insert({
            user_id: userId,
            session_type: "guided_drawing",
            duration_seconds: Math.round((analyticsRef.current.endTime - analyticsRef.current.startTime) / 1000),
            color_choices: analyticsRef.current.colorChanges,
            sensory_activity: {
              strokeCount: analyticsRef.current.strokeCount,
              avgSpeed: analyticsRef.current.strokeSpeeds.length > 0 
                ? analyticsRef.current.strokeSpeeds.reduce((a, b) => a + b, 0) / analyticsRef.current.strokeSpeeds.length 
                : 0,
              strokeReturns: analyticsRef.current.strokeReturns,
              avgStrokeLength: analyticsRef.current.strokeLengths.length > 0
                ? analyticsRef.current.strokeLengths.reduce((a, b) => a + b, 0) / analyticsRef.current.strokeLengths.length
                : 0,
              scenario: scenario.id,
            }
          });

          // Начисляем токены
          await supabase.from("emotion_tokens").insert({
            user_id: userId,
            child_id: childId || null,
            amount: 5,
            source: `Guided: ${scenario.nameRu}`
          });
        }
      } catch (error) {
        console.error("Analytics save error:", error);
      }

      // Уведомление - простой факт
      toast.success(scenario.completionText, { duration: 2000 });

      // Переход к следующей фигуре
      setTimeout(() => {
        if (currentScenarioIndex < SCENARIOS.length - 1) {
          setCurrentScenarioIndex(prev => prev + 1);
          setCurrentStage("watch");
        } else {
          onBack();
        }
      }, 2000);
    }
  };

  // Повтор текущего этапа
  const handleRepeat = () => {
    setShowNextButton(false);
    setHasDrawnSomething(false);
    prevPointsRef.current = [];
    
    if (currentStage === "watch") {
      clearCanvas();
      setCeolinaMessage(scenario.watchText);
      setTimeout(() => startWatchAnimation(), 1500);
    } else {
      setCeolinaMessage(scenario.doText);
      drawVeryFaintGuide();
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8F6F0" }}>
      {/* Минимальная шапка */}
      <header className="flex items-center gap-3 px-4 py-2" style={{ backgroundColor: "#FFFEF7" }}>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          className="w-12 h-12"
        >
          <Home size={28} />
        </Button>
        <div className="flex-1 text-center">
          <h1 className="text-xl font-semibold" style={{ color: "#5D6D7E" }}>
            {scenario.nameRu}
          </h1>
        </div>
        <div className="w-12" />
      </header>

      {/* Индикаторы этапов - минимум */}
      <div className="flex justify-center gap-4 py-2 px-4">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{
            width: 60,
            backgroundColor: currentStage === "watch" || currentStage === "do" 
              ? CALM_COLORS[0].hex : "#E5E5E5"
          }}
        />
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{
            width: 60,
            backgroundColor: currentStage === "do" ? CALM_COLORS[0].hex : "#E5E5E5"
          }}
        />
      </div>

      {/* Персонаж - наблюдатель, не оценщик */}
      <div 
        className="mx-4 p-4 rounded-2xl flex items-center gap-4"
        style={{ backgroundColor: "#FFFEF7" }}
      >
        <img
          src={ceolinaCharacter}
          alt="Star"
          className="w-14 h-14"
        />
        <p 
          className="text-lg leading-relaxed flex-1"
          style={{ color: "#5D6D7E" }}
        >
          {ceolinaMessage}
        </p>
      </div>

      {/* ХОЛСТ - 70-80% экрана, максимум места */}
      <div 
        ref={containerRef}
        className="flex-1 mx-3 my-2 rounded-2xl overflow-hidden"
        style={{ 
          backgroundColor: "#FFFEF7",
          minHeight: "60vh"
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full touch-none"
          style={{ 
            cursor: currentStage === "watch" || isAnimating ? "default" : "crosshair"
          }}
        />
      </div>

      {/* Панель внизу - минимум элементов */}
      <div className="px-4 pb-4 space-y-3">
        {/* Палитра цветов - всегда доступна на этапе "делай" */}
        {currentStage === "do" && (
          <div className="flex justify-center gap-2 py-2 flex-wrap">
            {CALM_COLORS.map((color) => (
              <button
                key={color.hex}
                onClick={() => handleColorChange(color.hex)}
                className="w-10 h-10 rounded-full transition-all duration-300"
                style={{ 
                  backgroundColor: color.hex,
                  transform: currentColor === color.hex ? "scale(1.2)" : "scale(1)",
                  boxShadow: currentColor === color.hex ? `0 0 0 3px ${color.hex}50` : "none"
                }}
                aria-label={color.name}
              />
            ))}
          </div>
        )}

        {/* Кнопки - крупные */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={handleRepeat}
            className="flex-1 h-14 text-lg gap-2"
            style={{ borderColor: "#E5E5E5", color: "#7F8C8D" }}
          >
            <RotateCcw size={22} />
            Ещё раз
          </Button>
          
          {showNextButton && (
            <Button
              size="lg"
              onClick={handleNextStage}
              className="flex-1 h-14 text-lg gap-2 transition-all duration-500"
              style={{ backgroundColor: CALM_COLORS[0].hex, color: "#5D4E37" }}
            >
              Дальше
              <ChevronRight size={22} />
            </Button>
          )}
        </div>

        {/* Выбор фигуры */}
        <button
          onClick={() => setShowScenarioSelector(!showScenarioSelector)}
          className="w-full py-2 text-sm"
          style={{ color: "#AAAAAA" }}
        >
          {showScenarioSelector ? "Скрыть" : "Другая фигура"}
        </button>
        
        {showScenarioSelector && (
          <div className="flex justify-center gap-2 flex-wrap pb-2">
            {SCENARIOS.map((s, idx) => (
              <Button
                key={s.id}
                variant={idx === currentScenarioIndex ? "default" : "outline"}
                size="lg"
                onClick={() => {
                  setCurrentScenarioIndex(idx);
                  setCurrentStage("watch");
                  setShowScenarioSelector(false);
                }}
                className="text-base px-5"
                style={idx === currentScenarioIndex ? 
                  { backgroundColor: CALM_COLORS[0].hex, color: "#5D4E37" } : 
                  { borderColor: "#E5E5E5", color: "#7F8C8D" }
                }
              >
                {s.nameRu}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
