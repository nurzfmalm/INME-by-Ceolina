import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ceolinaCharacter from "@/assets/ceolina-character.png";
import { Palette, Brain, Image, BarChart3, Settings, Heart, Target, ShoppingBag, Flower2 } from "lucide-react";
import { OnboardingData } from "./Onboarding";

interface DashboardProps {
  childData: OnboardingData;
  onNavigate: (section: string) => void;
}

export const Dashboard = ({ childData, onNavigate }: DashboardProps) => {
  const menuItems = [
    {
      id: "art-therapy",
      title: "АРТ - Терапия",
      icon: Palette,
      gradient: "bg-gradient-creative",
      description: "Рисуй и выражай свои эмоции",
    },
    {
      id: "scenarios",
      title: "Социальные истории",
      icon: Brain,
      gradient: "bg-gradient-calm",
      description: "Учись через интерактивные сценарии",
    },
    {
      id: "gallery",
      title: "Твоя галерея",
      icon: Image,
      gradient: "bg-gradient-warm",
      description: "Смотри свои творения",
    },
    {
      id: "analytics",
      title: "Аналитика",
      icon: BarChart3,
      gradient: "bg-gradient-calm",
      description: "Отслеживай прогресс",
    },
    {
      id: "tasks",
      title: "Задания",
      icon: Target,
      gradient: "bg-gradient-creative",
      description: "Выполняй задания и получай награды",
    },
    {
      id: "rewards",
      title: "Награды",
      icon: ShoppingBag,
      gradient: "bg-gradient-warm",
      description: "Разблокируй новые возможности",
    },
    {
      id: "garden",
      title: "Сад Эмоций",
      icon: Flower2,
      gradient: "bg-gradient-calm",
      description: "Смотри свой эмоциональный рост",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-soft border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <Heart className="text-primary-foreground" size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Привет,</p>
                <p className="text-lg font-semibold">{childData.childName || "друг"}!</p>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <Settings size={24} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Card */}
        <Card className="p-6 bg-gradient-calm border-0 shadow-float">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <img
              src={ceolinaCharacter}
              alt="Ceolina"
              className="w-32 h-32 animate-gentle-float"
            />
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-primary-foreground mb-2">
                Привет, {childData.childName}!
              </h2>
              <p className="text-primary-foreground/90">
                Сегодня отличный день для творчества и новых открытий. Чем займемся?
              </p>
            </div>
          </div>
        </Card>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.id}
                className="p-6 hover:shadow-float transition-all cursor-pointer border-0 bg-card"
                onClick={() => onNavigate(item.id)}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-2xl ${item.gradient} flex items-center justify-center shadow-soft`}>
                    <Icon className="text-white" size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 border-0 bg-card">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">12</p>
              <p className="text-sm text-muted-foreground">Рисунков создано</p>
            </div>
          </Card>
          <Card className="p-4 border-0 bg-card">
            <div className="text-center">
              <p className="text-3xl font-bold text-success">8</p>
              <p className="text-sm text-muted-foreground">Сценариев пройдено</p>
            </div>
          </Card>
          <Card className="p-4 border-0 bg-card">
            <div className="text-center">
              <p className="text-3xl font-bold text-secondary">5</p>
              <p className="text-sm text-muted-foreground">Дней подряд</p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};
