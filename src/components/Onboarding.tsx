import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      // Save to backend
      console.log("Onboarding complete - saving data:", formData);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

          const dataToSave = {
            id: user.id,
            child_name: formData.childName,
            child_age: parseInt(formData.childAge) || null,
          };

          let error;
          if (existingProfile) {
            const result = await supabase
              .from("profiles")
              .update({
                child_name: formData.childName,
                child_age: parseInt(formData.childAge) || null,
              })
              .eq("id", user.id);
            error = result.error;
          } else {
            const result = await supabase
              .from("profiles")
              .insert(dataToSave);
            error = result.error;
          }

          if (error) {
            console.error("Error saving profile:", error);
            toast.error(`Ошибка сохранения: ${error.message}`);
            localStorage.setItem('starUserData', JSON.stringify(formData));
          } else {
            toast.success("Данные сохранены!");
            localStorage.setItem('starUserData', JSON.stringify(formData));
          }
        } else {
          localStorage.setItem('starUserData', JSON.stringify(formData));
        }
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

  // Progress dots component
  const ProgressDots = () => (
    <div className="flex justify-center gap-2 mt-6">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === step ? "w-6 bg-[#7CB9E8]" : "w-1.5 bg-gray-300"
          }`}
        />
      ))}
    </div>
  );

  // Step 0: Welcome
  if (step === 0) {
    return (
      <div className="min-h-screen bg-[#E8F4FC] flex flex-col items-center justify-center p-4">
        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm text-center">
          {/* Title */}
          <h1 className="text-xl font-semibold text-gray-800 mb-1">
            Привет!
          </h1>
          <p className="text-[#7CB9E8] text-sm mb-8">
            Давайте начнем
          </p>

          {/* Continue button */}
          <button
            onClick={nextStep}
            className="w-full py-3 rounded-full bg-[#7CB9E8] text-white font-medium hover:bg-[#6BA8D7] transition-colors"
          >
            Продолжить
          </button>

          {/* Progress dots */}
          <ProgressDots />
        </div>
      </div>
    );
  }

  // Step 1: Name and age
  if (step === 1) {
    return (
      <div className="min-h-screen bg-[#E8F4FC] flex flex-col items-center justify-center p-4">
        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm">
          {/* Title */}
          <h1 className="text-xl font-semibold text-gray-800 mb-1 text-center">
            Расскажите о вас
          </h1>
          <p className="text-gray-400 text-sm mb-6 text-center">
            Как обращаться к ребёнку
          </p>

          {/* Form */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Имя</label>
              <div className="border border-gray-200 rounded-lg">
                <input
                  type="text"
                  value={formData.childName}
                  onChange={(e) => updateField("childName", e.target.value)}
                  className="w-full py-3 px-3 border-0 focus:outline-none focus:ring-0 text-gray-800 bg-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Возраст</label>
              <div className="border border-gray-200 rounded-lg">
                <input
                  type="number"
                  value={formData.childAge}
                  onChange={(e) => updateField("childAge", e.target.value)}
                  min={1}
                  max={18}
                  className="w-full py-3 px-3 border-0 focus:outline-none focus:ring-0 text-gray-800 bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Continue button */}
          <button
            onClick={nextStep}
            disabled={!canProceed}
            className="w-full py-3 rounded-full bg-[#7CB9E8] text-white font-medium hover:bg-[#6BA8D7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Продолжить
          </button>

          {/* Progress dots */}
          <ProgressDots />
        </div>
      </div>
    );
  }

  // Step 2: Additional info (optional)
  if (step === 2) {
    return (
      <div className="min-h-screen bg-[#E8F4FC] flex flex-col items-center justify-center p-4">
        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm">
          {/* Title */}
          <h1 className="text-xl font-semibold text-gray-800 mb-1 text-center">
            Подробнее
          </h1>
          <p className="text-gray-400 text-sm mb-6 text-center">
            Поделитесь вашей историей
          </p>

          {/* Form */}
          <div className="mb-2">
            <div className="border border-gray-200 rounded-lg">
              <textarea
                value={formData.goals}
                onChange={(e) => updateField("goals", e.target.value)}
                rows={4}
                className="w-full py-3 px-3 border-0 focus:outline-none focus:ring-0 text-gray-800 resize-none bg-transparent"
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Например: "учимся ждать", "сложности выражать эмоции"
            </p>
          </div>

          {/* Continue button */}
          <button
            onClick={nextStep}
            className="w-full py-3 rounded-full bg-[#7CB9E8] text-white font-medium hover:bg-[#6BA8D7] transition-colors mt-4"
          >
            Продолжить
          </button>

          {/* Progress dots */}
          <ProgressDots />
        </div>
      </div>
    );
  }

  // Step 3: Complete
  return (
    <div className="min-h-screen bg-[#E8F4FC] flex flex-col items-center justify-center p-4">
      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm text-center">
        {/* Title */}
        <h1 className="text-xl font-semibold text-[#7CB9E8] mb-1">
          Отлично!
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Давайте приступим
        </p>

        {/* Start button */}
        <button
          onClick={nextStep}
          className="w-full py-3 rounded-full bg-[#7CB9E8] text-white font-medium hover:bg-[#6BA8D7] transition-colors"
        >
          Продолжить
        </button>

        {/* Progress dots */}
        <ProgressDots />
      </div>
    </div>
  );
};
