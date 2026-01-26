import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

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
      const { data: isValid, error: validateError } = await supabase
        .rpc("validate_access_code", { code: accessCode.toUpperCase() });

      if (validateError) throw validateError;

      if (!isValid) {
        toast.error("Код не найден или уже использован. Попросите новый у родителя.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: `${accessCode.toLowerCase()}@child.app`,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        },
      });

      if (error) throw error;

      if (data.user) {
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: "child",
        });

        if (roleError) {
          console.error("Error creating child role:", roleError);
          toast.error("Ошибка создания роли");
          return;
        }

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

  const handleBack = () => {
    if (step === "register") {
      setStep("code");
    } else {
      onBack();
    }
  };

  // Code input screen
  if (step === "code") {
    return (
      <div className="min-h-screen bg-[#E8F4FC] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-500 mb-8 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Назад</span>
          </button>

          {/* Title */}
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">
            Код доступа
          </h1>
          <p className="text-gray-500 mb-8">
            Введите код, полученный от специалиста
          </p>

          {/* Code input */}
          <form onSubmit={handleCheckCode}>
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="w-full text-center text-3xl tracking-[0.5em] font-mono py-4 border-0 focus:outline-none focus:ring-0 placeholder:text-gray-300 placeholder:tracking-[0.3em]"
              />
            </div>

            {/* Continue button */}
            <button
              type="submit"
              disabled={loading || accessCode.length < 6}
              className="w-full py-4 rounded-full bg-[#4A90D9] text-white font-medium hover:bg-[#3A7BC8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Продолжить"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Password screen
  return (
    <div className="min-h-screen bg-[#E8F4FC] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-500 mb-8 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Назад</span>
        </button>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          Придумай пароль
        </h1>
        <p className="text-gray-500 mb-8">
          Минимум 6 символов
        </p>

        {/* Password form */}
        <form onSubmit={handleRegister}>
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
            <label className="block text-sm text-gray-500 mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
              className="w-full py-2 border-0 focus:outline-none focus:ring-0 text-gray-800 text-lg"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || password.length < 6}
            className="w-full py-4 rounded-full bg-[#4A90D9] text-white font-medium hover:bg-[#3A7BC8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Подключиться"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
