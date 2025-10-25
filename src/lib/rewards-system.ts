// Система наград для рисования
export interface UnlockedReward {
  id: string;
  type: "brush" | "color" | "texture" | "background" | "character";
}

export const getUnlockedRewards = (): string[] => {
  try {
    const stored = localStorage.getItem("ceolinaUnlockedRewards");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const isRewardUnlocked = (rewardId: string): boolean => {
  const unlocked = getUnlockedRewards();
  return unlocked.includes(rewardId);
};

// Дополнительные цвета наград
export const REWARD_COLORS = [
  {
    id: "color-gold",
    name: "Золотой",
    color: "#FFD700",
    emotion: "joy",
    category: "positive" as const,
    note: "Роскошный золотистый оттенок"
  },
  {
    id: "color-silver",
    name: "Серебряный",
    color: "#C0C0C0",
    emotion: "calm",
    category: "neutral" as const,
    note: "Сияющий серебристый оттенок"
  }
];

// Типы кистей
export type BrushType = "normal" | "sparkle" | "rainbow";

export const getBrushType = (): BrushType => {
  if (isRewardUnlocked("brush-rainbow")) return "rainbow";
  if (isRewardUnlocked("brush-sparkle")) return "sparkle";
  return "normal";
};

// Текстуры
export type TextureType = "none" | "stars" | "hearts";

export const getAvailableTextures = (): TextureType[] => {
  const textures: TextureType[] = ["none"];
  if (isRewardUnlocked("texture-stars")) textures.push("stars");
  if (isRewardUnlocked("texture-hearts")) textures.push("hearts");
  return textures;
};

// Фоны
export interface Background {
  id: string;
  name: string;
  gradient: string;
}

export const BACKGROUNDS: Background[] = [
  {
    id: "bg-default",
    name: "Обычный",
    gradient: "#FFFFFF"
  },
  {
    id: "bg-galaxy",
    name: "Галактика",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  },
  {
    id: "bg-garden",
    name: "Сад",
    gradient: "linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)"
  }
];

export const getAvailableBackgrounds = (): Background[] => {
  const backgrounds = [BACKGROUNDS[0]]; // Всегда доступен обычный фон
  
  if (isRewardUnlocked("bg-galaxy")) {
    backgrounds.push(BACKGROUNDS[1]);
  }
  if (isRewardUnlocked("bg-garden")) {
    backgrounds.push(BACKGROUNDS[2]);
  }
  
  return backgrounds;
};

// Эффекты кисти на canvas
export const applyBrushEffect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  brushType: BrushType,
  lineWidth: number
) => {
  switch (brushType) {
    case "sparkle":
      // Добавляем искорки вокруг основной линии
      for (let i = 0; i < 3; i++) {
        const offsetX = (Math.random() - 0.5) * lineWidth * 2;
        const offsetY = (Math.random() - 0.5) * lineWidth * 2;
        const sparkleSize = Math.random() * lineWidth * 0.5;
        
        ctx.save();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(x + offsetX, y + offsetY, sparkleSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
      
    case "rainbow":
      // Радужный эффект - градиент цветов
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, lineWidth);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, adjustColorBrightness(color, 20));
      gradient.addColorStop(1, adjustColorBrightness(color, -20));
      ctx.strokeStyle = gradient;
      break;
      
    default:
      ctx.strokeStyle = color;
      break;
  }
};

// Применить текстуру
export const applyTexture = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  texture: TextureType,
  color: string
) => {
  if (texture === "none") return;
  
  ctx.save();
  ctx.fillStyle = color;
  
  switch (texture) {
    case "stars":
      drawStar(ctx, x, y, 5, 8, 4);
      break;
    case "hearts":
      drawHeart(ctx, x, y, 8);
      break;
  }
  
  ctx.restore();
};

// Вспомогательные функции для рисования
const drawStar = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) => {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
};

const drawHeart = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(x, y + topCurveHeight);
  
  // Левая кривая
  ctx.bezierCurveTo(
    x, y, 
    x - size / 2, y, 
    x - size / 2, y + topCurveHeight
  );
  
  ctx.bezierCurveTo(
    x - size / 2, y + (size + topCurveHeight) / 2, 
    x, y + (size + topCurveHeight) / 2, 
    x, y + size
  );
  
  // Правая кривая
  ctx.bezierCurveTo(
    x, y + (size + topCurveHeight) / 2, 
    x + size / 2, y + (size + topCurveHeight) / 2, 
    x + size / 2, y + topCurveHeight
  );
  
  ctx.bezierCurveTo(
    x + size / 2, y, 
    x, y, 
    x, y + topCurveHeight
  );
  
  ctx.closePath();
  ctx.fill();
};

const adjustColorBrightness = (color: string, percent: number): string => {
  // Простое изменение яркости цвета
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  
  return "#" + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
};
