-- =====================================================
-- SUPABASE STORAGE SETUP для bucket "artworks"
-- =====================================================

-- Создать bucket для рисунков (если еще не создан)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artworks',
  'artworks',
  true,  -- Публичный доступ для просмотра
  10485760,  -- 10 MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- 1. SELECT Policy - Все могут просматривать артворки
CREATE POLICY "Anyone can view artworks"
ON storage.objects FOR SELECT
USING (bucket_id = 'artworks');

-- 2. INSERT Policy - Пользователи могут загружать только в свою папку
CREATE POLICY "Users can upload own artworks"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artworks'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. UPDATE Policy - Пользователи могут обновлять только свои файлы
CREATE POLICY "Users can update own artworks"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'artworks'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'artworks'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. DELETE Policy - Пользователи могут удалять только свои файлы
CREATE POLICY "Users can delete own artworks"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'artworks'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- ДОПОЛНИТЕЛЬНЫЕ ПОЛИТИКИ (опционально)
-- =====================================================

-- Родители могут просматривать артворки своих детей
CREATE POLICY "Parents can view children artworks"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'artworks'
  AND (
    -- Владелец файла
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Родитель ребенка-владельца
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id::text = (storage.foldername(name))[1]
      AND profiles.parent_user_id = auth.uid()
    )
  )
);

-- =====================================================
-- ПРОВЕРКА НАСТРОЙКИ
-- =====================================================

-- Проверить что bucket создан
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'artworks') THEN
    RAISE NOTICE '✅ Bucket "artworks" создан успешно';
  ELSE
    RAISE NOTICE '❌ Bucket "artworks" не найден';
  END IF;
END $$;

-- Проверить политики
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%artworks%';

  RAISE NOTICE '✅ Создано % политик для artworks', policy_count;
END $$;

-- =====================================================
-- ТЕСТИРОВАНИЕ (раскомментируйте для теста)
-- =====================================================

/*
-- Тест 1: Проверка публичного доступа к bucket
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'artworks';

-- Тест 2: Список всех политик для storage.objects
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- Тест 3: Получить размер bucket (количество файлов)
SELECT
  COUNT(*) as total_files,
  SUM(metadata->>'size')::bigint as total_size_bytes,
  pg_size_pretty(SUM(metadata->>'size')::bigint) as total_size
FROM storage.objects
WHERE bucket_id = 'artworks';
*/

-- =====================================================
-- ПРИМЕЧАНИЯ
-- =====================================================

/*
СТРУКТУРА ФАЙЛОВ:
artworks/
├── {user_id_1}/
│   ├── artwork_1638123456789.png
│   ├── artwork_1638234567890.png
│   └── ...
├── {user_id_2}/
│   ├── artwork_1638456789012.png
│   └── ...
└── ...

ПРИМЕР ИСПОЛЬЗОВАНИЯ В КОДЕ:

import { supabase } from '@/integrations/supabase/client';

// Загрузить файл
const userId = 'user-uuid-here';
const file = new File([blob], 'artwork.png');
const path = `${userId}/artwork_${Date.now()}.png`;

const { data, error } = await supabase.storage
  .from('artworks')
  .upload(path, file);

// Получить публичный URL
const { data: { publicUrl } } = supabase.storage
  .from('artworks')
  .getPublicUrl(path);

// Удалить файл
const { error } = await supabase.storage
  .from('artworks')
  .remove([path]);

ЛИМИТЫ:
- Free Plan: 1 GB storage, 2 GB bandwidth
- Pro Plan: 100 GB storage, 200 GB bandwidth
- File size limit: 10 MB (можно изменить)

БЕЗОПАСНОСТЬ:
- RLS включен автоматически
- Только авторизованные пользователи могут загружать
- Каждый пользователь может загружать только в свою папку (user_id/)
- Все могут просматривать (public bucket)
- Только владелец может удалять/обновлять свои файлы
*/
