-- Таблица центров с кодами
CREATE TABLE public.centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;

-- Все могут видеть центры (для проверки кода при регистрации)
CREATE POLICY "Anyone can view centers" ON public.centers
FOR SELECT USING (true);

-- Таблица детей (многие дети на одного пользователя)
CREATE TABLE public.children (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  avatar_url TEXT,
  emotional_state TEXT DEFAULT 'neutral',
  development_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

-- Пользователи видят только своих детей
CREATE POLICY "Users can view own children" ON public.children
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own children" ON public.children
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own children" ON public.children
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own children" ON public.children
FOR DELETE USING (auth.uid() = user_id);

-- Триггер для updated_at
CREATE TRIGGER update_children_updated_at
BEFORE UPDATE ON public.children
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Добавляем center_id к user_roles для связи пользователя с центром
ALTER TABLE public.user_roles ADD COLUMN center_id UUID REFERENCES public.centers(id);

-- Добавляем child_id к artworks для привязки рисунков к конкретному ребёнку
ALTER TABLE public.artworks ADD COLUMN child_id UUID REFERENCES public.children(id);

-- Добавляем reference_image_url для фото предмета (референса)
ALTER TABLE public.artworks ADD COLUMN reference_image_url TEXT;
ALTER TABLE public.artworks ADD COLUMN reference_storage_path TEXT;

-- Добавляем поля для анализа состояния
ALTER TABLE public.artworks ADD COLUMN emotional_analysis JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.artworks ADD COLUMN development_indicators JSONB DEFAULT '{}'::jsonb;

-- Добавляем child_id к другим таблицам прогресса
ALTER TABLE public.learning_paths ADD COLUMN child_id UUID REFERENCES public.children(id);
ALTER TABLE public.progress_tracking ADD COLUMN child_id UUID REFERENCES public.children(id);
ALTER TABLE public.emotion_tokens ADD COLUMN child_id UUID REFERENCES public.children(id);
ALTER TABLE public.adaptive_assessments ADD COLUMN child_id UUID REFERENCES public.children(id);

-- Вставляем тестовый центр
INSERT INTO public.centers (name, code, description)
VALUES ('Коррекционный центр', '123456', 'Тестовый коррекционный центр для разработки');