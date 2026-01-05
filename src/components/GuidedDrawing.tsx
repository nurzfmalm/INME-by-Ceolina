import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ChevronRight, RotateCcw, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId, isUserAuthenticated } from "@/lib/auth-helpers";
import ceolinaCharacter from "@/assets/ceolina-character.png";

interface GuidedDrawingProps {
  onBack: () => void;
  childName: string;
  childId?: string;
}

// Shape scenarios - each is a complete learning scenario
interface ShapeScenario {
  id: string;
  nameRu: string;
  description: string;
  colors: string[];
  defaultColor: string;
  drawSteps: DrawStep[];
  modifications: string[];
  getPoints: (w: number, h: number) => Point[];
}

interface DrawStep {
  instruction: string;
  getPath: (w: number, h: number) => Point[];
}

interface Point {
  x: number;
  y: number;
}

// Stage definitions
type Stage = "watch" | "trace" | "color" | "repeat" | "modify" | "free";

const STAGES: { id: Stage; nameRu: string; instruction: string }[] = [
  { id: "watch", nameRu: "Смотри", instruction: "Смотри, как рисуется фигура" },
  { id: "trace", nameRu: "Обведи", instruction: "Обведи по контуру" },
  { id: "color", nameRu: "Раскрась", instruction: "Раскрась фигуру" },
  { id: "repeat", nameRu: "Повтори", instruction: "Нарисуй по подсказке" },
  { id: "modify", nameRu: "Измени", instruction: "Добавь что-то своё" },
  { id: "free", nameRu: "Нарисуй своё", instruction: "Нарисуй как хочешь" },
];

// Sun scenario (circle with rays)
const SUN_SCENARIO: ShapeScenario = {
  id: "sun",
  nameRu: "Солнце",
  description: "Это солнце. У него есть круг и лучики",
  colors: ["#FFD93D", "#FF9F43", "#FF6B6B"],
  defaultColor: "#FFD93D",
  modifications: [
    "Добавь ещё один лучик",
    "Сделай солнце большим",
    "Нарисуй два солнца"
  ],
  drawSteps: [
    { instruction: "Обведи круг", getPath: (w, h) => getCirclePoints(w/2, h/2, Math.min(w, h) * 0.2, 50) },
    { instruction: "Обведи первый луч", getPath: (w, h) => getRayPoints(w, h, 0) },
    { instruction: "Обведи второй луч", getPath: (w, h) => getRayPoints(w, h, 1) },
    { instruction: "Обведи третий луч", getPath: (w, h) => getRayPoints(w, h, 2) },
    { instruction: "Обведи четвёртый луч", getPath: (w, h) => getRayPoints(w, h, 3) },
  ],
  getPoints: (w, h) => {
    const points: Point[] = [];
    // Circle
    points.push(...getCirclePoints(w/2, h/2, Math.min(w, h) * 0.2, 50));
    // Rays
    for (let i = 0; i < 8; i++) {
      points.push(...getRayPoints(w, h, i));
    }
    return points;
  }
};

// House scenario
const HOUSE_SCENARIO: ShapeScenario = {
  id: "house",
  nameRu: "Домик",
  description: "Это домик. У него есть стены и крыша",
  colors: ["#FF6B6B", "#4ECDC4", "#96CEB4"],
  defaultColor: "#FF6B6B",
  modifications: [
    "Добавь окошко",
    "Нарисуй дверь",
    "Добавь трубу на крыше"
  ],
  drawSteps: [
    { instruction: "Обведи стены", getPath: (w, h) => getSquarePoints(w/2 - 60, h/2 - 20, 120, 100) },
    { instruction: "Обведи крышу", getPath: (w, h) => getTrianglePoints(w/2, h/2 - 80, 140, 60) },
  ],
  getPoints: (w, h) => {
    const points: Point[] = [];
    points.push(...getSquarePoints(w/2 - 60, h/2 - 20, 120, 100));
    points.push(...getTrianglePoints(w/2, h/2 - 80, 140, 60));
    return points;
  }
};

// Triangle scenario
const TRIANGLE_SCENARIO: ShapeScenario = {
  id: "triangle",
  nameRu: "Треугольник",
  description: "Это треугольник. У него три стороны",
  colors: ["#4ECDC4", "#45B7D1", "#96CEB4"],
  defaultColor: "#4ECDC4",
  modifications: [
    "Нарисуй треугольник поменьше",
    "Переверни треугольник",
    "Нарисуй два треугольника"
  ],
  drawSteps: [
    { instruction: "Обведи первую сторону", getPath: (w, h) => [{x: w/2, y: h/2 - 70}, {x: w/2 + 80, y: h/2 + 50}] },
    { instruction: "Обведи вторую сторону", getPath: (w, h) => [{x: w/2 + 80, y: h/2 + 50}, {x: w/2 - 80, y: h/2 + 50}] },
    { instruction: "Обведи третью сторону", getPath: (w, h) => [{x: w/2 - 80, y: h/2 + 50}, {x: w/2, y: h/2 - 70}] },
  ],
  getPoints: (w, h) => getTrianglePoints(w/2, h/2 - 70, 160, 120)
};

