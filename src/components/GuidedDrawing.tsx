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
  traceSteps: TraceStep[];
  colorText: string;
  repeatText: string;
  modifyText: string;
  freeText: string;
  completionText: string;
  colors: string[]; // Пастельные цвета
  defaultColor: string;
  getPoints: (w: number, h: number) => Point[];
}

interface TraceStep {
  instruction: string;
  getPath: (w: number, h: number) => Point[];
}

interface Point {
  x: number;
  y: number;
}

type Stage = "watch" | "trace" | "color" | "repeat" | "modify" | "free";

// Пастельная палитра - спокойные цвета без кислотных оттенков
const PASTEL_COLORS = {
  yellow: "#F9E79F",
  orange: "#F5CBA7", 
  pink: "#F5B7B1",
  green: "#ABEBC6",
  blue: "#AED6F1",
  purple: "#D7BDE2",
  coral: "#F8C8B8",
  mint: "#A9DFBF",
};

// Солнце
const SUN_SCENARIO: ShapeScenario = {
  id: "sun",
  nameRu: "Солнце",
  watchText: "Смотри. Это солнце. Сначала круг",
  colorText: "Теперь мы раскрасим солнце",
  repeatText: "Смотри, я рисую. Теперь ты",
  modifyText: "Добавь ещё один лучик",
  freeText: "Нарисуй своё солнце",
  completionText: "Ты нарисовал солнце",
  colors: [PASTEL_COLORS.yellow, PASTEL_COLORS.orange, PASTEL_COLORS.coral],
  defaultColor: PASTEL_COLORS.yellow,
  traceSteps: [
    { 
      instruction: "Обведи круг вот здесь", 
      getPath: (w, h) => getCirclePoints(w/2, h/2, Math.min(w, h) * 0.15, 50) 
    },
    { 
      instruction: "Обведи первый луч", 
      getPath: (w, h) => getRayPoints(w, h, 0) 
    },
    { 
      instruction: "Обведи второй луч", 
      getPath: (w, h) => getRayPoints(w, h, 1) 
    },
    { 
      instruction: "Обведи третий луч", 
      getPath: (w, h) => getRayPoints(w, h, 2) 
    },
    { 
      instruction: "Обведи четвёртый луч", 
      getPath: (w, h) => getRayPoints(w, h, 3) 
    },
  ],
  getPoints: (w, h) => {
    const points: Point[] = [];
    points.push(...getCirclePoints(w/2, h/2, Math.min(w, h) * 0.15, 50));
    for (let i = 0; i < 8; i++) {
      points.push(...getRayPoints(w, h, i));
    }
    return points;
  }
};

// Домик
const HOUSE_SCENARIO: ShapeScenario = {
  id: "house",
  nameRu: "Домик",
  watchText: "Смотри. Это домик. Сначала стены",
  colorText: "Теперь мы раскрасим домик",
  repeatText: "Смотри, я рисую. Теперь ты",
  modifyText: "Добавь окошко",
  freeText: "Нарисуй свой домик",
  completionText: "Ты нарисовал домик",
  colors: [PASTEL_COLORS.coral, PASTEL_COLORS.green, PASTEL_COLORS.blue],
  defaultColor: PASTEL_COLORS.coral,
  traceSteps: [
    { 
      instruction: "Обведи стены вот здесь", 
      getPath: (w, h) => getSquarePoints(w/2 - 50, h/2 - 10, 100, 80) 
    },
    { 
      instruction: "Обведи крышу", 
      getPath: (w, h) => getTrianglePoints(w/2, h/2 - 60, 120, 50) 
    },
  ],
  getPoints: (w, h) => {
    const points: Point[] = [];
    points.push(...getSquarePoints(w/2 - 50, h/2 - 10, 100, 80));
    points.push(...getTrianglePoints(w/2, h/2 - 60, 120, 50));
    return points;
  }
};

