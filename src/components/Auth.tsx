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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [childName, setChildName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
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
          <h1 className="text-3xl font-bold">Добро пожаловать!</h1>
          <p className="text-muted-foreground">
            {isLogin ? "Войдите в свой аккаунт" : "Создайте новый аккаунт"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="childName">Имя ребёнка</Label>
              <Input
                id="childName"
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                required={!isLogin}
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Загрузка..."
              : isLogin
              ? "Войти"
              : "Зарегистрироваться"}
          </Button>

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
        </form>
      </Card>
    </div>
  );
};
