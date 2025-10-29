import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import ceolinaCharacter from "@/assets/ceolina-character.png";
import { ArrowRight } from "lucide-react";

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
      // Save to Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from("profiles")
            .update({
              child_name: formData.childName,
              child_age: parseInt(formData.childAge) || null,
            })
            .eq("id", user.id);

          if (error) {
            console.error("Error saving profile:", error);
            toast.error("Ошибка сохранения данных");
          } else {
            toast.success("Данные сохранены!");
          }
        }
      } catch (error) {
        console.error("Error:", error);
      }

      // Also store in localStorage as backup
      localStorage.setItem('ceolinaUserData', JSON.stringify(formData));
      onComplete(formData);
    }
  };

  const steps = [
    {
      title: "Привет!",
      subtitle: "Давайте начнем!",
      content: (
        <div className="text-center space-y-6">
          <img
            src={ceolinaCharacter}
            alt="Ceolina"
            className="w-40 h-40 mx-auto animate-gentle-float"
          />
          <p className="text-lg text-foreground/80">
            Я Ceolina, и я помогу вашему ребенку познавать мир через творчество и игру
          </p>
        </div>
      ),
    },
    {
      title: "Расскажите о вас",
      subtitle: "Как можно обращаться к ребенку?",
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="childName">Имя ребенка</Label>
            <Input
              id="childName"
              placeholder="Введите имя"
              value={formData.childName}
              onChange={(e) => updateField("childName", e.target.value)}
              className="h-12 rounded-2xl border-2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="childAge">Возраст ребенка</Label>
            <Input
              id="childAge"
              placeholder="Введите возраст"
              value={formData.childAge}
              onChange={(e) => updateField("childAge", e.target.value)}
              className="h-12 rounded-2xl border-2"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Поделитесь",
      subtitle: "своей историей",
      content: (
        <div className="space-y-4">
          <Textarea
            placeholder="С какими трудностями сталкивается ребенок?"
            value={formData.goals}
            onChange={(e) => updateField("goals", e.target.value)}
            className="min-h-32 rounded-2xl border-2 resize-none"
          />
          <p className="text-sm text-muted-foreground">
            Например: "учиться ждать", "выражать эмоции спокойно", "просить о помощи"
          </p>
        </div>
      ),
    },
    {
      title: "Отлично!",
      subtitle: "Давайте начнем!",
      content: (
        <div className="text-center space-y-6">
          <img
            src={ceolinaCharacter}
            alt="Ceolina"
            className="w-40 h-40 mx-auto animate-calm-scale"
          />
          <p className="text-lg text-foreground/80">
            Теперь мы готовы начать наше путешествие в мир творчества и эмоций
          </p>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const canProceed =
    step === 0 ||
    step === 3 ||
    (step === 1 && formData.childName && formData.childAge) ||
    (step === 2 && formData.goals);

  return (
    <div className="min-h-screen bg-gradient-calm flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8 shadow-float border-0">
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              {currentStep.title}
            </h1>
            <p className="text-lg text-muted-foreground">
              {currentStep.subtitle}
            </p>
          </div>

          <div className="min-h-[280px]">{currentStep.content}</div>

          <div className="space-y-4">
            <Button
              onClick={nextStep}
              disabled={!canProceed}
              size="lg"
              variant="therapeutic"
              className="w-full"
            >
              {step === 3 ? "Начать" : "Продолжить"}
              <ArrowRight className="ml-2" />
            </Button>

            <div className="flex justify-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === step
                      ? "w-8 bg-primary"
                      : "w-2 bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
