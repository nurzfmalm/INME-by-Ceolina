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
  const [childName, setChildName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"code" | "register">("code");

  const handleCheckCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if code exists
      const { data: link, error } = await supabase
        .from("parent_child_links")
        .select("*")
        .eq("access_code", accessCode.toUpperCase())
        .maybeSingle();

      if (error) throw error;

      if (!link) {
        toast.error("Неверный код доступа");
        setLoading(false);
        return;
      }

      // Check if already used
      if (link.child_user_id) {
        toast.error("Этот код уже использован");
        setLoading(false);
        return;
      }

      setStep("register");
      toast.success("Код правильный! Теперь создай свой профиль");
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
      // Create child account
      const { data, error } = await supabase.auth.signUp({
        email: `${accessCode.toLowerCase()}@child.app`,
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

        // Update link with child user
        const { data: link, error: linkError } = await supabase
          .from("parent_child_links")
          .select("*")
          .eq("access_code", accessCode.toUpperCase())
          .single();

        if (linkError || !link) {
          console.error("Error fetching link:", linkError);
          toast.error("Ошибка поиска кода доступа");
          return;
        }

        const { error: updateLinkError } = await supabase
          .from("parent_child_links")
          .update({ child_user_id: data.user.id })
          .eq("id", link.id);

        if (updateLinkError) {
          console.error("Error updating link:", updateLinkError);
          toast.error("Ошибка обновления связи");
          return;
        }

        // Update profile with parent link and child name
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ 
            parent_user_id: link.parent_user_id,
            child_name: childName
          })
          .eq("id", data.user.id);

        if (profileError) {
          console.error("Error updating profile:", profileError);
          toast.error("Ошибка обновления профиля");
          return;
        }

        toast.success("Профиль создан! Добро пожаловать!");
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
            {step === "code" ? "Введи код доступа" : "Создай свой профиль"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {step === "code"
              ? "Спроси код у родителя"
              : "Придумай пароль для своего профиля"}
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
              <Label htmlFor="childName">Твоё имя</Label>
              <Input
                id="childName"
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                required
                placeholder="Как тебя зовут?"
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
              <p className="text-xs text-muted-foreground mt-1">
                Минимум 6 символов
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                "Создать профиль"
              )}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};
