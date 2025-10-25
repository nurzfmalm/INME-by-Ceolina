// Expanded emotion-tagged color palette for art therapy
export interface EmotionColor {
  name: string;
  hex: string;
  emotion: string;
  emotionCategory: 'positive' | 'neutral' | 'calming' | 'energetic' | 'introspective';
  therapeuticNote: string;
}

export const EMOTION_COLOR_PALETTE: EmotionColor[] = [
  // Joyful & Positive (Yellow-Orange spectrum)
  { name: "Солнечный", hex: "#FFD93D", emotion: "joy", emotionCategory: "positive", therapeuticNote: "Радость и оптимизм" },
  { name: "Золотой", hex: "#FFC300", emotion: "joy", emotionCategory: "positive", therapeuticNote: "Счастье и тепло" },
  { name: "Янтарный", hex: "#FFB000", emotion: "joy", emotionCategory: "positive", therapeuticNote: "Уверенность" },
  { name: "Персиковый", hex: "#FFBE98", emotion: "gentle", emotionCategory: "positive", therapeuticNote: "Мягкость и забота" },
  { name: "Коралловый", hex: "#FF9B85", emotion: "warm", emotionCategory: "positive", therapeuticNote: "Дружелюбие" },
  
  // Calming (Green-Blue spectrum)
  { name: "Мятный", hex: "#98D8C8", emotion: "calm", emotionCategory: "calming", therapeuticNote: "Спокойствие" },
  { name: "Изумрудный", hex: "#6BCB77", emotion: "calm", emotionCategory: "calming", therapeuticNote: "Гармония и баланс" },
  { name: "Лесной", hex: "#4D9078", emotion: "calm", emotionCategory: "calming", therapeuticNote: "Стабильность" },
  { name: "Бирюзовый", hex: "#4ECDC4", emotion: "fresh", emotionCategory: "calming", therapeuticNote: "Свежесть и обновление" },
  { name: "Аквамарин", hex: "#7FCDCD", emotion: "fresh", emotionCategory: "calming", therapeuticNote: "Ясность" },
  { name: "Небесный", hex: "#87CEEB", emotion: "peace", emotionCategory: "calming", therapeuticNote: "Умиротворение" },
  { name: "Лазурный", hex: "#4D96FF", emotion: "peace", emotionCategory: "calming", therapeuticNote: "Глубокое спокойствие" },
  
  // Energetic (Red-Orange spectrum)
  { name: "Алый", hex: "#FF6B6B", emotion: "energy", emotionCategory: "energetic", therapeuticNote: "Энергия и активность" },
  { name: "Красный", hex: "#E74C3C", emotion: "energy", emotionCategory: "energetic", therapeuticNote: "Сила и страсть" },
  { name: "Огненный", hex: "#FF4757", emotion: "energy", emotionCategory: "energetic", therapeuticNote: "Динамика" },
  { name: "Оранжевый", hex: "#FF8C42", emotion: "warm", emotionCategory: "energetic", therapeuticNote: "Энтузиазм" },
  { name: "Мандариновый", hex: "#FFA726", emotion: "warm", emotionCategory: "energetic", therapeuticNote: "Игривость" },
  
  // Creative & Imaginative (Purple-Pink spectrum)
  { name: "Фиолетовый", hex: "#C68FE6", emotion: "creative", emotionCategory: "introspective", therapeuticNote: "Творчество" },
  { name: "Лавандовый", hex: "#A8DADC", emotion: "creative", emotionCategory: "introspective", therapeuticNote: "Воображение" },
  { name: "Сиреневый", hex: "#B19CD9", emotion: "creative", emotionCategory: "introspective", therapeuticNote: "Мечтательность" },
  { name: "Пурпурный", hex: "#9B59B6", emotion: "creative", emotionCategory: "introspective", therapeuticNote: "Глубина мысли" },
  { name: "Розовый", hex: "#FFB4D6", emotion: "gentle", emotionCategory: "positive", therapeuticNote: "Нежность и любовь" },
  { name: "Малиновый", hex: "#FF69B4", emotion: "gentle", emotionCategory: "positive", therapeuticNote: "Привязанность" },
  { name: "Фуксия", hex: "#F72585", emotion: "energy", emotionCategory: "energetic", therapeuticNote: "Яркие эмоции" },
  
  // Introspective & Reflective (Blue-Indigo spectrum)
  { name: "Синий", hex: "#3498DB", emotion: "calm", emotionCategory: "calming", therapeuticNote: "Размышление" },
  { name: "Индиго", hex: "#4A5899", emotion: "introspect", emotionCategory: "introspective", therapeuticNote: "Самопознание" },
  { name: "Сапфировый", hex: "#0F52BA", emotion: "introspect", emotionCategory: "introspective", therapeuticNote: "Концентрация" },
  { name: "Морской", hex: "#006994", emotion: "calm", emotionCategory: "calming", therapeuticNote: "Глубина чувств" },
  
  // Neutral & Grounding (Brown-Grey spectrum)
  { name: "Бежевый", hex: "#F5E6D3", emotion: "neutral", emotionCategory: "neutral", therapeuticNote: "Безопасность" },
  { name: "Песочный", hex: "#E8DCC4", emotion: "neutral", emotionCategory: "neutral", therapeuticNote: "Стабильность" },
  { name: "Коричневый", hex: "#A0826D", emotion: "grounded", emotionCategory: "neutral", therapeuticNote: "Заземление" },
  { name: "Шоколадный", hex: "#7B5D3F", emotion: "grounded", emotionCategory: "neutral", therapeuticNote: "Уют" },
  { name: "Серый", hex: "#95A5A6", emotion: "neutral", emotionCategory: "neutral", therapeuticNote: "Нейтральность" },
  { name: "Серебряный", hex: "#BDC3C7", emotion: "neutral", emotionCategory: "neutral", therapeuticNote: "Баланс" },
  
  // Nature-inspired (Green spectrum)
  { name: "Лаймовый", hex: "#CDDC39", emotion: "fresh", emotionCategory: "energetic", therapeuticNote: "Живость" },
  { name: "Оливковый", hex: "#808000", emotion: "grounded", emotionCategory: "neutral", therapeuticNote: "Природная связь" },
  { name: "Весенний", hex: "#90EE90", emotion: "fresh", emotionCategory: "calming", therapeuticNote: "Обновление" },
  { name: "Травяной", hex: "#7CB342", emotion: "calm", emotionCategory: "calming", therapeuticNote: "Рост" },
  
  // Warm pastels
  { name: "Кремовый", hex: "#FFF5E1", emotion: "gentle", emotionCategory: "neutral", therapeuticNote: "Мягкость" },
  { name: "Абрикосовый", hex: "#FBCEB1", emotion: "warm", emotionCategory: "positive", therapeuticNote: "Теплота" },
  { name: "Лососевый", hex: "#FA8072", emotion: "warm", emotionCategory: "positive", therapeuticNote: "Открытость" },
  
  // Cool pastels
  { name: "Голубой", hex: "#ADD8E6", emotion: "peace", emotionCategory: "calming", therapeuticNote: "Легкость" },
  { name: "Мятный крем", hex: "#F0FFF0", emotion: "fresh", emotionCategory: "calming", therapeuticNote: "Чистота" },
  { name: "Пудровый", hex: "#FFE4E1", emotion: "gentle", emotionCategory: "positive", therapeuticNote: "Мягкие чувства" },
  
  // Bold & Vivid
  { name: "Лимонный", hex: "#FFF44F", emotion: "joy", emotionCategory: "energetic", therapeuticNote: "Яркость" },
  { name: "Киви", hex: "#8EE53F", emotion: "fresh", emotionCategory: "energetic", therapeuticNote: "Живость" },
  { name: "Электрик", hex: "#00D9FF", emotion: "energy", emotionCategory: "energetic", therapeuticNote: "Возбуждение" },
  { name: "Неоновый", hex: "#39FF14", emotion: "energy", emotionCategory: "energetic", therapeuticNote: "Интенсивность" },
  
  // Deep & Rich
  { name: "Бордовый", hex: "#800020", emotion: "introspect", emotionCategory: "introspective", therapeuticNote: "Глубокие эмоции" },
  { name: "Винный", hex: "#722F37", emotion: "introspect", emotionCategory: "introspective", therapeuticNote: "Зрелость чувств" },
  { name: "Изумрудно-темный", hex: "#046307", emotion: "grounded", emotionCategory: "neutral", therapeuticNote: "Укорененность" },
  { name: "Полночный", hex: "#191970", emotion: "introspect", emotionCategory: "introspective", therapeuticNote: "Тайна" },
  
  // Soft & Soothing
  { name: "Ванильный", hex: "#F3E5AB", emotion: "gentle", emotionCategory: "neutral", therapeuticNote: "Комфорт" },
  { name: "Жемчужный", hex: "#EAE0C8", emotion: "neutral", emotionCategory: "neutral", therapeuticNote: "Элегантность" },
  { name: "Айвори", hex: "#FFFFF0", emotion: "neutral", emotionCategory: "neutral", therapeuticNote: "Чистота" },
  { name: "Пыльная роза", hex: "#DCAE96", emotion: "gentle", emotionCategory: "neutral", therapeuticNote: "Нежная связь" },
  
  // Greys & Blacks (for contrast)
  { name: "Угольный", hex: "#36454F", emotion: "grounded", emotionCategory: "neutral", therapeuticNote: "Основа" },
  { name: "Графитовый", hex: "#474A51", emotion: "neutral", emotionCategory: "neutral", therapeuticNote: "Структура" },
  { name: "Черный", hex: "#1C1C1C", emotion: "grounded", emotionCategory: "neutral", therapeuticNote: "Контраст" },
  { name: "Белый", hex: "#FFFFFF", emotion: "neutral", emotionCategory: "neutral", therapeuticNote: "Чистота и начало" },
];

export const getColorByEmotion = (emotion: string): EmotionColor[] => {
  return EMOTION_COLOR_PALETTE.filter(c => c.emotion === emotion);
};

export const getColorsByCategory = (category: EmotionColor['emotionCategory']): EmotionColor[] => {
  return EMOTION_COLOR_PALETTE.filter(c => c.emotionCategory === category);
};

export const getColorTherapeuticNote = (hex: string): string => {
  const color = EMOTION_COLOR_PALETTE.find(c => c.hex.toLowerCase() === hex.toLowerCase());
  return color?.therapeuticNote || "Выражение эмоций";
};
