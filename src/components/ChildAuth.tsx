import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

interface ChildAuthProps {
  onBack: () => void;
}

export const ChildAuth = ({ onBack }: ChildAuthProps) => {
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const code = accessCode.toUpperCase().trim();

    try {
      // 1. Validate the code exists in children table
      const { data: childData, error: validateError } = await supabase
        .rpc("validate_child_access_code", { code });

      if (validateError) throw validateError;

      if (!childData || childData.length === 0) {
        toast.error("Неверный код. Проверь и попробуй ещё раз.");
        setLoading(false);
        return;
      }

      const child = childData[0];
      const email = `child-${code.toLowerCase()}@app.local`;
      const password = code; // Code itself is the password

      // 2. Try to sign in first (returning user)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInData?.user) {
        // Store child info in localStorage for the session
        localStorage.setItem("starUserData", JSON.stringify({
          childName: child.child_name,
          childAge: "",
          communicationLevel: "",
          emotionalLevel: "",
          goals: "",
        }));
        localStorage.setItem("currentChildId", child.child_id);
        
        toast.success(`С возвращением, ${child.child_name}! 🎨`);
        return;
      }

      // 3. If sign-in failed, register new user
      if (signInError?.message?.includes("Invalid login credentials")) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              child_name: child.child_name,
              linked_child_id: child.child_id,
            },
          },
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
          // Create child role
          const { error: roleError } = await supabase.from("user_roles").insert({
            user_id: signUpData.user.id,
            role: "child",
          });

          if (roleError) {
            console.error("Error creating child role:", roleError);
          }

          // Update profile with child info
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              id: signUpData.user.id,
              parent_user_id: child.parent_user_id,
              child_name: child.child_name,
              child_age: null,
              interests: [],
            }, {
              onConflict: "id",
            });

          if (profileError) {
            console.error("Error updating profile:", profileError);
          }

          // Store child info in localStorage
          localStorage.setItem("starUserData", JSON.stringify({
            childName: child.child_name,
            childAge: "",
            communicationLevel: "",
            emotionalLevel: "",
            goals: "",
          }));
          localStorage.setItem("currentChildId", child.child_id);

          toast.success(`Привет, ${child.child_name}! 🎨`);
        }
      } else if (signInError) {
        throw signInError;
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E8F4FC] flex flex-col items-center justify-center p-4 safe-area-inset">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Назад</span>
      </button>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#B5DEF5] flex items-center justify-center">
          <span className="text-4xl">🎨</span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-semibold text-gray-800 mb-1 text-center">
          Привет!
        </h1>
        <p className="text-gray-400 text-sm mb-6 text-center">
          Введи код, который дал тебе терапевт
        </p>

        {/* Code input */}
        <form onSubmit={handleCodeSubmit}>
          <div className="border-2 border-gray-200 rounded-xl mb-6 focus-within:border-[#7CB9E8] transition-colors">
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="КОД"
              maxLength={6}
              className="w-full text-center text-2xl tracking-[0.3em] py-4 border-0 focus:outline-none focus:ring-0 placeholder:text-gray-300 bg-transparent font-mono font-bold"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || accessCode.length < 6}
            className="w-full py-4 rounded-full bg-[#7CB9E8] text-white font-semibold text-lg hover:bg-[#6BA8D7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Подключаюсь...</span>
              </>
            ) : (
              <>
                <span>Начать рисовать!</span>
                <span>🚀</span>
              </>
            )}
          </button>
        </form>

        <p className="text-center text-gray-400 text-xs mt-6">
          Код состоит из 6 букв и цифр
        </p>
      </div>
    </div>
  );
};
