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
            Код центра
          </h1>
          <p className="text-gray-500 mb-8">
            Введите код, полученный от вашего центра
          </p>

          {/* Code input */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <input
              type="text"
              value={centerCode}
              onChange={(e) => setCenterCode(e.target.value.toUpperCase())}
              placeholder="Введите код"
              maxLength={10}
              className="w-full text-center text-2xl tracking-widest font-mono py-4 border-0 focus:outline-none focus:ring-0 placeholder:text-gray-300"
            />
          </div>

          {/* Continue button */}
          <button
            onClick={handleCheckCode}
            disabled={loading || !centerCode.trim()}
            className="w-full py-4 rounded-full bg-[#4A90D9] text-white font-medium hover:bg-[#3A7BC8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
            Вход
          </h1>
          <p className="text-gray-500 mb-8">
            Войдите в свой аккаунт
          </p>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="block text-sm text-gray-500 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full py-2 border-0 focus:outline-none focus:ring-0 text-gray-800"
              />
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="block text-sm text-gray-500 mb-1">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className="w-full py-2 border-0 focus:outline-none focus:ring-0 text-gray-800"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-full bg-[#4A90D9] text-white font-medium hover:bg-[#3A7BC8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Войти"
              )}
            </button>
          </form>

          {/* Switch to register */}
          <p className="text-center mt-6 text-gray-500">
            Нет аккаунта?{" "}
            <button
              onClick={() => setStep("register")}
              className="text-[#4A90D9] hover:underline"
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
          Регистрация
        </h1>
        <p className="text-gray-500 mb-8">
          Создайте аккаунт специалиста
        </p>

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <label className="block text-sm text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full py-2 border-0 focus:outline-none focus:ring-0 text-gray-800"
            />
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <label className="block text-sm text-gray-500 mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
              className="w-full py-2 border-0 focus:outline-none focus:ring-0 text-gray-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-full bg-[#4A90D9] text-white font-medium hover:bg-[#3A7BC8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Зарегистрироваться"
            )}
          </button>
        </form>

        {/* Switch to login */}
        <p className="text-center mt-6 text-gray-500">
          Уже есть аккаунт?{" "}
          <button
            onClick={() => setStep("login")}
            className="text-[#4A90D9] hover:underline"
          >
            Войдите
          </button>
        </p>
      </div>
    </div>
  );
};
