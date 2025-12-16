import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ceolinaCharacter from "@/assets/ceolina-character.png";

interface AuthProps {
  onAuthSuccess: () => void;
}

export const Auth = ({ onAuthSuccess }: AuthProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [childName, setChildName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isResetPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
        });
        if (error) throw error;
        toast.success("Письмо для сброса пароля отправлено на вашу почту!");
        setIsResetPassword(false);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Добро пожаловать!");
        onAuthSuccess();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              child_name: childName,
            },
          },
        });
        if (error) throw error;
        toast.success("Регистрация успешна! Добро пожаловать!");
        onAuthSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-calm flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-4">
          <img
            src={ceolinaCharacter}
            alt="Ceolina"
            className="w-24 h-24 mx-auto animate-gentle-float"
          />
          <h1 className="text-3xl font-bold">
            {isResetPassword ? "Сброс пароля" : "Добро пожаловать!"}
          </h1>
          <p className="text-muted-foreground">
            {isResetPassword
              ? "Введите email для сброса пароля"
              : isLogin
              ? "Войдите в свой аккаунт"
              : "Создайте новый аккаунт"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && !isResetPassword && (
            <div className="space-y-2">
              <Label htmlFor="childName">Имя ребёнка</Label>
              <Input
                id="childName"
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                required={!isLogin && !isResetPassword}
                placeholder="Введите имя ребёнка"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
            />
          </div>

          {!isResetPassword && (
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Загрузка..."
              : isResetPassword
              ? "Отправить письмо"
              : isLogin
              ? "Войти"
              : "Зарегистрироваться"}
          </Button>

          {isResetPassword ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsResetPassword(false)}
            >
              Вернуться к входу
            </Button>
          ) : (
            <>
              {isLogin && (
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm"
                  onClick={() => setIsResetPassword(true)}
                >
                  Забыли пароль?
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin
                  ? "Нет аккаунта? Зарегистрируйтесь"
                  : "Уже есть аккаунт? Войдите"}
              </Button>
            </>
          )}
        </form>
      </Card>
    </div>
  );
};
