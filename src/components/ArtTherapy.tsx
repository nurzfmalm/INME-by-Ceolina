import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Palette, Users } from "lucide-react";
import { SoloDrawing } from "./SoloDrawing";
import { DualDrawing } from "./DualDrawing";
import ceolinaCharacter from "@/assets/ceolina-character.png";

interface ArtTherapyProps {
  onBack: () => void;
  childName: string;
  childId?: string | null;
  taskId?: string | null;
  taskPrompt?: string | null;
}

export const ArtTherapy = ({ onBack, childName, childId, taskId, taskPrompt }: ArtTherapyProps) => {
  const [selectedMode, setSelectedMode] = useState<"select" | "solo" | "dual">("select");

  if (selectedMode === "solo") {
    return (
      <SoloDrawing
        onBack={() => setSelectedMode("select")}
        childName={childName}
        childId={childId}
        taskId={taskId}
        taskPrompt={taskPrompt}
      />
    );
  }

  if (selectedMode === "dual") {
    return (
      <DualDrawing
        onBack={() => setSelectedMode("select")}
        childName={childName}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-soft border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft size={24} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">АРТ - Терапия</h1>
              <p className="text-sm text-muted-foreground">
                Выбери режим рисования
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="p-6 bg-gradient-calm border-0 shadow-float mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <img
              src={ceolinaCharacter}
              alt="Star"
              className="w-24 h-24 animate-gentle-float"
            />
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-bold text-primary-foreground mb-2">
                Привет, {childName}!
              </h2>
              <p className="text-primary-foreground/90">
                Как ты хочешь рисовать сегодня? Один или вместе с другом?
              </p>
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card
            className="p-8 hover:shadow-float transition-all cursor-pointer border-2 border-border hover:border-primary bg-card group"
            onClick={() => setSelectedMode("solo")}
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-creative rounded-2xl flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform">
                <Palette className="text-white" size={40} />
              </div>
              <h3 className="text-2xl font-bold">Рисовать одному</h3>
              <p className="text-muted-foreground">
                Создавай рисунки самостоятельно и выражай свои эмоции
              </p>
              <div className="pt-4 space-y-2 text-sm text-muted-foreground">
                <p>✨ Стандартный холст</p>
                <p>✨ Все кисти и цвета</p>
                <p>✨ Личный анализ рисунка</p>
                <p>✨ Автосохранение</p>
              </div>
            </div>
          </Card>

          <Card
            className="p-8 hover:shadow-float transition-all cursor-pointer border-2 border-border hover:border-primary bg-card group"
            onClick={() => setSelectedMode("dual")}
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-warm rounded-2xl flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform">
                <Users className="text-white" size={40} />
              </div>
              <h3 className="text-2xl font-bold">Рисовать вместе</h3>
              <p className="text-muted-foreground">
                Создавай совместные рисунки с родителями, терапевтом или друзьями
              </p>
              <div className="pt-4 space-y-2 text-sm text-muted-foreground">
                <p>✨ Совместный холст</p>
                <p>✨ Реал-тайм синхронизация</p>
                <p>✨ Кооперативные задачи</p>
                <p>✨ Анализ сотрудничества</p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};
