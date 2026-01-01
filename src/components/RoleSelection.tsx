import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Building2, Users } from "lucide-react";
import ceolinaCharacter from "@/assets/ceolina-character.png";

interface RoleSelectionProps {
  onSelectRole: (role: "center" | "child") => void;
}

export const RoleSelection = ({ onSelectRole }: RoleSelectionProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <img
            src={ceolinaCharacter}
            alt="Ceolina"
            className="w-32 h-32 mx-auto mb-4 animate-gentle-float"
          />
          <h1 className="text-4xl font-bold mb-2">Добро пожаловать!</h1>
          <p className="text-muted-foreground text-lg">
            Выберите способ входа
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card
            className="p-8 hover:shadow-float transition-all cursor-pointer border-2 hover:border-primary group"
            onClick={() => onSelectRole("center")}
          >
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-warm flex items-center justify-center group-hover:scale-110 transition-transform">
                <Building2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Специалист</h2>
              <p className="text-muted-foreground mb-4">
                Вход по коду центра для работы с детьми
              </p>
              <ul className="text-sm text-left space-y-2 text-muted-foreground">
                <li>✓ Создание профилей детей</li>
                <li>✓ Отслеживание прогресса и состояния</li>
                <li>✓ Анализ рисунков и диагностика</li>
                <li>✓ Арт-терапевтические сессии</li>
                <li>✓ Отчёты и аналитика</li>
              </ul>
            </div>
          </Card>

          <Card
            className="p-8 hover:shadow-float transition-all cursor-pointer border-2 hover:border-primary group"
            onClick={() => onSelectRole("child")}
          >
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-creative flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Ребёнок</h2>
              <p className="text-muted-foreground mb-4">
                У меня есть код от специалиста
              </p>
              <ul className="text-sm text-left space-y-2 text-muted-foreground">
                <li>✓ Арт-терапия и творческие задания</li>
                <li>✓ Увлекательные челленджи</li>
                <li>✓ Совместное рисование с друзьями</li>
                <li>✓ Награды и достижения</li>
                <li>✓ Безопасная игровая среда</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
