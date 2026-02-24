import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import classroomBg from "@/assets/classroom-background.png";

interface OnboardingProps {
  onComplete: (data: OnboardingData) => void;
}

export interface OnboardingData {
  childName: string;
  childAge: string;
  communicationLevel: string;
  emotionalLevel: string;
  goals: string;
}

export const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingData>({
    childName: "",
    childAge: "",
    communicationLevel: "",
    emotionalLevel: "",
    goals: "",
  });

  const updateField = (field: keyof OnboardingData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Save to backend — create child record
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Create a child in the children table
          const { error: childError } = await supabase
            .from("children")
            .insert({
              user_id: user.id,
              name: formData.childName,
              age: parseInt(formData.childAge) || null,
              development_notes: formData.goals || null,
            });

          if (childError) {
            console.error("Error creating child:", childError);
            toast.error("Ошибка сохранения");
          }

          // Also update profile
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

          if (existingProfile) {
            await supabase
              .from("profiles")
              .update({ child_name: formData.childName, child_age: parseInt(formData.childAge) || null })
              .eq("id", user.id);
          } else {
            await supabase
              .from("profiles")
              .insert({ id: user.id, child_name: formData.childName, child_age: parseInt(formData.childAge) || null });
          }
        }

        localStorage.setItem('starUserData', JSON.stringify(formData));
      } catch (error) {
        console.error("Error saving profile:", error);
        localStorage.setItem('starUserData', JSON.stringify(formData));
      }

      onComplete(formData);
    }
  };

  const canProceed =
    step === 0 ||
    step === 3 ||
    (step === 1 && formData.childName && formData.childAge) ||
    step === 2;

  const ProgressDots = () => (
    <div className="flex justify-center gap-2 mt-6">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i === step ? "w-6 bg-foreground" : "w-2 bg-foreground/25"
          }`}
        />
      ))}
    </div>
  );

  const bgStyle = {
    backgroundImage: `url(${classroomBg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  // Step 0: Welcome
  if (step === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={bgStyle}>
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-xl text-center">
          <h1 className="text-2xl font-bold text-foreground mb-1">Привет!</h1>
          <p className="text-muted-foreground text-sm mb-8">Давайте начнем</p>
          <button
            onClick={nextStep}
            className="w-full py-3 rounded-full bg-primary/40 text-primary-foreground font-medium hover:bg-primary/50 transition-colors"
          >
            Продолжить
          </button>
          <ProgressDots />
        </div>
      </div>
    );
  }

  // Step 1: Name and age
  if (step === 1) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={bgStyle}>
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-xl">
          <h1 className="text-xl font-bold text-foreground mb-1 text-center">Расскажите о вас</h1>
          <p className="text-muted-foreground text-sm mb-6 text-center">Как обращаться к ребенку</p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Имя</label>
              <input
                type="text"
                value={formData.childName}
                onChange={(e) => updateField("childName", e.target.value)}
                className="w-full py-3 px-3 rounded-lg bg-muted/50 border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Возраст</label>
              <input
                type="number"
                value={formData.childAge}
                onChange={(e) => updateField("childAge", e.target.value)}
                min={1}
                max={18}
                className="w-full py-3 px-3 rounded-lg bg-muted/50 border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
              />
            </div>
          </div>

          <button
            onClick={nextStep}
            disabled={!canProceed}
            className="w-full py-3 rounded-full bg-primary/40 text-primary-foreground font-medium hover:bg-primary/50 transition-colors disabled:opacity-40"
          >
            Продолжить
          </button>
          <ProgressDots />
        </div>
      </div>
    );
  }

  // Step 2: Goals
  if (step === 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={bgStyle}>
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-xl">
          <h1 className="text-xl font-bold text-foreground mb-1 text-center">Подробнее</h1>
          <p className="text-muted-foreground text-sm mb-6 text-center">Поделитесь вашей историей</p>

          <div className="mb-2">
            <textarea
              value={formData.goals}
              onChange={(e) => updateField("goals", e.target.value)}
              rows={4}
              className="w-full py-3 px-3 rounded-lg bg-muted/50 border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Например: "учится ждать", "спокойно выражать эмоции"
            </p>
          </div>

          <button
            onClick={nextStep}
            className="w-full py-3 rounded-full bg-primary/40 text-primary-foreground font-medium hover:bg-primary/50 transition-colors mt-4"
          >
            Продолжить
          </button>
          <ProgressDots />
        </div>
      </div>
    );
  }

  // Step 3: Complete
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={bgStyle}>
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-xl text-center">
        <h1 className="text-2xl font-bold text-foreground mb-1">Отлично!</h1>
        <p className="text-muted-foreground text-sm mb-8">Давайте приступим</p>
        <button
          onClick={nextStep}
          className="w-full py-3 rounded-full bg-primary/40 text-primary-foreground font-medium hover:bg-primary/50 transition-colors"
        >
          Продолжить
        </button>
        <ProgressDots />
      </div>
    </div>
  );
};
