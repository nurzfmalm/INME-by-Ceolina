import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

interface CenterAuthProps {
  onBack: () => void;
}

interface Center {
  id: string;
  name: string;
  description: string | null;
}

export const CenterAuth = ({ onBack }: CenterAuthProps) => {
  const [step, setStep] = useState<"code" | "login" | "register">("code");
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
      setStep("login");
      toast.success(`Центр найден: ${data.name}`);
    } catch (error: any) {
      console.error("Error checking center code:", error);
      toast.error("Ошибка проверки кода");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      toast.success("Вход выполнен!");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!center) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      if (data.user) {
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
          setStep("login");
        }
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.message?.includes("already registered")) {
        toast.error("Пользователь с таким email уже зарегистрирован");
      } else {
        toast.error(error.message || "Ошибка регистрации");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "code") {
      onBack();
    } else if (step === "register") {
      setStep("login");
    } else {
      setStep("code");
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
        <div className="bg-white rounded-2xl p-8 shadow-sm" style={{ width: '878px', height: '1046px' }}>
          {/* Title */}
          <h1 className="text-xl font-semibold text-gray-800 mb-1 text-center">
            Код центра
          </h1>
          <p className="text-gray-400 text-sm mb-6 text-center">
            Введите код, полученный от центра
          </p>

          {/* Code input */}
          <div className="border border-gray-200 rounded-lg mb-6">
            <input
              type="text"
              value={centerCode}
              onChange={(e) => setCenterCode(e.target.value.toUpperCase())}
              placeholder=""
              maxLength={10}
              className="w-full text-center text-lg tracking-widest py-3 border-0 focus:outline-none focus:ring-0 placeholder:text-gray-300 bg-transparent"
            />
          </div>

          {/* Continue button */}
          <button
            onClick={handleCheckCode}
            disabled={loading || !centerCode.trim()}
            className="w-full py-3 rounded-full bg-[#7CB9E8] text-white font-medium hover:bg-[#6BA8D7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Продолжить"
            )}
          </button>
        </div>
      </div>
    );
  }

  // Login screen
  if (step === "login") {
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
            Вход
          </h1>
          <p className="text-gray-400 text-sm mb-6 text-center">
            Войдите в аккаунт
          </p>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Email</label>
              <div className="border border-gray-200 rounded-lg">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full py-3 px-3 border-0 focus:outline-none focus:ring-0 text-gray-800 bg-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Пароль</label>
              <div className="border border-gray-200 rounded-lg">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-[#7CB9E8] text-white font-medium hover:bg-[#6BA8D7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Войти"
              )}
            </button>
          </form>

          {/* Switch to register */}
          <p className="text-center mt-6 text-sm text-gray-400">
            Нет аккаунта?{" "}
            <button
              onClick={() => setStep("register")}
              className="text-[#7CB9E8] hover:underline"
            >
              Зарегистрируйтесь
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Register screen
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
          Регистрация
        </h1>
        <p className="text-gray-400 text-sm mb-6 text-center">
          Создайте аккаунт
        </p>

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Email</label>
            <div className="border border-gray-200 rounded-lg">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full py-3 px-3 border-0 focus:outline-none focus:ring-0 text-gray-800 bg-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Пароль</label>
            <div className="border border-gray-200 rounded-lg">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-[#7CB9E8] text-white font-medium hover:bg-[#6BA8D7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Продолжить"
            )}
          </button>
        </form>

        {/* Switch to login */}
        <p className="text-center mt-6 text-sm text-gray-400">
          Уже есть аккаунт?{" "}
          <button
            onClick={() => setStep("login")}
            className="text-[#7CB9E8] hover:underline"
          >
            Войдите
          </button>
        </p>
      </div>
    </div>
  );
};
