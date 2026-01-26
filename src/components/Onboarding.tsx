import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ceolinaCharacter from "@/assets/ceolina-character.png";

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

  // Step 0: Welcome
  if (step === 0) {
    return (
      <div className="min-h-screen bg-[#E8F4FC] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          {/* Character */}
          <img
            src={ceolinaCharacter}
            alt="Star"
            className="w-32 h-32 mx-auto mb-8 animate-gentle-float"
          />

          {/* Title */}
          <h1 className="text-3xl font-semibold text-gray-800 mb-2">
            Привет!
          </h1>
          <p className="text-gray-500 mb-12">
            Давайте познакомимся
          </p>

          {/* Continue button */}
          <button
            onClick={nextStep}
            className="w-full py-4 rounded-full bg-[#4A90D9] text-white font-medium hover:bg-[#3A7BC8] transition-colors"
          >
            Продолжить
          </button>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === step ? "w-6 bg-[#4A90D9]" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Name and age
  if (step === 1) {
    return (
      <div className="min-h-screen bg-[#E8F4FC] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Title */}
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">
            Расскажите о вас
          </h1>
          <p className="text-gray-500 mb-8">
            Как можно обращаться к ребенку?
          </p>

          {/* Form */}
          <div className="space-y-4 mb-8">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="block text-sm text-gray-500 mb-1">Имя</label>
              <input
                type="text"
                value={formData.childName}
                onChange={(e) => updateField("childName", e.target.value)}
                placeholder="Введите имя"
                className="w-full py-2 border-0 focus:outline-none focus:ring-0 text-gray-800 text-lg"
              />
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="block text-sm text-gray-500 mb-1">Возраст</label>
              <input
                type="number"
                value={formData.childAge}
                onChange={(e) => updateField("childAge", e.target.value)}
                placeholder="Введите возраст"
                min={1}
                max={18}
                className="w-full py-2 border-0 focus:outline-none focus:ring-0 text-gray-800 text-lg"
              />
            </div>
          </div>

          {/* Continue button */}
          <button
            onClick={nextStep}
            disabled={!canProceed}
            className="w-full py-4 rounded-full bg-[#4A90D9] text-white font-medium hover:bg-[#3A7BC8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Продолжить
          </button>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === step ? "w-6 bg-[#4A90D9]" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Additional info (optional)
  if (step === 2) {
    return (
      <div className="min-h-screen bg-[#E8F4FC] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Title */}
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">
            Подробнее
          </h1>
          <p className="text-gray-500 mb-8">
            Расскажите о ваших целях (необязательно)
          </p>

          {/* Form */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-8">
            <label className="block text-sm text-gray-500 mb-1">Особые заметки</label>
            <textarea
              value={formData.goals}
              onChange={(e) => updateField("goals", e.target.value)}
              placeholder="С какими трудностями сталкивается ребенок?"
              rows={4}
              className="w-full py-2 border-0 focus:outline-none focus:ring-0 text-gray-800 resize-none"
            />
          </div>

          {/* Continue button */}
          <button
            onClick={nextStep}
            className="w-full py-4 rounded-full bg-[#4A90D9] text-white font-medium hover:bg-[#3A7BC8] transition-colors"
          >
            Продолжить
          </button>

          {/* Skip button */}
          <button
            onClick={() => setStep(3)}
            className="w-full py-3 mt-3 text-gray-500 hover:text-gray-700 transition-colors"
          >
            Пропустить
          </button>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === step ? "w-6 bg-[#4A90D9]" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Complete
  return (
    <div className="min-h-screen bg-[#E8F4FC] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Character */}
        <img
          src={ceolinaCharacter}
          alt="Star"
          className="w-32 h-32 mx-auto mb-8 animate-gentle-float"
        />

        {/* Title */}
        <h1 className="text-3xl font-semibold text-gray-800 mb-2">
          Отлично!
        </h1>
        <p className="text-gray-500 mb-12">
          Теперь мы готовы начать наше путешествие
        </p>

        {/* Start button */}
        <button
          onClick={nextStep}
          className="w-full py-4 rounded-full bg-[#4A90D9] text-white font-medium hover:bg-[#3A7BC8] transition-colors"
        >
          Начать
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step ? "w-6 bg-[#4A90D9]" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