// Star scenario
const STAR_SCENARIO: ShapeScenario = {
  id: "star",
  nameRu: "Звезда",
  description: "Это звезда. У неё пять лучиков",
  colors: ["#FFD93D", "#FF9F43", "#DDA0DD"],
  defaultColor: "#FFD93D",
  modifications: [
    "Добавь ещё одну звезду",
    "Сделай звезду маленькой",
    "Нарисуй много звёзд"
  ],
  drawSteps: [
    { instruction: "Обведи первый луч", getPath: (w, h) => getStarRayPath(w, h, 0) },
    { instruction: "Обведи второй луч", getPath: (w, h) => getStarRayPath(w, h, 1) },
    { instruction: "Обведи третий луч", getPath: (w, h) => getStarRayPath(w, h, 2) },
    { instruction: "Обведи четвёртый луч", getPath: (w, h) => getStarRayPath(w, h, 3) },
    { instruction: "Обведи пятый луч", getPath: (w, h) => getStarRayPath(w, h, 4) },
  ],
  getPoints: (w, h) => getStarPoints(w/2, h/2, 70, 35)
};

// Heart scenario
const HEART_SCENARIO: ShapeScenario = {
  id: "heart",
  nameRu: "Сердце",
  description: "Это сердце. Оно означает любовь",
  colors: ["#FF6B6B", "#DDA0DD", "#FF9F43"],
  defaultColor: "#FF6B6B",
  modifications: [
    "Нарисуй маленькое сердце",
    "Добавь ещё одно сердце",
    "Нарисуй много сердец"
  ],
  drawSteps: [
    { instruction: "Обведи левую половину", getPath: (w, h) => getHeartLeftPath(w, h) },
    { instruction: "Обведи правую половину", getPath: (w, h) => getHeartRightPath(w, h) },
  ],
  getPoints: (w, h) => [...getHeartLeftPath(w, h), ...getHeartRightPath(w, h)]
};

const SCENARIOS: ShapeScenario[] = [SUN_SCENARIO, HOUSE_SCENARIO, TRIANGLE_SCENARIO, STAR_SCENARIO, HEART_SCENARIO];

// Helper functions for generating points
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
  const innerRadius = Math.min(w, h) * 0.22;
  const outerRadius = Math.min(w, h) * 0.35;
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
  points.push(points[0]); // Close the star
  return points;
}

function getStarRayPath(w: number, h: number, rayIndex: number): Point[] {
  const cx = w / 2;
  const cy = h / 2;
  const outerR = 70;
  const innerR = 35;
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
  const size = 60;
  const points: Point[] = [];
  
  for (let t = 0; t <= 1; t += 0.05) {
    const angle = Math.PI + t * Math.PI;
    const x = cx + Math.cos(angle) * size * 0.5 - size * 0.25;
    const y = cy - size * 0.3 + Math.sin(angle) * size * 0.5;
    points.push({ x, y });
  }
  points.push({ x: cx, y: cy + size * 0.7 });
  return points;
}

function getHeartRightPath(w: number, h: number): Point[] {
  const cx = w / 2;
  const cy = h / 2;
  const size = 60;
  const points: Point[] = [];
  
  points.push({ x: cx, y: cy + size * 0.7 });
  for (let t = 0; t <= 1; t += 0.05) {
    const angle = t * Math.PI;
    const x = cx + Math.cos(angle) * size * 0.5 + size * 0.25;
    const y = cy - size * 0.3 + Math.sin(angle) * size * 0.5;
    points.push({ x, y });
  }
  return points;
}

// Positive phrases for ABA compliance
const POSITIVE_PHRASES = [
  "Молодец!",
  "Отлично получается!",
  "Супер!",
  "Так держать!",
  "Замечательно!",
  "Ты умница!",
  "Прекрасно!",
  "Здорово!",
];

const ENCOURAGEMENT_PHRASES = [
  "Давай попробуем ещё",
  "Ничего страшного",
  "Попробуй снова",
  "У тебя получится",
];

