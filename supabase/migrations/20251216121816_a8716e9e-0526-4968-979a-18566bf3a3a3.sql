-- Добавление уникального ограничения на user_id в таблице user_roles
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);