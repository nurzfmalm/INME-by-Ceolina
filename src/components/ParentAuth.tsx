import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import ceolinaCharacter from "@/assets/ceolina-character.png";

interface ParentAuthProps {
  onBack: () => void;
}

export const ParentAuth = ({ onBack }: ParentAuthProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
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
        toast.success("Вход выполнен!");
      } else {
        // Validation for registration
        if (!childName.trim()) {
          toast.error("Укажите имя ребёнка");
          return;
        }
        if (!childAge || parseInt(childAge) < 3 || parseInt(childAge) > 12) {
          toast.error("Возраст должен быть от 3 до 12 лет");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
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

        if (data.user) {
          // Set parent role
          await supabase.from("user_roles").insert({
            user_id: data.user.id,
            role: "parent",
          });
          
          // Update profile with child data
          await supabase
            .from("profiles")
            .update({ 
              child_name: childName,
              child_age: parseInt(childAge),
              parent_email: email
            })
            .eq("id", data.user.id);
          
          toast.success("Аккаунт создан! Войдите в систему.");
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>

        <div className="text-center mb-6">
          <img
            src={ceolinaCharacter}
            alt="Ceolina"
            className="w-20 h-20 mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold">
            {isLogin ? "Вход родителя" : "Регистрация родителя"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {isLogin
              ? "Войдите в свой аккаунт"
              : "Создайте аккаунт для управления прогрессом ребёнка"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
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

          <div>
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

          {!isLogin && (
            <>
              <div>
                <Label htmlFor="childName">Имя ребёнка</Label>
                <Input
                  id="childName"
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  required
                  placeholder="Имя вашего ребёнка"
                />
              </div>
              
              <div>
                <Label htmlFor="childAge">Возраст ребёнка</Label>
                <Input
                  id="childAge"
                  type="number"
                  min="3"
                  max="12"
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                  required
                  placeholder="От 3 до 12 лет"
                />
              </div>
            </>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Обработка...
              </>
            ) : isLogin ? (
              "Войти"
            ) : (
              "Зарегистрироваться"
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:underline"
          >
            {isLogin
              ? "Нет аккаунта? Зарегистрируйтесь"
              : "Уже есть аккаунт? Войдите"}
          </button>
        </div>
      </Card>
    </div>
  );
};