export const GuidedDrawing = ({ onBack, childName, childId }: GuidedDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [currentStage, setCurrentStage] = useState<Stage>("watch");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(SCENARIOS[0].defaultColor);
  const [ceolinaMessage, setCeolinaMessage] = useState("");
  const [showNextButton, setShowNextButton] = useState(false);
  const [modificationIndex, setModificationIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  const lastPointRef = useRef<Point | null>(null);
  const drawnPathRef = useRef<Point[]>([]);

  const scenario = SCENARIOS[currentScenarioIndex];
  const stageInfo = STAGES.find(s => s.id === currentStage)!;

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = Math.min(rect.width * 0.8, 400);
      }
    };
    
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Handle stage changes
  useEffect(() => {
    clearCanvas();
    setShowNextButton(false);
    setCompletedSteps([]);
    setCurrentStepIndex(0);
    drawnPathRef.current = [];
    
    switch (currentStage) {
      case "watch":
        setCeolinaMessage(scenario.description);
        setTimeout(() => startWatchAnimation(), 1500);
        break;
      case "trace":
        setCeolinaMessage(scenario.drawSteps[0]?.instruction || "Обведи фигуру");
        drawTemplate(1);
        break;
      case "color":
        setCeolinaMessage("Давай раскрасим! Выбери цвет");
        setCurrentColor(scenario.defaultColor);
        drawFilledShape();
        break;
      case "repeat":
        setCeolinaMessage("Давай попробуем ещё раз вместе");
        drawHintTemplate();
        break;
      case "modify":
        setCeolinaMessage(scenario.modifications[modificationIndex]);
        drawBaseShape();
        break;
      case "free":
        setCeolinaMessage("Ты можешь нарисовать своё " + scenario.nameRu.toLowerCase());
        drawGhostShape();
        break;
    }
  }, [currentStage, currentScenarioIndex]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawnPathRef.current = [];
  }, []);

  // Stage 1: Watch animation
  const startWatchAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsAnimating(true);
    const points = scenario.getPoints(canvas.width, canvas.height);
    let currentIndex = 0;

    ctx.strokeStyle = scenario.defaultColor;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    const animate = () => {
      if (currentIndex >= points.length - 1) {
        setIsAnimating(false);
        setCeolinaMessage(POSITIVE_PHRASES[Math.floor(Math.random() * POSITIVE_PHRASES.length)] + " Видишь, как красиво?");
        setShowNextButton(true);
        return;
      }

      currentIndex++;
      const point = points[currentIndex];
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [scenario]);

  // Draw template with opacity
  const drawTemplate = useCallback((opacity: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clearCanvas();

    // Draw completed steps
    ctx.strokeStyle = scenario.defaultColor;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    completedSteps.forEach(stepIdx => {
      const stepPoints = scenario.drawSteps[stepIdx].getPath(canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(stepPoints[0].x, stepPoints[0].y);
      stepPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });

    // Draw current step template
    if (currentStepIndex < scenario.drawSteps.length) {
      const stepPoints = scenario.drawSteps[currentStepIndex].getPath(canvas.width, canvas.height);
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = `rgba(148, 163, 184, ${opacity})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(stepPoints[0].x, stepPoints[0].y);
      stepPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [scenario, clearCanvas, completedSteps, currentStepIndex]);

  // Draw hint template (dotted/points for repeat stage)
  const drawHintTemplate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clearCanvas();
    const points = scenario.getPoints(canvas.width, canvas.height);

    // Draw dots
    ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
    points.forEach((p, i) => {
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, [scenario, clearCanvas]);

  // Draw ghost shape for free drawing
  const drawGhostShape = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clearCanvas();
    const points = scenario.getPoints(canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  }, [scenario, clearCanvas]);

  // Draw base shape for modify stage
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

  // Draw filled shape for coloring
  const drawFilledShape = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clearCanvas();
    const points = scenario.getPoints(canvas.width, canvas.height);

    // Draw outline
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();
  }, [scenario, clearCanvas]);

  // Get coordinates from mouse/touch event
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
    ctx.lineWidth = 6;
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
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) ctx.stroke();
    
    setIsDrawing(false);
    lastPointRef.current = null;

    // Give positive feedback
    const phrase = POSITIVE_PHRASES[Math.floor(Math.random() * POSITIVE_PHRASES.length)];
    setCeolinaMessage(phrase);

    // Handle step completion for trace mode
    if (currentStage === "trace" && drawnPathRef.current.length > 10) {
      setCompletedSteps(prev => [...prev, currentStepIndex]);
      
      if (currentStepIndex < scenario.drawSteps.length - 1) {
        setTimeout(() => {
          const nextStep = currentStepIndex + 1;
          setCurrentStepIndex(nextStep);
          setCeolinaMessage(scenario.drawSteps[nextStep].instruction);
          drawTemplate(1);
        }, 1000);
      } else {
        setTimeout(() => {
          setCeolinaMessage("Отлично! Ты обвёл всё!");
          setShowNextButton(true);
        }, 1000);
      }
    } else if (currentStage !== "trace" && drawnPathRef.current.length > 5) {
      setTimeout(() => setShowNextButton(true), 500);
    }

    drawnPathRef.current = [];
  };

  const handleNextStage = async () => {
    const stageIndex = STAGES.findIndex(s => s.id === currentStage);
    
    if (stageIndex < STAGES.length - 1) {
      setCurrentStage(STAGES[stageIndex + 1].id);
    } else {
      // Completed all stages, award tokens
      try {
        const userId = await getCurrentUserId();
        if (userId && await isUserAuthenticated()) {
          await supabase.from("emotion_tokens").insert({
            user_id: userId,
            child_id: childId || null,
            amount: 15,
            source: `Guided: ${scenario.nameRu} completed`
          });
        }
        toast.success("Молодец! Ты прошёл все этапы!");
      } catch (error) {
        console.error("Error awarding tokens:", error);
      }

      // Move to next scenario or back to selection
      if (currentScenarioIndex < SCENARIOS.length - 1) {
        setCurrentScenarioIndex(prev => prev + 1);
        setCurrentStage("watch");
        setModificationIndex(0);
      } else {
        onBack();
      }
    }
  };

  const handleRepeat = () => {
    clearCanvas();
    setShowNextButton(false);
    drawnPathRef.current = [];
    setCompletedSteps([]);
    setCurrentStepIndex(0);
    
    if (currentStage === "watch") {
      startWatchAnimation();
    } else if (currentStage === "trace") {
      drawTemplate(1);
      setCeolinaMessage(scenario.drawSteps[0]?.instruction || "Обведи фигуру");
    } else if (currentStage === "color") {
      drawFilledShape();
      setCeolinaMessage("Давай раскрасим! Выбери цвет");
    } else if (currentStage === "repeat") {
      drawHintTemplate();
      setCeolinaMessage("Давай попробуем ещё раз вместе");
    } else if (currentStage === "modify") {
      drawBaseShape();
      setCeolinaMessage(scenario.modifications[modificationIndex]);
    } else if (currentStage === "free") {
      drawGhostShape();
      setCeolinaMessage("Ты можешь нарисовать своё " + scenario.nameRu.toLowerCase());
    }
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="bg-card shadow-soft border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <Home size={24} />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{scenario.nameRu}</h1>
              <p className="text-sm text-muted-foreground">
                Этап: {stageInfo.nameRu}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-4 max-w-lg">
        {/* Stage indicators */}
        <div className="flex justify-center gap-2">
          {STAGES.map((stage, idx) => (
            <div
              key={stage.id}
              className={`w-10 h-2 rounded-full transition-all ${
                STAGES.findIndex(s => s.id === currentStage) >= idx
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Ceolina character with message */}
        <Card className="p-4 bg-gradient-calm border-0 shadow-float">
          <div className="flex items-center gap-4">
            <img
              src={ceolinaCharacter}
              alt="Ceolina"
              className={`w-20 h-20 ${isAnimating ? "animate-gentle-float" : ""}`}
            />
            <div className="flex-1">
              <p className="text-lg font-medium text-primary-foreground leading-relaxed">
                {ceolinaMessage}
              </p>
            </div>
          </div>
        </Card>

        {/* Canvas area */}
        <Card className="p-3 border-0 bg-card shadow-soft">
          <div className="relative bg-white rounded-xl overflow-hidden">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full touch-none"
              style={{ 
                minHeight: 300,
                cursor: currentStage === "watch" ? "default" : "crosshair"
              }}
            />
          </div>
        </Card>

        {/* Color picker for color stage */}
        {currentStage === "color" && (
          <Card className="p-4 border-0 bg-card shadow-soft">
            <p className="text-sm text-muted-foreground mb-3">Выбери цвет:</p>
            <div className="flex justify-center gap-4">
              {scenario.colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setCurrentColor(color)}
                  className={`w-14 h-14 rounded-full transition-transform hover:scale-110 ${
                    currentColor === color ? "ring-4 ring-primary ring-offset-2 scale-110" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </Card>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={handleRepeat}
            className="flex-1 gap-2"
          >
            <RotateCcw size={20} />
            Ещё раз
          </Button>
          
          {showNextButton && (
            <Button
              size="lg"
              onClick={handleNextStage}
              className="flex-1 gap-2 bg-primary hover:bg-primary/90"
            >
              Дальше
              <ChevronRight size={20} />
            </Button>
          )}
        </div>

        {/* Scenario selector */}
        <Card className="p-4 border-0 bg-card shadow-soft">
          <p className="text-sm text-muted-foreground mb-3">Выбери фигуру:</p>
          <div className="flex justify-center gap-3 flex-wrap">
            {SCENARIOS.map((s, idx) => (
              <Button
                key={s.id}
                variant={idx === currentScenarioIndex ? "default" : "outline"}
                size="lg"
                onClick={() => {
                  setCurrentScenarioIndex(idx);
                  setCurrentStage("watch");
                  setCurrentColor(s.defaultColor);
                }}
                className="text-base px-6"
              >
                {s.nameRu}
              </Button>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
};
