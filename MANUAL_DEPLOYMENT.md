# Ручное развёртывание CLIP Analysis

## Шаг 1: Установка Supabase CLI

### Через npm (рекомендуется):
```bash
npm install -g supabase
```

Проверьте установку:
```bash
supabase --version
```

---

## Шаг 2: Авторизация в Supabase

```bash
supabase login
```

Откроется браузер для авторизации. Войдите в свой аккаунт Supabase.

---

## Шаг 3: Подключение к проекту

```bash
cd "c:\Users\Нурзат\Documents\INME App\INME-by-Ceolina"
supabase link --project-ref ragmaoabxrzcndasyggy
```

Введите пароль базы данных, если потребуется.

---

## Шаг 4: Установка секретов

```bash
supabase secrets set HUGGINGFACE_API_KEY=your_huggingface_api_key
```

Проверьте, что секрет установлен:
```bash
supabase secrets list
```

Вы должны увидеть:
```
HUGGINGFACE_API_KEY
```

---

## Шаг 5: Развёртывание функции

```bash
supabase functions deploy analyze-image-clip
```

После успешного развёртывания вы увидите:
```
✓ Deployed Function analyze-image-clip on project ragmaoabxrzcndasyggy
Function URL: https://ragmaoabxrzcndasyggy.supabase.co/functions/v1/analyze-image-clip
```

---

## Шаг 6: Проверка

### Проверить, что функция развёрнута:
```bash
supabase functions list
```

### Посмотреть логи (если нужно):
```bash
supabase functions logs analyze-image-clip
```

---

## Альтернатива: Развёртывание через Supabase Dashboard

Если CLI не работает, можно развернуть через веб-интерфейс:

1. Откройте https://supabase.com/dashboard/project/ragmaoabxrzcndasyggy
2. Перейдите в **Edge Functions**
3. Нажмите **New function**
4. Имя: `analyze-image-clip`
5. Скопируйте весь код из файла `supabase/functions/analyze-image-clip/index.ts`
6. Вставьте в редактор
7. Перейдите в **Settings** → **Secrets**
8. Добавьте секрет:
   - Name: `HUGGINGFACE_API_KEY`
   - Value: `your_huggingface_api_key`
9. Нажмите **Deploy**

---

## Тестирование

После развёртывания:

1. Откройте ваше приложение INME
2. Перейдите в раздел "Анализ фото"
3. Загрузите любое изображение
4. Нажмите "Анализировать рисунок"
5. Дождитесь результатов (может занять 5-10 секунд при первом запуске)

---

## Troubleshooting

### "supabase command not found" после установки
- Перезапустите терминал/PowerShell
- Проверьте PATH: `echo $env:PATH`

### "Failed to link project"
- Убедитесь, что вы вошли: `supabase login`
- Проверьте project ref: `ragmaoabxrzcndasyggy`

### "Model is loading" при первом запросе
- Это нормально для Hugging Face
- Подождите 20-30 секунд и попробуйте снова

### "Rate limit exceeded"
- Подождите несколько минут
- Проверьте лимиты на https://huggingface.co/settings/tokens

---

## Готово!

После успешного развёртывания CLIP анализ будет доступен в вашем приложении.
