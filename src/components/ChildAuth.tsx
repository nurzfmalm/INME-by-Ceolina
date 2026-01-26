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
        {/* Back button */}
        <button
          onClick={handleBack}
          className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Назад</span>
        </button>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm">
          {/* Title */}
          <h1 className="text-xl font-semibold text-gray-800 mb-1 text-center">
            Код центра
          </h1>
          <p className="text-gray-400 text-sm mb-6 text-center">
            Введите код, полученный от центра
          </p>

          {/* Code input */}
          <form onSubmit={handleCheckCode}>
            <div className="border border-gray-200 rounded-lg mb-6">
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder=""
                maxLength={6}
                className="w-full text-center text-lg tracking-widest py-3 border-0 focus:outline-none focus:ring-0 placeholder:text-gray-300 bg-transparent"
              />
            </div>

            {/* Continue button */}
            <button
              type="submit"
              disabled={loading || accessCode.length < 6}
              className="w-full py-3 rounded-full bg-[#7CB9E8] text-white font-medium hover:bg-[#6BA8D7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
      {/* Back button */}
      <button
        onClick={handleBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Назад</span>
      </button>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm">
        {/* Title */}
        <h1 className="text-xl font-semibold text-gray-800 mb-1 text-center">
          Придумай пароль
        </h1>
        <p className="text-gray-400 text-sm mb-6 text-center">
          Минимум 6 символов
        </p>

        {/* Password form */}
        <form onSubmit={handleRegister}>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Пароль</label>
            <div className="border border-gray-200 rounded-lg mb-6">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full py-3 px-3 border-0 focus:outline-none focus:ring-0 text-gray-800 bg-transparent"
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || password.length < 6}
            className="w-full py-3 rounded-full bg-[#7CB9E8] text-white font-medium hover:bg-[#6BA8D7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
