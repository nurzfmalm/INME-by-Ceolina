import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import ceolinaCharacter from "@/assets/ceolina-character.png";

interface ChildAuthProps {
  onBack: () => void;
}

export const ChildAuth = ({ onBack }: ChildAuthProps) => {
  const [accessCode, setAccessCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"code" | "register">("code");

  const handleCheckCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use secure RPC function to validate code without exposing parent_user_id
      const { data: isValid, error } = await supabase
        .rpc("validate_access_code", { code: accessCode.toUpperCase() });

      if (error) throw error;

      if (!isValid) {
        toast.error("Неверный код доступа или код уже использован");
        setLoading(false);
        return;
      }

      setStep("register");
      toast.success("Код правильный! Придумай пароль для входа");
    } catch (error: any) {
      console.error("Code check error:", error);
      toast.error("Ошибка проверки кода");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate code is still available before registration
      const { data: isValid, error: validateError } = await supabase
        .rpc("validate_access_code", { code: accessCode.toUpperCase() });

      if (validateError) throw validateError;

      if (!isValid) {
        toast.error("Код не найден или уже использован. Попросите новый у родителя.");
        setLoading(false);
        return;
      }

      // Не читаем профиль родителя из-за правил доступа (RLS).
      // Данные ребёнка создадим пустыми и привяжем к родителю после регистрации.

      // Create child account
      const { data, error } = await supabase.auth.signUp({
        email: `${accessCode.toLowerCase()}@child.app`,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        },
      });

      if (error) throw error;

      if (data.user) {
        // Set child role
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: "child",
        });

        if (roleError) {
          console.error("Error creating child role:", roleError);
          toast.error("Ошибка создания роли");
          return;
        }

        // Use secure RPC function to claim the access code and get parent_user_id
        const { data: parentUserId, error: claimError } = await supabase
          .rpc("claim_access_code", { 
            code: accessCode.toUpperCase(), 
            child_id: data.user.id 
          });

        if (claimError) {
          console.error("Error claiming code:", claimError);
          toast.error("Ошибка привязки кода");
          return;
        }

        if (!parentUserId) {
          toast.error("Код уже использован или не найден");
          return;
        }

        // Upsert child profile with link to parent and default values
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({ 
            id: data.user.id,
            parent_user_id: parentUserId,
            child_name: 'Без имени',
            child_age: null,
            interests: []
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error("Error updating profile:", profileError);
          toast.error("Ошибка обновления профиля");
          return;
        }

        toast.success("Профиль найден. Подключаемся к вашему родителю...");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>

        <div className="text-center mb-6">
          <img
            src={ceolinaCharacter}
            alt="Ceolina"
            className="w-20 h-20 mx-auto mb-4 animate-gentle-float"
          />
          <h2 className="text-2xl font-bold">
            {step === "code" ? "Введи код доступа" : "Придумай пароль"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {step === "code"
              ? "Спроси код у родителя"
              : "Твой профиль уже создан родителем - остался только пароль"}
          </p>
        </div>

        {step === "code" ? (
          <form onSubmit={handleCheckCode} className="space-y-4">
            <div>
              <Label htmlFor="accessCode">Код доступа</Label>
              <Input
                id="accessCode"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                required
                placeholder="ABC123"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
              <p className="text-xs text-muted-foreground mt-1">
                6 символов от родителя
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Проверка...
                </>
              ) : (
                "Проверить код"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
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
              <p className="text-xs text-muted-foreground mt-1">
                Минимум 6 символов
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Подключение...
                </>
              ) : (
                "Подключиться к профилю"
              )}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};
