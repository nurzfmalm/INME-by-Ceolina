# Развёртывание CLIP Analysis

## Быстрый старт

### 1. Проверка переменных окружения

Убедитесь, что в `.env` присутствует ключ Hugging Face:

```env
VITE_HUGGINGFACE_API_KEY="your_huggingface_api_key"
```

### 2. Установка Supabase CLI (если ещё не установлена)

```bash
# Windows (через npm)
npm install -g supabase

# Или через Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 3. Вход в Supabase

```bash
supabase login
```

Откроется браузер для авторизации.

### 4. Линковка проекта

```bash
cd "c:\Users\Нурзат\Documents\INME App\INME-by-Ceolina"
supabase link --project-ref ragmaoabxrzcndasyggy
```

### 5. Установка секретов

```bash
supabase secrets set HUGGINGFACE_API_KEY=your_huggingface_api_key
```

### 6. Деплой Edge Function

```bash
supabase functions deploy analyze-image-clip
```

### 7. Проверка деплоя

После успешного деплоя вы увидите:

```
Deployed Function analyze-image-clip on project ragmaoabxrzcndasyggy
Function URL: https://ragmaoabxrzcndasyggy.supabase.co/functions/v1/analyze-image-clip
```

### 8. Тестирование функции

Откройте приложение и перейдите в раздел "Анализ фото". Загрузите изображение и нажмите "Анализировать рисунок".

## Troubleshooting

### Ошибка: "HUGGINGFACE_API_KEY is not configured"

**Решение:** Убедитесь, что секрет установлен правильно:

```bash
supabase secrets list
```

Если ключа нет, установите его снова:

```bash
supabase secrets set HUGGINGFACE_API_KEY=your_huggingface_api_key
```

### Ошибка: "Rate limit exceeded"

**Решение:** Hugging Face имеет лимиты на бесплатное использование. Подождите несколько минут или обновите план на Hugging Face.

### Ошибка: "Model is loading"

**Решение:** Первый запрос к модели может занять 20-30 секунд, так как модель загружается. Подождите и попробуйте снова.

### Ошибка: "Unauthorized"

**Решение:** Проверьте, что пользователь авторизован в приложении. Edge Function требует валидный JWT токен.

## Мониторинг

### Просмотр логов

```bash
supabase functions logs analyze-image-clip
```

### Просмотр логов в реальном времени

```bash
supabase functions logs analyze-image-clip --follow
```

## Обновление функции

После внесения изменений в код:

```bash
supabase functions deploy analyze-image-clip
```

## Удаление функции (если нужно)

```bash
supabase functions delete analyze-image-clip
```

## Локальное тестирование (опционально)

### 1. Запуск Supabase локально

```bash
supabase start
```

### 2. Запуск функции локально

```bash
supabase functions serve analyze-image-clip --env-file .env
```

### 3. Тестовый запрос через curl

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/analyze-image-clip' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"imageData":"data:image/png;base64,iVBORw0KG..."}'
```

## Полезные команды

```bash
# Список всех функций
supabase functions list

# Просмотр секретов
supabase secrets list

# Удаление секрета
supabase secrets unset HUGGINGFACE_API_KEY

# Проверка статуса проекта
supabase status
```

---

**Готово!** Теперь CLIP анализ интегрирован в ваше приложение.