// Треугольник
const TRIANGLE_SCENARIO: ShapeScenario = {
  id: "triangle",
  nameRu: "Треугольник",
  watchText: "Смотри. Это треугольник. У него три стороны",
  colorText: "Теперь мы раскрасим треугольник",
  repeatText: "Смотри, я рисую. Теперь ты",
  modifyText: "Нарисуй треугольник поменьше",
  freeText: "Нарисуй свой треугольник",
  completionText: "Ты нарисовал треугольник",
  colors: [PASTEL_COLORS.mint, PASTEL_COLORS.blue, PASTEL_COLORS.green],
  defaultColor: PASTEL_COLORS.mint,
  traceSteps: [
    { 
      instruction: "Обведи первую сторону", 
      getPath: (w, h) => [{x: w/2, y: h/2 - 50}, {x: w/2 + 60, y: h/2 + 40}] 
    },
    { 
      instruction: "Обведи вторую сторону", 
      getPath: (w, h) => [{x: w/2 + 60, y: h/2 + 40}, {x: w/2 - 60, y: h/2 + 40}] 
    },
    { 
      instruction: "Обведи третью сторону", 
      getPath: (w, h) => [{x: w/2 - 60, y: h/2 + 40}, {x: w/2, y: h/2 - 50}] 
    },
  ],
  getPoints: (w, h) => getTrianglePoints(w/2, h/2 - 50, 120, 90)
};

// Звезда
const STAR_SCENARIO: ShapeScenario = {
  id: "star",
  nameRu: "Звезда",
  watchText: "Смотри. Это звезда. У неё пять лучиков",
  colorText: "Теперь мы раскрасим звезду",
  repeatText: "Смотри, я рисую. Теперь ты",
  modifyText: "Добавь ещё одну звезду",
  freeText: "Нарисуй свою звезду",
  completionText: "Ты нарисовал звезду",
  colors: [PASTEL_COLORS.yellow, PASTEL_COLORS.purple, PASTEL_COLORS.pink],
  defaultColor: PASTEL_COLORS.yellow,
  traceSteps: [
    { instruction: "Обведи первый луч", getPath: (w, h) => getStarRayPath(w, h, 0) },
    { instruction: "Обведи второй луч", getPath: (w, h) => getStarRayPath(w, h, 1) },
    { instruction: "Обведи третий луч", getPath: (w, h) => getStarRayPath(w, h, 2) },
    { instruction: "Обведи четвёртый луч", getPath: (w, h) => getStarRayPath(w, h, 3) },
    { instruction: "Обведи пятый луч", getPath: (w, h) => getStarRayPath(w, h, 4) },
  ],
  getPoints: (w, h) => getStarPoints(w/2, h/2, 55, 28)
};

// Сердце
const HEART_SCENARIO: ShapeScenario = {
  id: "heart",
  nameRu: "Сердце",
  watchText: "Смотри. Это сердце. Оно означает любовь",
  colorText: "Теперь мы раскрасим сердце",
  repeatText: "Смотри, я рисую. Теперь ты",
  modifyText: "Нарисуй маленькое сердце",
  freeText: "Нарисуй своё сердце",
  completionText: "Ты нарисовал сердце",
  colors: [PASTEL_COLORS.pink, PASTEL_COLORS.coral, PASTEL_COLORS.purple],
  defaultColor: PASTEL_COLORS.pink,
  traceSteps: [
    { instruction: "Обведи левую половину", getPath: (w, h) => getHeartLeftPath(w, h) },
    { instruction: "Обведи правую половину", getPath: (w, h) => getHeartRightPath(w, h) },
  ],
  getPoints: (w, h) => [...getHeartLeftPath(w, h), ...getHeartRightPath(w, h)]
};

const SCENARIOS: ShapeScenario[] = [SUN_SCENARIO, HOUSE_SCENARIO, TRIANGLE_SCENARIO, STAR_SCENARIO, HEART_SCENARIO];

// Helper functions
function getCirclePoints(cx: number, cy: number, radius: number, segments: number): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius
    });
  }
  return points;
}

function getRayPoints(w: number, h: number, index: number): Point[] {
  const cx = w / 2;
  const cy = h / 2;
  const innerRadius = Math.min(w, h) * 0.17;
  const outerRadius = Math.min(w, h) * 0.28;
  const angle = (index / 8) * Math.PI * 2 - Math.PI / 2;
  return [
    { x: cx + Math.cos(angle) * innerRadius, y: cy + Math.sin(angle) * innerRadius },
    { x: cx + Math.cos(angle) * outerRadius, y: cy + Math.sin(angle) * outerRadius }
  ];
}

