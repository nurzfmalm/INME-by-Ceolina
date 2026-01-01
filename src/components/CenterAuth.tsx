import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Building2, CheckCircle } from "lucide-react";
import ceolinaCharacter from "@/assets/ceolina-character.png";

interface CenterAuthProps {
  onBack: () => void;
}

interface Center {
  id: string;
  name: string;
  description: string | null;
}

export const CenterAuth = ({ onBack }: CenterAuthProps) => {
  const [step, setStep] = useState<"code" | "auth">("code");
  const [isLogin, setIsLogin] = useState(false);
  const [centerCode, setCenterCode] = useState("");
  const [center, setCenter] = useState<Center | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCheckCode = async () => {
    if (!centerCode.trim()) {
      toast.error("Введите код центра");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("centers")
        .select("id, name, description")
        .eq("code", centerCode.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error("Центр с таким кодом не найден");
        return;
      }

      setCenter(data);
      setStep("auth");
      toast.success(`Центр найден: ${data.name}`);
    } catch (error: any) {
      console.error("Error checking center code:", error);
      toast.error("Ошибка проверки кода");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!center) return;

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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        if (data.user) {
          // Create role with center association
          const { error: roleError } = await supabase.from("user_roles").insert({
            user_id: data.user.id,
            role: "parent",
            center_id: center.id,
          });

          if (roleError) {
            console.error("Error creating role:", roleError);
          }

          if (data.session) {
            toast.success("Аккаунт создан!");
          } else {
            toast.success("Аккаунт создан! Проверьте email для подтверждения.");
            setIsLogin(true);
          }
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      if (error.message?.includes("already registered")) {
        toast.error("Пользователь с таким email уже зарегистрирован");
      } else {
        toast.error(error.message || "Ошибка авторизации");
      }
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
          onClick={step === "code" ? onBack : () => setStep("code")}
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
          
          {step === "code" ? (
            <>
              <h2 className="text-2xl font-bold">Код центра</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Введите код, полученный от вашего центра
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-primary" />
                <span className="font-semibold text-primary">{center?.name}</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">
                {isLogin ? "Вход" : "Регистрация"}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                {isLogin
                  ? "Войдите в свой аккаунт"
                  : "Создайте аккаунт специалиста"}
              </p>
            </>
          )}
        </div>

        {step === "code" ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="centerCode">Код центра</Label>
              <Input
                id="centerCode"
                type="text"
                value={centerCode}
                onChange={(e) => setCenterCode(e.target.value.toUpperCase())}
                placeholder="Например: 123456"
                className="text-center text-2xl tracking-widest font-mono"
                maxLength={10}
              />
            </div>

            <Button
              onClick={handleCheckCode}
              className="w-full"
              disabled={loading || !centerCode.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Проверка...
                </>
              ) : (
                "Продолжить"
              )}
            </Button>
          </div>
        ) : (
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
        )}

        {step === "auth" && (
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
        )}
      </Card>
    </div>
  );
};