function getSquarePoints(x: number, y: number, width: number, height: number): Point[] {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
    { x, y }
  ];
}

function getTrianglePoints(cx: number, cy: number, width: number, height: number): Point[] {
  return [
    { x: cx, y: cy },
    { x: cx + width / 2, y: cy + height },
    { x: cx - width / 2, y: cy + height },
    { x: cx, y: cy }
  ];
}

function getStarPoints(cx: number, cy: number, outerR: number, innerR: number): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  points.push(points[0]);
  return points;
}

function getStarRayPath(w: number, h: number, rayIndex: number): Point[] {
  const cx = w / 2;
  const cy = h / 2;
  const outerR = 55;
  const innerR = 28;
  const startAngle = (rayIndex * 2 / 10) * Math.PI * 2 - Math.PI / 2;
  const midAngle = ((rayIndex * 2 + 1) / 10) * Math.PI * 2 - Math.PI / 2;
  const endAngle = ((rayIndex * 2 + 2) / 10) * Math.PI * 2 - Math.PI / 2;
  
  return [
    { x: cx + Math.cos(startAngle) * outerR, y: cy + Math.sin(startAngle) * outerR },
    { x: cx + Math.cos(midAngle) * innerR, y: cy + Math.sin(midAngle) * innerR },
    { x: cx + Math.cos(endAngle) * outerR, y: cy + Math.sin(endAngle) * outerR }
  ];
}

function getHeartLeftPath(w: number, h: number): Point[] {
  const cx = w / 2;
  const cy = h / 2;
  const size = 50;
  const points: Point[] = [];
  
  for (let t = 0; t <= 1; t += 0.05) {
    const angle = Math.PI + t * Math.PI;
    const x = cx + Math.cos(angle) * size * 0.5 - size * 0.25;
    const y = cy - size * 0.3 + Math.sin(angle) * size * 0.5;
    points.push({ x, y });
  }
  points.push({ x: cx, y: cy + size * 0.6 });
  return points;
}

function getHeartRightPath(w: number, h: number): Point[] {
  const cx = w / 2;
  const cy = h / 2;
  const size = 50;
  const points: Point[] = [];
  
  points.push({ x: cx, y: cy + size * 0.6 });
  for (let t = 0; t <= 1; t += 0.05) {
    const angle = t * Math.PI;
    const x = cx + Math.cos(angle) * size * 0.5 + size * 0.25;
    const y = cy - size * 0.3 + Math.sin(angle) * size * 0.5;
    points.push({ x, y });
  }
  return points;
}

// Расчёт попадания по контуру
function calculateTraceAccuracy(drawnPath: Point[], templatePath: Point[], threshold: number = 25): number {
  if (drawnPath.length < 5 || templatePath.length < 2) return 0;
  
  let matchedPoints = 0;
  
  for (const drawn of drawnPath) {
    let minDist = Infinity;
    for (const template of templatePath) {
      const dist = Math.sqrt((drawn.x - template.x) ** 2 + (drawn.y - template.y) ** 2);
      minDist = Math.min(minDist, dist);
    }
    if (minDist <= threshold) matchedPoints++;
  }
  
  return matchedPoints / drawnPath.length;
}

// Расчёт покрытия области для раскраски
function calculateFillCoverage(drawnPath: Point[], shapeBounds: { minX: number, maxX: number, minY: number, maxY: number }): number {
  if (drawnPath.length < 10) return 0;
  
  let pointsInBounds = 0;
  for (const p of drawnPath) {
    if (p.x >= shapeBounds.minX && p.x <= shapeBounds.maxX && 
        p.y >= shapeBounds.minY && p.y <= shapeBounds.maxY) {
      pointsInBounds++;
    }
  }
  
  return pointsInBounds / drawnPath.length;
}

function getShapeBounds(points: Point[]): { minX: number, maxX: number, minY: number, maxY: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  // Добавим отступ
  const padding = 20;
  return { minX: minX - padding, maxX: maxX + padding, minY: minY - padding, maxY: maxY + padding };
}

export const GuidedDrawing = ({ onBack, childName, childId }: GuidedDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [currentStage, setCurrentStage] = useState<Stage>("watch");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(SCENARIOS[0].defaultColor);
  const [ceolinaMessage, setCeolinaMessage] = useState("");
  const [showNextButton, setShowNextButton] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showScenarioSelector, setShowScenarioSelector] = useState(false);
  const [ceolinaEmotion, setCeolinaEmotion] = useState<"neutral" | "happy">("neutral");
  
  const lastPointRef = useRef<Point | null>(null);
  const drawnPathRef = useRef<Point[]>([]);
  const allDrawnPointsRef = useRef<Point[]>([]); // Для раскраски

  const scenario = SCENARIOS[currentScenarioIndex];

  // Инициализация холста - занимает максимум экрана
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const resize = () => {
      const containerRect = container.getBoundingClientRect();
      // Холст занимает 80% высоты экрана (минус шапка и кнопки)
      const availableHeight = window.innerHeight - 180;
      const canvasHeight = Math.min(availableHeight, containerRect.width);
      
      canvas.width = containerRect.width;
      canvas.height = canvasHeight;
      
      // Перерисовать при resize
      if (currentStage === "watch" && !isAnimating) {
        // Не перерисовывать во время анимации
      } else {
        redrawCurrentStage();
      }
    };
    
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [currentStage, isAnimating]);

  const redrawCurrentStage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    switch (currentStage) {
      case "trace":
        drawTemplate();
        break;
      case "color":
        drawOutlineForColoring();
        break;
      case "repeat":
        drawTransparentGuide();
        break;
      case "modify":
        drawBaseShape();
        break;
      case "free":
        drawVeryFaintGuide();
        break;
    }
  }, [currentStage]);

  // Обработка смены этапа
  useEffect(() => {
    clearCanvas();
    setShowNextButton(false);
    setCompletedSteps([]);
    setCurrentStepIndex(0);
    drawnPathRef.current = [];
    allDrawnPointsRef.current = [];
    setCeolinaEmotion("neutral");
    
    switch (currentStage) {
      case "watch":
        setCeolinaMessage(scenario.watchText);
        // Задержка перед началом анимации
        setTimeout(() => startWatchAnimation(), 2000);
        break;
      case "trace":
        setCeolinaMessage(scenario.traceSteps[0]?.instruction || "Обведи фигуру");
        drawTemplate();
        break;
      case "color":
        setCeolinaMessage(scenario.colorText);
        setCurrentColor(scenario.defaultColor);
        drawOutlineForColoring();
        break;
      case "repeat":
        setCeolinaMessage(scenario.repeatText);
        startRepeatAnimation();
        break;
      case "modify":
        setCeolinaMessage(scenario.modifyText);
        drawBaseShape();
        break;
      case "free":
        setCeolinaMessage(scenario.freeText);
        drawVeryFaintGuide();
        break;
    }
  }, [currentStage, currentScenarioIndex]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Мягкий кремовый фон
    ctx.fillStyle = "#FFFEF7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawnPathRef.current = [];
  }, []);

  // ЭТАП 1: Анимация "Смотри" - очень медленная
  const startWatchAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clearCanvas();
    setIsAnimating(true);
    const points = scenario.getPoints(canvas.width, canvas.height);
    let currentIndex = 0;

    ctx.strokeStyle = scenario.defaultColor;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    // Очень медленная анимация - 1 точка каждые 50мс
    const animate = () => {
      if (currentIndex >= points.length - 1) {
        setIsAnimating(false);
        setShowNextButton(true);
        return;
      }

      currentIndex++;
      const point = points[currentIndex];
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);

      // Замедленная анимация
      setTimeout(() => {
        animationRef.current = requestAnimationFrame(animate);
      }, 30);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [scenario, clearCanvas]);

  // ЭТАП 2: Шаблон для обводки с подсветкой и стрелкой
  const drawTemplate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clearCanvas();

    // Рисуем завершённые шаги
    ctx.strokeStyle = scenario.defaultColor;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    completedSteps.forEach(stepIdx => {
      const stepPoints = scenario.traceSteps[stepIdx].getPath(canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(stepPoints[0].x, stepPoints[0].y);
      stepPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });

    // Текущий шаг - подсвеченный контур
    if (currentStepIndex < scenario.traceSteps.length) {
      const stepPoints = scenario.traceSteps[currentStepIndex].getPath(canvas.width, canvas.height);
      
      // Подсветка (мягкое свечение)
      ctx.shadowColor = scenario.defaultColor;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = scenario.defaultColor;
      ctx.lineWidth = 10;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(stepPoints[0].x, stepPoints[0].y);
      stepPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      
      // Основной контур (пунктир)
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.setLineDash([12, 8]);
      ctx.strokeStyle = "#7F8C8D";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(stepPoints[0].x, stepPoints[0].y);
      stepPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Стрелка показывающая начало
      const startPoint = stepPoints[0];
      drawArrow(ctx, startPoint.x - 40, startPoint.y - 20, startPoint.x - 5, startPoint.y - 5, scenario.defaultColor);
    }
  }, [scenario, clearCanvas, completedSteps, currentStepIndex]);

  // Рисуем стрелку
  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, color: string) => {
    const headLen = 12;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    
    // Наконечник
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI/6), toY - headLen * Math.sin(angle - Math.PI/6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI/6), toY - headLen * Math.sin(angle + Math.PI/6));
    ctx.stroke();
  };

  // ЭТАП 3: Контур для раскраски
  const drawOutlineForColoring = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clearCanvas();
    const points = scenario.getPoints(canvas.width, canvas.height);

    ctx.strokeStyle = "#5D6D7E";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();
  }, [scenario, clearCanvas]);

  // ЭТАП 4: Полупрозрачный гид + анимация "смотри → делай"
  const startRepeatAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clearCanvas();
    setIsAnimating(true);
    const points = scenario.getPoints(canvas.width, canvas.height);
    
    // Сначала рисуем полупрозрачный шаблон
    ctx.strokeStyle = "rgba(180, 180, 180, 0.25)";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Теперь анимируем "руку" рисующую
    let currentIndex = 0;
    ctx.strokeStyle = scenario.defaultColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    const animate = () => {
      if (currentIndex >= points.length - 1) {
        setIsAnimating(false);
        setCeolinaMessage("Теперь ты");
        return;
      }

      currentIndex++;
      const point = points[currentIndex];
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      
      // Рисуем указатель (кружок)
      ctx.fillStyle = scenario.defaultColor;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
      ctx.fill();

      setTimeout(() => {
        // Стираем указатель
        ctx.fillStyle = "#FFFEF7";
        ctx.beginPath();
        ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
        ctx.fill();
        // Перерисовываем линию
        ctx.strokeStyle = scenario.defaultColor;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i <= currentIndex; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        
        animationRef.current = requestAnimationFrame(animate);
      }, 40);
    };

    setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, 1500);
  }, [scenario, clearCanvas]);

  // Полупрозрачный гид для свободного рисования
  const drawTransparentGuide = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clearCanvas();
    const points = scenario.getPoints(canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(180, 180, 180, 0.25)";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  }, [scenario, clearCanvas]);

  // ЭТАП 5: Базовая фигура для модификации
  const drawBaseShape = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clearCanvas();
    const points = scenario.getPoints(canvas.width, canvas.height);

    ctx.strokeStyle = scenario.defaultColor;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  }, [scenario, clearCanvas]);

  // ЭТАП 6: Очень бледный гид для свободного рисования
  const drawVeryFaintGuide = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clearCanvas();
    const points = scenario.getPoints(canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(200, 200, 200, 0.12)";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  }, [scenario, clearCanvas]);

  // Получить координаты
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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (currentStage === "watch" || isAnimating) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const point = getCoordinates(e);
    lastPointRef.current = point;
    drawnPathRef.current = [point];

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentStage === "color" ? 20 : 8; // Толще для раскраски
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const point = getCoordinates(e);
    const lastPoint = lastPointRef.current;

    const midX = (lastPoint.x + point.x) / 2;
    const midY = (lastPoint.y + point.y) / 2;

    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midX, midY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(midX, midY);

    lastPointRef.current = point;
    drawnPathRef.current.push(point);
    allDrawnPointsRef.current.push(point);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) ctx.stroke();
    
    setIsDrawing(false);
    lastPointRef.current = null;

    // КОНТРОЛЬ КАЧЕСТВА - хвалим только за реальные действия
    if (currentStage === "trace") {
      handleTraceCompletion();
    } else if (currentStage === "color") {
      handleColorCompletion();
    } else if (drawnPathRef.current.length > 15) {
      // Для других этапов - достаточно нарисовать что-то осмысленное
      setShowNextButton(true);
    }

    drawnPathRef.current = [];
  };

  // Обработка завершения обводки
  const handleTraceCompletion = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const templatePath = scenario.traceSteps[currentStepIndex].getPath(canvas.width, canvas.height);
    const accuracy = calculateTraceAccuracy(drawnPathRef.current, templatePath);
    
    // Требуем минимум 40% точности для одобрения
    if (accuracy >= 0.4 && drawnPathRef.current.length >= 10) {
      // Хорошо обведено
      setCeolinaMessage("Хорошо. Ты обвёл " + getPartName(currentStepIndex));
      setCeolinaEmotion("happy");
      setCompletedSteps(prev => [...prev, currentStepIndex]);
      
      if (currentStepIndex < scenario.traceSteps.length - 1) {
        setTimeout(() => {
          const nextStep = currentStepIndex + 1;
          setCurrentStepIndex(nextStep);
          setCeolinaMessage(scenario.traceSteps[nextStep].instruction);
          setCeolinaEmotion("neutral");
          drawTemplate();
        }, 1500);
      } else {
        setTimeout(() => {
          setCeolinaMessage("Хорошо. Ты обвёл всё");
          setShowNextButton(true);
        }, 1500);
      }
    }
    // Если точность низкая - просто ничего не говорим, ребёнок может продолжить
  };

  // Получить название части для похвалы
  const getPartName = (stepIndex: number): string => {
    const instruction = scenario.traceSteps[stepIndex]?.instruction || "";
    if (instruction.includes("круг")) return "круг";
    if (instruction.includes("луч")) return "луч";
    if (instruction.includes("стен")) return "стены";
    if (instruction.includes("крыш")) return "крышу";
    if (instruction.includes("сторон")) return "сторону";
    if (instruction.includes("полов")) return "половину";
    return "часть";
  };

  // Обработка раскраски
  const handleColorCompletion = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const points = scenario.getPoints(canvas.width, canvas.height);
    const bounds = getShapeBounds(points);
    const coverage = calculateFillCoverage(allDrawnPointsRef.current, bounds);
    
    // Требуем заполнить хотя бы 30% формы
    if (coverage >= 0.3) {
      setCeolinaMessage("Хорошо");
      setCeolinaEmotion("happy");
      setShowNextButton(true);
    }
  };

  const handleNextStage = async () => {
    const stages: Stage[] = ["watch", "trace", "color", "repeat", "modify", "free"];
    const currentIndex = stages.indexOf(currentStage);
    
    if (currentIndex < stages.length - 1) {
      setCurrentStage(stages[currentIndex + 1]);
    } else {
      // Завершено - смысловая награда
      setCeolinaMessage(scenario.completionText);
      setCeolinaEmotion("happy");
      
      try {
        const userId = await getCurrentUserId();
        if (userId && await isUserAuthenticated()) {
          await supabase.from("emotion_tokens").insert({
            user_id: userId,
            child_id: childId || null,
            amount: 10,
            source: `Guided: ${scenario.nameRu}`
          });
        }
        toast.success(scenario.completionText, { duration: 3000 });
      } catch (error) {
        console.error("Error awarding tokens:", error);
      }

      // Переход к следующей фигуре или назад
      setTimeout(() => {
        if (currentScenarioIndex < SCENARIOS.length - 1) {
          setCurrentScenarioIndex(prev => prev + 1);
          setCurrentStage("watch");
        } else {
          onBack();
        }
      }, 2500);
    }
  };

  const handleRepeat = () => {
    allDrawnPointsRef.current = [];
    setCompletedSteps([]);
    setCurrentStepIndex(0);
    setShowNextButton(false);
    setCeolinaEmotion("neutral");
    
    // Перерисовать текущий этап
    switch (currentStage) {
      case "watch":
        clearCanvas();
        setCeolinaMessage(scenario.watchText);
        setTimeout(() => startWatchAnimation(), 1500);
        break;
      case "trace":
        setCeolinaMessage(scenario.traceSteps[0]?.instruction || "Обведи фигуру");
        drawTemplate();
        break;
      case "color":
        setCeolinaMessage(scenario.colorText);
        drawOutlineForColoring();
        break;
      case "repeat":
        setCeolinaMessage(scenario.repeatText);
        startRepeatAnimation();
        break;
      case "modify":
        setCeolinaMessage(scenario.modifyText);
        drawBaseShape();
        break;
      case "free":
        setCeolinaMessage(scenario.freeText);
        drawVeryFaintGuide();
        break;
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

  const stageNames: Record<Stage, string> = {
    watch: "Посмотри",
    trace: "Обведи",
    color: "Раскрась",
    repeat: "Повтори",
    modify: "Измени",
    free: "Нарисуй своё"
  };

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
        <div className="w-12" /> {/* Spacer */}
      </header>

      {/* Индикаторы этапов */}
      <div className="flex justify-center gap-2 py-2 px-4">
        {(["watch", "trace", "color", "repeat", "modify", "free"] as Stage[]).map((stage, idx) => {
          const stages: Stage[] = ["watch", "trace", "color", "repeat", "modify", "free"];
          const currentIdx = stages.indexOf(currentStage);
          return (
            <div
              key={stage}
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: 40,
                backgroundColor: idx <= currentIdx ? scenario.defaultColor : "#E5E5E5"
              }}
            />
          );
        })}
      </div>

      {/* Персонаж с сообщением */}
      <div 
        className="mx-4 p-4 rounded-2xl flex items-center gap-4"
        style={{ backgroundColor: "#FFFEF7" }}
      >
        <img
          src={ceolinaCharacter}
          alt="Ceolina"
          className="w-16 h-16 transition-transform duration-700"
          style={{ transform: ceolinaEmotion === "happy" ? "scale(1.1)" : "scale(1)" }}
        />
        <p 
          className="text-lg leading-relaxed flex-1"
          style={{ color: "#5D6D7E" }}
        >
          {ceolinaMessage}
        </p>
      </div>

      {/* ХОЛСТ - занимает максимум места */}
      <div 
        ref={containerRef}
        className="flex-1 mx-4 my-3 rounded-2xl overflow-hidden"
        style={{ 
          backgroundColor: "#FFFEF7",
          minHeight: "50vh"
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

      {/* Панель инструментов внизу */}
      <div className="px-4 pb-4 space-y-3">
        {/* Цветовая палитра для раскраски */}
        {currentStage === "color" && (
          <div className="flex justify-center gap-3 py-2">
            {scenario.colors.map((color) => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                className="w-12 h-12 rounded-full transition-all duration-300"
                style={{ 
                  backgroundColor: color,
                  transform: currentColor === color ? "scale(1.15)" : "scale(1)",
                  boxShadow: currentColor === color ? `0 0 0 4px ${color}40` : "none"
                }}
              />
            ))}
          </div>
        )}
        
        {/* Выбор цвета для обводки */}
        {currentStage === "trace" && (
          <div className="flex justify-center gap-3 py-2">
            <span className="text-sm self-center" style={{ color: "#7F8C8D" }}>Цвет:</span>
            {scenario.colors.map((color) => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                className="w-10 h-10 rounded-full transition-all duration-300"
                style={{ 
                  backgroundColor: color,
                  transform: currentColor === color ? "scale(1.15)" : "scale(1)",
                  boxShadow: currentColor === color ? `0 0 0 3px ${color}40` : "none"
                }}
              />
            ))}
          </div>
        )}

        {/* Кнопки действий */}
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
              style={{ backgroundColor: scenario.defaultColor, color: "#5D4E37" }}
            >
              Дальше
              <ChevronRight size={22} />
            </Button>
          )}
        </div>

        {/* Кнопка выбора фигуры (скрыта по умолчанию) */}
        <button
          onClick={() => setShowScenarioSelector(!showScenarioSelector)}
          className="w-full py-2 text-sm transition-colors"
          style={{ color: "#AAAAAA" }}
        >
          {showScenarioSelector ? "Скрыть" : "Выбрать другую фигуру"}
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
                  setCurrentColor(s.defaultColor);
                  setShowScenarioSelector(false);
                }}
                className="text-base px-5"
                style={idx === currentScenarioIndex ? 
                  { backgroundColor: s.defaultColor, color: "#5D4E37" } : 
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
